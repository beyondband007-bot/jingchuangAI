import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  buildFirstFrameImage,
  buildLastFrameImage,
  buildReferenceImage,
  buildReferenceAudio,
  buildReferenceVideo,
  createArkVideoGenerationTask,
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../../providers/volcengine/videoGeneration.js";
import {
  createKieVideoTask,
  extractVideoResultUrls,
  getKieVideoTask,
  mapKieVideoState
} from "../../providers/kie/video.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { buildPublicMediaUrl } from "../../shared/publicMedia.js";
import {
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { getUserCredits } from "../../shared/userService.js";
import { createVirtualAssetFromLocalFile, waitForVirtualAssetReference } from "../digital-human/arkVirtualAssets.service.js";
import { mapVideoModel, mapVideoTask } from "./video.mapper.js";
import {
  calculateVideoPoints,
  normalizeVideoImageInputs,
  validateVideoPayload,
  videoCountOptions
} from "./video.options.js";
import {
  createVideoTask,
  deleteVideoTask,
  findEnabledVideoModels,
  findVideoModelPrice,
  findRefreshableVideoTasks,
  findVideoTaskRow,
  findVideoTaskStatus,
  listVideoTaskRows,
  lockVideoTaskForRefund,
  markVideoTaskRefunded,
  setVideoTaskCompleted,
  setVideoTaskError,
  setVideoTaskFailed,
  setVideoTaskProcessing,
  setVideoTaskProviderTaskId,
  toggleVideoTaskFavorite
} from "./video.repository.js";

function inferVideoResolution(model = {}) {
  const description = [
    model.display_name,
    model.model_key,
    model.provider_model,
    model.mode
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
  const match = description.match(/\b(\d{3,4}\s*p|\d+\s*k)\b/i);
  if (match) return match[1].replace(/\s+/g, "").toUpperCase();

  if (
    model.provider_type === "ark" ||
    String(model.provider_model || "").includes("seedance-2-mini") ||
    String(model.provider_model || "").includes("wan/2-7")
  ) {
    return "720P";
  }

  return null;
}

export async function getCredits(userId) {
  return getUserCredits(userId);
}

export async function getModels() {
  const models = await findEnabledVideoModels();
  const mappedModels = models.map(mapVideoModel);
  const ratios = [...new Set(mappedModels.flatMap((model) => model.ratios))];
  const durations = [...new Set(mappedModels.flatMap((model) => model.durations))].sort((a, b) => a - b);

  return {
    models: mappedModels,
    ratios,
    durations,
    counts: videoCountOptions,
    modes: [{ value: "first-frame", label: "首帧模式" }]
  };
}

export async function listTasks({ userId, filter = "all", source } = {}) {
  await refreshProcessingTasks();
  const rows = await listVideoTaskRows({ userId, filter, source });
  return rows.map(mapVideoTask);
}

export async function getTask(id, userId) {
  await refreshTask(id);
  const row = await findVideoTaskRow(id, userId);
  return row ? mapVideoTask(row) : null;
}

export async function createTask(payload, userId) {
  let {
    prompt,
    model,
    ratio,
    duration,
    mode = "first-frame",
    count = 1,
    referenceImageUrl,
    firstFrameImageUrl,
    lastFrameImageUrl,
    referenceImageUrls,
    referenceVideoUrl,
    referenceAudioUrl,
    source
  } = payload;

  const pool = getPool();
  const connection = await pool.getConnection();
  let taskId;
  let costPoints;
  let modelPrice;
  let resolution;

  try {
    await connection.beginTransaction();
    modelPrice = await findVideoModelPrice(connection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }
    validateVideoPayload({
      prompt,
      model: modelPrice,
      ratio,
      duration,
      count,
      mode,
      referenceImageUrl,
      firstFrameImageUrl,
      lastFrameImageUrl,
      referenceImageUrls,
      referenceVideoUrl,
      referenceAudioUrl
    });
    const imageInputs = normalizeVideoImageInputs({
      mode,
      referenceImageUrl,
      firstFrameImageUrl,
      lastFrameImageUrl,
      referenceImageUrls
    });
    firstFrameImageUrl = imageInputs.firstFrameImageUrl;
    lastFrameImageUrl = imageInputs.lastFrameImageUrl;
    referenceImageUrls = imageInputs.referenceImageUrls;
    if (
      modelPrice.provider_type !== "ark"
      && (lastFrameImageUrl || referenceImageUrls.length > 1)
    ) {
      throw createHttpError("selected video provider does not support these image roles", 400);
    }

    resolution = inferVideoResolution(modelPrice);
    costPoints = calculateVideoPoints(modelPrice, duration, count);
    const rmbCost = Number(modelPrice.rmb_per_second || 0) * Number(duration) * Number(count);
    taskId = await createVideoTask(connection, {
      userId,
      source,
      modelKey: model,
      prompt: prompt.trim(),
      ratio,
      resolution,
      duration: Number(duration),
      mode,
      count: Number(count),
      costPoints,
      rmbCost,
      referenceImageUrl: referenceImageUrl || firstFrameImageUrl || referenceImageUrls[0] || null,
      firstFrameImageUrl,
      lastFrameImageUrl,
      referenceImageUrls,
      referenceVideoUrl: referenceVideoUrl || null,
      referenceAudioUrl: referenceAudioUrl || null
    });

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "video generation debit"
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }

  connection.release();

  try {
    let provider;
    if (modelPrice.provider_type === "ark") {
      const content = [{ type: "text", text: prompt.trim() }];
      if (firstFrameImageUrl) {
        content.push(buildFirstFrameImage(await resolveArkReference({
          userId,
          url: firstFrameImageUrl,
          kind: "image"
        })));
      }
      if (lastFrameImageUrl) {
        content.push(buildLastFrameImage(await resolveArkReference({
          userId,
          url: lastFrameImageUrl,
          kind: "image"
        })));
      }
      for (const imageUrl of referenceImageUrls) {
        content.push(buildReferenceImage(await resolveArkReference({
          userId,
          url: imageUrl,
          kind: "image"
        })));
      }
      if (referenceVideoUrl) {
        content.push(buildReferenceVideo(await resolveArkReference({
          userId,
          url: referenceVideoUrl,
          kind: "video"
        })));
      }
      if (referenceAudioUrl) {
        content.push(buildReferenceAudio(await resolveArkReference({
          userId,
          url: referenceAudioUrl,
          kind: "audio"
        })));
      }

      provider = await createArkVideoGenerationTask({
        model: config.ark.videoModel,
        content,
        resolution: (resolution || "720P").toLowerCase(),
        ratio,
        duration: Number(duration),
        generateAudio: true,
        watermark: false
      });
    } else {
      provider = await createKieVideoTask({
        model: modelPrice,
        prompt: prompt.trim(),
        ratio,
        duration: Number(duration),
        referenceImageUrl: resolveKieReference(firstFrameImageUrl || referenceImageUrls[0] || referenceImageUrl),
        referenceVideoUrl: resolveKieReference(referenceVideoUrl),
        referenceAudioUrl: resolveKieReference(referenceAudioUrl)
      });
    }
    await setVideoTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("create video task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `创建视频任务失败：${error.message}`);
  }

  return getTask(taskId, userId);
}

export async function uploadReferenceImage({ file }) {
  if (!file) {
    throw createHttpError("file is required", 400);
  }
  const localUrl = `/media/video/references/${file.filename}`;

  return {
    url: localUrl,
    referenceImageUrl: localUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function uploadReferenceVideo({ file }) {
  if (!file) {
    throw createHttpError("file is required", 400);
  }
  const localUrl = `/media/video/references/${file.filename}`;

  return {
    url: localUrl,
    referenceVideoUrl: localUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function uploadReferenceAudio({ file }) {
  if (!file) {
    throw createHttpError("file is required", 400);
  }
  const localUrl = `/media/video/references/${file.filename}`;

  return {
    url: localUrl,
    referenceAudioUrl: localUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

function getReferenceFilePath(url) {
  const prefix = "/media/video/references/";
  const value = String(url || "").trim();
  if (!value.startsWith(prefix)) return "";
  const fileName = path.basename(value.slice(prefix.length));
  return path.resolve(process.cwd(), config.media.storageDir, "video", "references", fileName);
}

function getReferenceMimeType(kind, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (kind === "image") {
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  }
  if (kind === "audio") {
    if (extension === ".wav") return "audio/wav";
    if (extension === ".m4a") return "audio/mp4";
    if (extension === ".aac") return "audio/aac";
    if (extension === ".ogg") return "audio/ogg";
    if (extension === ".webm") return "audio/webm";
    if (extension === ".flac") return "audio/flac";
    return "audio/mpeg";
  }
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".avi") return "video/x-msvideo";
  return "video/mp4";
}

async function resolveArkReference({ userId, url, kind }) {
  if (/^asset:\/\//i.test(url)) return url;
  const filePath = getReferenceFilePath(url);
  if (!filePath) return url;

  const asset = await createVirtualAssetFromLocalFile({
    userId,
    feature: `video-generation-${kind}`,
    localUrl: url,
    filePath,
    originalName: path.basename(filePath),
    mimeType: getReferenceMimeType(kind, filePath),
    sizeBytes: 0
  });
  return waitForVirtualAssetReference(asset.id);
}

function resolveKieReference(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/media\//i.test(value)) return buildPublicMediaUrl(value);
  throw createHttpError("Kie video references must use an HTTP URL or uploaded media URL", 400);
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableVideoTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findVideoTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const isArkTask = task.provider_type === "ark";
    const record = isArkTask
      ? await getArkVideoGenerationTask({ taskId: task.provider_task_id })
      : await getKieVideoTask({
          taskId: task.provider_task_id,
          providerType: task.provider_type
        });
    const mapped = isArkTask
      ? mapArkVideoGenerationState(record)
      : mapKieVideoState(record, task.provider_type);
    if (mapped === "completed") {
      const providerUrls = isArkTask
        ? [extractArkVideoGenerationResult(record).resultUrl].filter(Boolean)
        : extractVideoResultUrls(record, task.provider_type);
      if (!providerUrls.length) {
        await refundTask(id, null, null, "video generation result missing video URL");
      } else {
        const localUrls = await persistGeneratedVideos({ taskId: id, urls: providerUrls });
        await setVideoTaskCompleted(id, localUrls, { providerUrls });
      }
    } else if (mapped === "failed") {
      const arkError = isArkTask
        ? extractArkVideoGenerationResult(record).errorMessage
        : "";
      if (arkError) {
        await refundTask(id, null, null, arkError);
        return;
      }
      await refundTask(
        id,
        null,
        null,
        record.data?.failMsg ||
          record.data?.errorMessage ||
          record.data?.error ||
          record.msg ||
          "视频任务失败"
      );
    } else {
      await setVideoTaskProcessing(id);
    }
  } catch (error) {
    await setVideoTaskError(id, `查询视频状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockVideoTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setVideoTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "video generation refund"
      });
      await markVideoTaskRefunded(connection, id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTask(id, userId) {
  const result = await deleteVideoTask(id, userId);
  if (result.ok) {
    await removeStoredGeneratedVideos({ taskId: id }).catch((error) => {
      console.warn(`delete local video result files for task ${id} failed:`, error.message);
    });
  }
  return result;
}

export async function toggleFavorite(id, userId) {
  await toggleVideoTaskFavorite(id, userId);
  return getTask(id, userId);
}
