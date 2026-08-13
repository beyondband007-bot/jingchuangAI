import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { copyFile, mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { config } from "../../config/index.js";
import { analyzeImageWithMinimax } from "../../providers/minimax/vision.js";
import {
  analyzeVideoForPrompt,
  analyzeVideoFramesForPrompt
} from "../../providers/qwen/videoReverse.js";
import { uploadQwenTemporaryFile } from "../../providers/qwen/temporaryFile.js";
import { extractVideoAnalysisFrames, probeVideo } from "../../providers/ffmpeg/video.js";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
import { createHttpError } from "../../shared/http.js";
import { formatBeijingDateTime } from "../../shared/time.js";
import { BILLING_RULES } from "../../shared/billingRules.js";
import { chargeCredits, refundChargedCredits } from "../../shared/billingCharge.js";
import {
  completeReplicateTaskRow,
  createReplicateTaskRow,
  failInterruptedReplicateTasks,
  failReplicateTaskRow,
  findReplicateTaskRow,
  listReplicateTaskRows,
  updateReplicateTaskProgress
} from "./replicate.repository.js";

const INTERRUPTED_TASK_ERROR =
  "\u4efb\u52a1\u56e0\u670d\u52a1\u91cd\u542f\u6216\u5f02\u5e38\u4e2d\u65ad\uff0c\u8bf7\u91cd\u65b0\u63d0\u4ea4";

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
const replicateSourcesDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "sources");
const replicateThumbnailsDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "thumbnails");
const execFileAsync = promisify(execFile);

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
    sourceUrl: row.source_url || "",
    sourceThumbnailUrl: row.source_thumbnail_url || "",
    prompt: row.prompt || "",
    description: row.description || "",
    style: row.style || "",
    mood: row.mood || "",
    tags: parseJson(row.tags, []),
    model: row.model || "",
    frameCount: row.frame_count || undefined,
    provider: row.provider || "",
    analysisMode: row.analysis_mode || "",
    stage: row.stage || (row.status === "processing" ? "queued" : row.status),
    attemptCount: Number(row.attempt_count || 0),
    providerRequestId: row.provider_request_id || "",
    latencyMs: row.latency_ms == null ? undefined : Number(row.latency_ms),
    inputTokens: row.input_tokens == null ? undefined : Number(row.input_tokens),
    outputTokens: row.output_tokens == null ? undefined : Number(row.output_tokens),
    durationSeconds: row.input_duration_seconds == null ? undefined : Number(row.input_duration_seconds),
    fallbackReason: row.fallback_reason || "",
    qualityWarning: row.quality_warning || "",
    errorCode: row.error_code || "",
    analysis: parseJson(row.analysis_json, null),
    favorite: Boolean(row.favorite),
    status: row.status || (row.prompt ? "completed" : "processing"),
    error: row.error_message || "",
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function sourcePublicUrl(fileName) {
  return `/media/replicate/sources/${fileName}`;
}

