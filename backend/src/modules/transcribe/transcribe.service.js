import { randomUUID } from "crypto";
import { transcribeMinimaxAudio } from "../../providers/minimax/transcribe.js";
import { createHttpError } from "../../shared/http.js";
import { createTranscribeTaskRow, listTranscribeTaskRows } from "./transcribe.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";

const maxAudioBytes = 50 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mp4a-latm",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
  "video/webm"
]);
const allowedExtensions = new Set([
  ".mp3",
  ".m4a",
  ".wav",
  ".flac",
  ".webm"
]);

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

function mapTranscribeTask(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type || "",
    size: Number(row.size_bytes || 0),
    durationMs: row.duration_ms || 0,
    text: row.text,
    formattedText: row.formatted_text || "",
    segments: parseJson(row.segments, []),
    traceId: row.trace_id || "",
    favorite: Boolean(row.favorite),
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function assertAudioFile(file) {
  if (!file) throw createHttpError("请上传音频文件", 400);
  if (file.size > maxAudioBytes)
    throw createHttpError("音频文件需小于 50MB", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedMimeTypes.has(mimeType) && !allowedExtensions.has(ext)) {
    throw createHttpError(
      "音频文件需为 mp3、m4a、wav、flac 或 webm 格式",
      400
    );
  }
}

function normalizeDurationMs(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function assertDuration(durationMs) {
  const duration = normalizeDurationMs(durationMs);
  if (!duration) return;
  if (duration < 6000 || duration > 6 * 60 * 1000) {
    throw createHttpError(
      "音频时长需在 6 秒到 6 分钟之间",
      400
    );
  }
}

export function getConfig() {
  return {
    maxBytes: maxAudioBytes,
    formats: ["mp3", "m4a", "wav", "flac", "webm"],
    minDurationMs: 6000,
    maxDurationMs: 6 * 60 * 1000
  };
}

export async function getRecentTranscriptions(userId) {
  const rows = await listTranscribeTaskRows({ userId });
  return rows.map(mapTranscribeTask);
}

export async function transcribeAudio({ file, durationMs, userId }) {
  assertAudioFile(file);
  assertDuration(durationMs);

  const result = await transcribeMinimaxAudio({ audioBuffer: file.buffer });

  const transcription = {
    id: `transcribe-${Date.now()}-${randomUUID().slice(0, 8)}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    durationMs: result.durationMs || normalizeDurationMs(durationMs),
    text: result.text,
    formattedText: result.formattedText,
    segments: result.segments,
    traceId: result.traceId,
    createdAt: formatBeijingDateTime()
  };

  await createTranscribeTaskRow({
    ...transcription,
    userId
  });

  return transcription;
}
