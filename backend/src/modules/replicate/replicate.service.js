import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import { analyzeImageWithMinimax, analyzeVideoFramesWithMinimax } from "../../providers/minimax/vision.js";
import { extractKeyFrames } from "../../providers/ffmpeg/video.js";
import { createHttpError } from "../../shared/http.js";
import { formatBeijingDateTime } from "../../shared/time.js";
import { BILLING_RULES } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";
import {
  completeReplicateTaskRow,
  createReplicateTaskRow,
  failReplicateTaskRow,
  findReplicateTaskRow,
  listReplicateTaskRows
} from "./replicate.repository.js";

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
    status: row.status || (row.prompt ? "completed" : "processing"),
    error: row.error_message || "",
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function assertImageFile(file) {
  if (!file) throw createHttpError("请上传图片", 400);
  if (file.size > maxImageBytes)
    throw createHttpError("图片文件需小于 20MB", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedImageTypes.has(mimeType) && !allowedImageExts.has(ext)) {
    throw createHttpError("图片文件需为 jpg、png、webp 或 gif 格式", 400);
  }
}

function assertVideoFile(file) {
  if (!file) throw createHttpError("请上传视频", 400);
  if (file.size > maxVideoBytes)
    throw createHttpError("视频文件需小于 100MB", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedVideoTypes.has(mimeType) && !allowedVideoExts.has(ext)) {
    throw createHttpError("视频文件需为 mp4、webm、mov 或 avi 格式", 400);
  }
}

async function extractVideoFrames(videoBuffer, fileName) {
  const framesDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "frames");
  await mkdir(framesDir, { recursive: true });

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tempVideoPath = path.join(framesDir, `${taskId}-input${getExt(fileName)}`);
  const tempFramesDir = path.join(framesDir, taskId);
  await writeFile(tempVideoPath, videoBuffer);

  try {
    const framesBase64 = await extractKeyFrames(tempVideoPath, tempFramesDir, 3);
    return { framesBase64, taskId };
  } catch (error) {
    throw new Error(`视频抽帧失败：${error.message || "无法读取视频帧"}`);
  } finally {
    await rm(tempVideoPath, { force: true }).catch(() => {});
    await rm(tempFramesDir, { recursive: true, force: true }).catch(() => {});
  }
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

export async function getReplicateTask(id, userId) {
  const row = await findReplicateTaskRow({ id, userId });
  return row ? mapReplicateTask(row) : null;
}

function cleanAnalysisError(error) {
  const message = String(error?.message || "分析失败，请稍后重试");
  if (/<html|<\/html>|nginx|Gateway Time-out|Bad Gateway|502|504/i.test(message)) {
    return "视觉分析服务暂时不可用，请稍后重试";
  }
  return message;
}

async function finishReplicateTask(taskId, result) {
  const prompt = String(result.prompt || "").trim();
  const description = String(result.description || "").trim();
  if (!prompt && !description) {
    await failReplicateTaskRow(taskId, "视觉分析未能生成提示词，请稍后重试");
    return;
  }

  await completeReplicateTaskRow({
    id: taskId,
    prompt,
    description,
    style: result.style,
    mood: result.mood,
    tags: result.tags,
    frameCount: result.frameCount,
    model: result.model
  });
}

async function runImageAnalysis(taskId, file, userId, costPoints) {
  try {
    const imageBase64 = Buffer.from(file.buffer).toString("base64");
    const result = await analyzeImageWithMinimax({
      imageBase64,
      mimeType: file.mimetype || "image/jpeg"
    });
    await finishReplicateTask(taskId, result);
  } catch (error) {
    await failReplicateTaskRow(taskId, cleanAnalysisError(error));
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "image replicate failure refund" });
  }
}

async function runVideoAnalysis(taskId, file, userId, costPoints) {
  try {
    const { framesBase64 } = await extractVideoFrames(file.buffer, file.originalname);
    const result = await analyzeVideoFramesWithMinimax({ framesBase64 });
    await finishReplicateTask(taskId, result);
  } catch (error) {
    await failReplicateTaskRow(taskId, cleanAnalysisError(error));
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "video replicate failure refund" });
  }
}

export async function analyzeImage({ file, userId }) {
  assertImageFile(file);

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = BILLING_RULES.replicateImagePoints;
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "image replicate debit" });
  try { await createReplicateTaskRow({
    id: taskId,
    userId,
    source: "image",
    fileName: file.originalname
  }); } catch (error) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "image replicate refund" });
    throw error;
  }

  runImageAnalysis(taskId, file, userId, costPoints).catch((error) => {
    console.error("background image replicate analysis failed:", error);
  });

  return mapReplicateTask({
    id: taskId,
    source: "image",
    file_name: file.originalname,
    status: "processing",
    created_at: new Date()
  });
}

export async function analyzeVideo({ file, userId }) {
  assertVideoFile(file);

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = BILLING_RULES.replicateVideoPoints;
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "video replicate debit" });
  try { await createReplicateTaskRow({
    id: taskId,
    userId,
    source: "video",
    fileName: file.originalname
  }); } catch (error) {
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "video replicate refund" });
    throw error;
  }

  runVideoAnalysis(taskId, file, userId, costPoints).catch((error) => {
    console.error("background video replicate analysis failed:", error);
  });

  return mapReplicateTask({
    id: taskId,
    source: "video",
    file_name: file.originalname,
    status: "processing",
    created_at: new Date()
  });
}