async function persistSourceMedia(taskId, file, { fallbackExt = ".bin" } = {}) {
  await mkdir(replicateSourcesDir, { recursive: true });
  const ext = getExt(file.originalname) || fallbackExt;
  const storedName = `${taskId}${ext}`;
  const targetPath = path.join(replicateSourcesDir, storedName);

  if (file.buffer) {
    await writeFile(targetPath, file.buffer);
  } else if (file.path) {
    await copyFile(file.path, targetPath);
  } else {
    throw createHttpError("上传文件无效", 400);
  }

  let sourceThumbnailUrl = "";
  if (allowedImageExts.has(ext) || allowedVideoExts.has(ext)) {
    await mkdir(replicateThumbnailsDir, { recursive: true });
    const thumbnailName = `${taskId}.jpg`;
    const thumbnailPath = path.join(replicateThumbnailsDir, thumbnailName);
    const thumbnailArgs = allowedVideoExts.has(ext)
      ? ["-y", "-skip_frame", "nokey", "-i", targetPath, "-frames:v", "1", "-vf", "scale='min(420,iw)':-2", "-q:v", "2", thumbnailPath]
      : ["-y", "-i", targetPath, "-frames:v", "1", "-vf", "scale='min(420,iw)':-2", "-q:v", "2", thumbnailPath];
    await execFileAsync(ffmpegPath, thumbnailArgs);
    sourceThumbnailUrl = `/media/replicate/thumbnails/${thumbnailName}`;
  }
  return {
    sourceUrl: sourcePublicUrl(storedName),
    sourcePath: targetPath,
    sourceThumbnailUrl
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

export function getConfig() {
  return {
    imageMaxBytes: maxImageBytes,
    videoMaxBytes: maxVideoBytes,
    imageFormats: ["jpg", "jpeg", "png", "webp", "gif"],
    videoFormats: ["mp4", "webm", "mov", "avi"],
    videoFrameCount: config.qwen.videoReverseFallbackFrames,
    videoModel: config.qwen.videoReverseModel
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

export async function recoverInterruptedReplicateTasks() {
  return failInterruptedReplicateTasks(INTERRUPTED_TASK_ERROR);
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
    const error = new Error("视觉分析未能生成提示词，请稍后重试");
    error.code = "OUTPUT_SCHEMA_INVALID";
    throw error;
  }

  await completeReplicateTaskRow({
    id: taskId,
    prompt,
    description,
    style: result.style,
    mood: result.mood,
    tags: result.tags,
    frameCount: result.frameCount,
    model: result.model,
    provider: result.provider,
    analysisMode: result.analysisMode,
    attemptCount: result.attemptCount,
    providerRequestId: result.providerRequestId,
    providerStatusCode: result.providerStatusCode,
    latencyMs: result.latencyMs,
    inputTokens: Number(result.usage?.prompt_tokens || result.usage?.input_tokens || 0),
    outputTokens: Number(result.usage?.completion_tokens || result.usage?.output_tokens || 0),
    fallbackReason: result.fallbackReason,
    qualityWarning: result.qualityWarning,
    analysis: result.analysis
  });
}

async function runImageAnalysis(taskId, file, userId, costPoints) {
  try {
    await updateReplicateTaskProgress(taskId, {
      stage: "analyzing_primary",
      provider: "minimax",
      model: "MiniMax-Text-01",
      analysisMode: "image"
    });
    const imageBase64 = Buffer.from(file.buffer).toString("base64");
    const result = await analyzeImageWithMinimax({
      imageBase64,
      mimeType: file.mimetype || "image/jpeg"
    });
    result.provider = "minimax";
    result.analysisMode = "image";
    await finishReplicateTask(taskId, result);
  } catch (error) {
    await failReplicateTaskRow(taskId, cleanAnalysisError(error), {
      errorCode: error?.code || "PROVIDER_UNAVAILABLE",
      provider: "minimax",
      model: "MiniMax-Text-01",
      analysisMode: "image"
    });
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "image replicate failure refund" });
  }
}

function calculateVideoAnalysisFps(durationSeconds) {
  const maxFrames = Math.max(12, Number(config.qwen.videoReverseMaxFrames) || 120);
  const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
  return Math.max(0.1, Math.min(2, Number((maxFrames / duration).toFixed(3))));
}

function describeFallbackReason(error) {
  const code = String(error?.code || "PRIMARY_ANALYSIS_FAILED");
  const message = cleanAnalysisError(error);
  return `${code}: ${message}`.slice(0, 1000);
}

function needsFallback(result) {
  const shots = result?.analysis?.shots;
  const confidence = result?.analysis?.confidence;
  return !Array.isArray(shots) || shots.length === 0 ||
    (Number.isFinite(Number(confidence)) && Number(confidence) < 0.45);
}

async function runVideoAnalysis(taskId, file, metadata, userId, costPoints) {
  const videoPath = file.path;
  const framesDir = path.resolve(
    process.cwd(),
    config.media.storageDir,
    "replicate",
    "frames",
    taskId
  );
  let primaryResult;
  let primaryError;
  try {
    await updateReplicateTaskProgress(taskId, {
      stage: "preparing_media",
      provider: "qwen",
      model: config.qwen.videoReverseModel,
      analysisMode: "direct_video"
    });
    const uploadedVideo = await uploadQwenTemporaryFile({
      filePath: videoPath,
      originalName: file.originalname,
      mimeType: file.mimetype || "video/mp4",
      model: config.qwen.videoReverseModel
    });
    await updateReplicateTaskProgress(taskId, { stage: "analyzing_primary" });
    primaryResult = await analyzeVideoForPrompt({
      videoUrl: uploadedVideo.url,
      fps: calculateVideoAnalysisFps(metadata.durationSeconds),
      model: config.qwen.videoReverseModel
    });
    if (!needsFallback(primaryResult)) {
      await finishReplicateTask(taskId, primaryResult);
      return;
    }
    primaryError = Object.assign(new Error("原生视频分析结果缺少可靠的分镜或置信度过低"), {
      code: "INSUFFICIENT_VISUAL_EVIDENCE"
    });
  } catch (error) {
    primaryError = error;
  }

  const fallbackReason = describeFallbackReason(primaryError);
  try {
    await updateReplicateTaskProgress(taskId, {
      stage: "analyzing_fallback",
      analysisMode: "scene_frames",
      fallbackReason,
      attemptCount: primaryResult?.attemptCount || primaryError?.attemptCount || 0,
      providerStatusCode: primaryError?.status
    });
    await mkdir(framesDir, { recursive: true });
    const frames = await extractVideoAnalysisFrames(videoPath, framesDir, {
      count: config.qwen.videoReverseFallbackFrames,
      metadata
    });
    const fallbackResult = await analyzeVideoFramesForPrompt({
      frames,
      model: config.qwen.videoReverseModel
    });
    if (primaryResult?.usage) {
      fallbackResult.usage = {
        prompt_tokens:
          Number(primaryResult.usage.prompt_tokens || primaryResult.usage.input_tokens || 0) +
          Number(fallbackResult.usage?.prompt_tokens || fallbackResult.usage?.input_tokens || 0),
        completion_tokens:
          Number(primaryResult.usage.completion_tokens || primaryResult.usage.output_tokens || 0) +
          Number(fallbackResult.usage?.completion_tokens || fallbackResult.usage?.output_tokens || 0)
      };
    }
    fallbackResult.fallbackReason = fallbackReason;
    fallbackResult.attemptCount =
      Number(primaryResult?.attemptCount || primaryError?.attemptCount || 0) +
      Number(fallbackResult.attemptCount || 0);
    await finishReplicateTask(taskId, fallbackResult);
  } catch (fallbackError) {
    if (primaryResult) {
      primaryResult.fallbackReason = fallbackReason;
      primaryResult.qualityWarning =
        `原生视频分析结果质量较低，关键帧增强分析失败：${cleanAnalysisError(fallbackError)}`;
      await finishReplicateTask(taskId, primaryResult);
      return;
    }
    await failReplicateTaskRow(taskId, cleanAnalysisError(fallbackError), {
      errorCode: fallbackError?.code || "PROVIDER_UNAVAILABLE",
      provider: "qwen",
      model: config.qwen.videoReverseModel,
      analysisMode: "scene_frames",
      attemptCount: fallbackError?.attemptCount,
      providerStatusCode: fallbackError?.status,
      fallbackReason
    });
    await refundChargedCredits({
      userId,
      taskId,
      amount: costPoints,
      memo: "video replicate failure refund"
    });
  } finally {
    await rm(framesDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function analyzeImage({ file, userId }) {
  assertImageFile(file);

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = BILLING_RULES.replicateImagePoints;
  await chargeCredits({ userId, taskId, amount: costPoints, memo: "image replicate debit" });

  let sourceUrl = "";
  try {
    const saved = await persistSourceMedia(taskId, file, { fallbackExt: ".jpg" });
    sourceUrl = saved.sourceUrl;
    await createReplicateTaskRow({
      id: taskId,
      userId,
      source: "image",
      fileName: file.originalname,
      sourceUrl,
      sourceThumbnailUrl: saved.sourceThumbnailUrl
    });
  } catch (error) {
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
    source_url: sourceUrl,
    source_thumbnail_url: "",
    status: "processing",
    created_at: new Date()
  });
}

export async function analyzeVideo({ file, userId }) {
  try {
    assertVideoFile(file);
  } catch (error) {
    if (file?.path) await rm(file.path, { force: true }).catch(() => {});
    throw error;
  }

  let metadata;
  try {
    metadata = await probeVideo(file.path);
  } catch (error) {
    await rm(file.path, { force: true }).catch(() => {});
    throw createHttpError(`视频文件无法读取：${error.message}`, 400);
  }

  const taskId = `replicate-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const costPoints = BILLING_RULES.replicateVideoPoints;
  try {
    await chargeCredits({ userId, taskId, amount: costPoints, memo: "video replicate debit" });
  } catch (error) {
    await rm(file.path, { force: true }).catch(() => {});
    throw error;
  }

  let sourceUrl = "";
  let sourceThumbnailUrl = "";
  let sourcePath = file.path;
  try {
    ({ sourceUrl, sourcePath, sourceThumbnailUrl } = await persistSourceMedia(taskId, file, { fallbackExt: ".mp4" }));
    await createReplicateTaskRow({
      id: taskId,
      userId,
      source: "video",
      fileName: file.originalname,
      sourceUrl,
      sourceThumbnailUrl,
      stage: "queued",
      inputDurationSeconds: metadata.durationSeconds,
      inputSizeBytes: file.size
    });
  } catch (error) {
    await rm(file.path, { force: true }).catch(() => {});
    await rm(sourcePath, { force: true }).catch(() => {});
    await refundChargedCredits({ userId, taskId, amount: costPoints, memo: "video replicate refund" });
    throw error;
  }

  // Prefer the durable source copy for analysis; drop the multer temp upload.
  if (sourcePath !== file.path) {
    await rm(file.path, { force: true }).catch(() => {});
  }

  runVideoAnalysis(
    taskId,
    { ...file, path: sourcePath },
    metadata,
    userId,
    costPoints
  ).catch((error) => {
    console.error("background video replicate analysis failed:", error);
  });

  return mapReplicateTask({
    id: taskId,
    source: "video",
    file_name: file.originalname,
    source_url: sourceUrl,
    source_thumbnail_url: sourceThumbnailUrl,
    status: "processing",
    stage: "queued",
    input_duration_seconds: metadata.durationSeconds,
    input_size_bytes: file.size,
    created_at: new Date()
  });
}
