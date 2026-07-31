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
import {
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { getUserCredits } from "../../shared/userService.js";
import { mapVideoModel, mapVideoTask } from "./video.mapper.js";
import { serializeVideoTaskError } from "./video.errors.js";
import {
  resolveArkVideoReference,
  resolveKieVideoReference
} from "./video.references.js";
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
  let taskId;
  let costPoints;
  let modelPrice;
  let rmbCost;
  let arkContent;
  let kieReferences;

  const lookupConnection = await pool.getConnection();
  try {
    modelPrice = await findVideoModelPrice(lookupConnection, model);
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

    costPoints = calculateVideoPoints(modelPrice, duration, count);
    rmbCost = Number(modelPrice.rmb_per_second || 0) * Number(duration) * Number(count);
  } finally {
    lookupConnection.release();
  }

  let referenceIndex = 0;
  if (modelPrice.provider_type === "ark") {
    arkContent = [{ type: "text", text: prompt.trim() }];
    if (firstFrameImageUrl) {
      referenceIndex += 1;
      arkContent.push(buildFirstFrameImage(await resolveArkVideoReference({
        userId,
        url: firstFrameImageUrl,
        kind: "image",
        referenceIndex
      })));
    }
    if (lastFrameImageUrl) {
      referenceIndex += 1;
      arkContent.push(buildLastFrameImage(await resolveArkVideoReference({
        userId,
        url: lastFrameImageUrl,
        kind: "image",
        referenceIndex
      })));
    }
    for (const imageUrl of referenceImageUrls) {
      referenceIndex += 1;
      arkContent.push(buildReferenceImage(await resolveArkVideoReference({
        userId,
        url: imageUrl,
        kind: "image",
        referenceIndex
      })));
    }
    if (referenceVideoUrl) {
      referenceIndex += 1;
      arkContent.push(buildReferenceVideo(await resolveArkVideoReference({
        userId,
        url: referenceVideoUrl,
        kind: "video",
        referenceIndex
      })));
    }
    if (referenceAudioUrl) {
      referenceIndex += 1;
      arkContent.push(buildReferenceAudio(await resolveArkVideoReference({
        userId,
        url: referenceAudioUrl,
        kind: "audio",
        referenceIndex
      })));
    }
  } else {
    const imageUrl = firstFrameImageUrl || referenceImageUrls[0] || referenceImageUrl;
    kieReferences = {};
    if (imageUrl) {
      referenceIndex += 1;
      kieReferences.imageUrl = await resolveKieVideoReference({
        userId,
        url: imageUrl,
        kind: "image",
        referenceIndex
      });
    }
    if (referenceVideoUrl) {
      referenceIndex += 1;
      kieReferences.videoUrl = await resolveKieVideoReference({
        userId,
        url: referenceVideoUrl,
        kind: "video",
        referenceIndex
      });
    }
    if (referenceAudioUrl) {
      referenceIndex += 1;
      kieReferences.audioUrl = await resolveKieVideoReference({
        userId,
        url: referenceAudioUrl,
        kind: "audio",
        referenceIndex
      });
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    taskId = await createVideoTask(connection, {
      userId,
      source,
      modelKey: model,
      prompt: prompt.trim(),
      ratio,
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
    throw error;
  } finally {
    connection.release();
  }

  try {
    let provider;
    if (modelPrice.provider_type === "ark") {
      provider = await createArkVideoGenerationTask({
        model: config.ark.videoModel,
        content: arkContent,
        resolution: "720p",
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
        referenceImageUrl: kieReferences.imageUrl || null,
        referenceVideoUrl: kieReferences.videoUrl || null,
        referenceAudioUrl: kieReferences.audioUrl || null
      });
    }
    await setVideoTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("create video task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, error);
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
      const arkResult = isArkTask
        ? extractArkVideoGenerationResult(record)
        : null;
      const arkError = arkResult?.errorDetail || arkResult?.errorMessage || "";
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

async function refundTask(id, userIdArg, costPointsArg, error) {
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
    const storedError = serializeVideoTaskError(error, {
      refunded: true,
      points: costPoints
    });
    await setVideoTaskFailed(connection, id, storedError);

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
