import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { config } from "../../config/index.js";
import { analyzeImageWithMinimax, analyzeVideoFramesWithMinimax } from "../../providers/minimax/vision.js";
import { createHttpError } from "../../shared/http.js";
import { createReplicateTaskRow, listReplicateTaskRows } from "./replicate.repository.js";

const maxImageBytes = 20 * 1024 * 1024;
const maxVideoBytes = 100 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
]);
const allowedImageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const allowedVideoTypes = new Set([
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
]);
const allowedVideoExts = new Set([".mp4", ".webm", ".mov", ".avi"]);

function getExt(fileName = "") {
  const match = String(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapReplicateTask(row) {
  return {
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    prompt: row.prompt || "",
    description: row.description || "",
    style: row.style || "",
    mood: row.mood || "",
    tags: parseJson(row.tags, []),
    model: row.model || "",
    frameCount: row.frame_count || undefined,
    favorite: Boolean(row.favorite),
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function assertImageFile(file) {
  if (!file) throw createHttpError("image file is required", 400);
  if (file.size > maxImageBytes)
    throw createHttpError("image file must be 20MB or smaller", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedImageTypes.has(mimeType) && !allowedImageExts.has(ext)) {
    throw createHttpError("image file must be jpg, png, webp, or gif", 400);
  }
}

function assertVideoFile(file) {
  if (!file) throw createHttpError("video file is required", 400);
  if (file.size > maxVideoBytes)
    throw createHttpError("video file must be 100MB or smaller", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedVideoTypes.has(mimeType) && !allowedVideoExts.has(ext)) {
    throw createHttpError("video file must be mp4, webm, mov, or avi", 400);
  }
}

async function extractVideoFrames(videoBuffer, fileName) {
  const framesDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "frames");
  await mkdir(framesDir, { recursive: true });

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tempVideoPath = path.join(framesDir, `${taskId}-input${getExt(fileName)}`);
  await writeFile(tempVideoPath, videoBuffer);

  return new Promise((resolve, reject) => {
    const pythonScript = `
import sys
import cv2
import os
import base64
import { formatBeijingDateTime } from "../../shared/time.js";

video_path = sys.argv[1]
output_dir = sys.argv[2]
task_id = sys.argv[3]

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("ERROR: Cannot open video", flush=True)
    sys.exit(1)

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
if total_frames <= 0:
    print("ERROR: No frames in video", flush=True)
    sys.exit(1)

# Extract 3 frames: 25%, 50%, 75%
frame_positions = [
    max(0, int(total_frames * 0.25) - 1),
    max(0, int(total_frames * 0.5) - 1),
    max(0, int(total_frames * 0.75) - 1)
]

base64_frames = []
for i, pos in enumerate(frame_positions):
    cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
    ret, frame = cap.read()
    if ret:
        # Resize to reduce size for API
        h, w = frame.shape[:2]
        max_dim = 1024
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        # Encode as JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        b64 = base64.b64encode(buffer).decode('utf-8')
        base64_frames.append(b64)
        frame_path = os.path.join(output_dir, f"{task_id}-frame-{i}.jpg")
        cv2.imwrite(frame_path, frame)

cap.release()
os.remove(video_path)

# Output base64 frames separated by marker
print("---FRAMES_START---", flush=True)
for b64 in base64_frames:
    print(b64, flush=True)
print("---FRAMES_END---", flush=True)
`;

    const scriptPath = path.join(framesDir, `${taskId}_extract.py`);
    writeFile(scriptPath, pythonScript)
      .then(() => {
        const python = spawn("python", [scriptPath, tempVideoPath, framesDir, taskId]);
        let stdout = "";
        let stderr = "";

        python.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        python.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        python.on("close", (code) => {
          unlink(scriptPath).catch(() => {});
          unlink(tempVideoPath).catch(() => {});

          if (code !== 0) {
            reject(new Error(`Frame extraction failed: ${stderr || "unknown error"}`));
            return;
          }

          const startMarker = "---FRAMES_START---";
          const endMarker = "---FRAMES_END---";
          const startIndex = stdout.indexOf(startMarker);
          const endIndex = stdout.indexOf(endMarker);

          if (startIndex === -1 || endIndex === -1) {
            reject(new Error("Frame extraction output format invalid"));
            return;
          }

          const framesBase64 = stdout
            .slice(startIndex + startMarker.length, endIndex)
            .trim()
            .split("\n")
            .filter(Boolean);

          if (!framesBase64.length) {
            reject(new Error("No frames extracted from video"));
            return;
          }

          resolve({ framesBase64, taskId });
        });
      })
      .catch(reject);
  });
}

export function getConfig() {
  return {
    imageMaxBytes: maxImageBytes,
    videoMaxBytes: maxVideoBytes,
    imageFormats: ["jpg", "jpeg", "png", "webp", "gif"],
    videoFormats: ["mp4", "webm", "mov", "avi"],
    videoFrameCount: 3
  };
}

export async function getRecentReplicates(userId) {
  const rows = await listReplicateTaskRows({ userId });
  return rows.map(mapReplicateTask);
}

export async function analyzeImage({ file, userId }) {
  assertImageFile(file);

  const imageBase64 = Buffer.from(file.buffer).toString("base64");
  const result = await analyzeImageWithMinimax({
    imageBase64,
    mimeType: file.mimetype || "image/jpeg"
  });

  const replicate = {
    id: `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`,
    source: "image",
    fileName: file.originalname,
    prompt: result.prompt,
    description: result.description,
    style: result.style,
    mood: result.mood,
    tags: result.tags,
    model: result.model,
    createdAt: formatBeijingDateTime()
  };

  await createReplicateTaskRow({ ...replicate, userId });

  return replicate;
}

export async function analyzeVideo({ file, userId }) {
  assertVideoFile(file);

  const { framesBase64 } = await extractVideoFrames(file.buffer, file.originalname);
  const result = await analyzeVideoFramesWithMinimax({ framesBase64 });

  const replicate = {
    id: `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`,
    source: "video",
    fileName: file.originalname,
    prompt: result.prompt,
    description: result.description,
    style: result.style,
    mood: result.mood,
    tags: result.tags,
    frameCount: result.frameCount,
    model: result.model,
    createdAt: formatBeijingDateTime()
  };

  await createReplicateTaskRow({ ...replicate, userId });

  return replicate;
}
