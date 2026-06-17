import { getPool } from "../../db/pool.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { createKieVideoTask, extractVideoResultUrls, getKieVideoTask, mapKieVideoState } from "../../providers/kie/video.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getUserCredits } from "../../shared/userService.js";
import { mapVideoModel, mapVideoTask } from "./video.mapper.js";
import { calculateVideoPoints, validateVideoPayload, videoCountOptions } from "./video.options.js";
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

export async function listTasks({ userId, filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listVideoTaskRows({ userId, filter });
  return rows.map(mapVideoTask);
}

export async function getTask(id, userId) {
  await refreshTask(id);
  const row = await findVideoTaskRow(id, userId);
  return row ? mapVideoTask(row) : null;
}

export async function createTask(payload, userId) {
  let { prompt, model, ratio, duration, mode = "first-frame", count = 1, referenceImageUrl, referenceVideoUrl } = payload;

  // 强制使用 kling_3_std 模型，无论用户选择什么
  const forcedModelKey = "kling_3_std";
  if (model !== forcedModelKey) {
    console.log(`[video] user selected ${model}, forcing to ${forcedModelKey}`);
    model = forcedModelKey;
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  let taskId;
  let costPoints;
  let modelPrice;

  try {
    await connection.beginTransaction();
    modelPrice = await findVideoModelPrice(connection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }
    validateVideoPayload({ prompt, model: modelPrice, ratio, duration, count, referenceImageUrl, referenceVideoUrl });

    costPoints = calculateVideoPoints(modelPrice, duration, count);
    const rmbCost = Number(modelPrice.rmb_per_second || 0) * Number(duration) * Number(count);
    taskId = await createVideoTask(connection, {
      userId,
      modelKey: model,
      prompt: prompt.trim(),
      ratio,
      duration: Number(duration),
      mode,
      count: Number(count),
      costPoints,
      rmbCost,
      referenceImageUrl: referenceImageUrl || null,
      referenceVideoUrl: referenceVideoUrl || null
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
    const provider = await createKieVideoTask({
      model: modelPrice,
      prompt: prompt.trim(),
      ratio,
      duration: Number(duration),
      referenceImageUrl: referenceImageUrl || null,
      referenceVideoUrl: referenceVideoUrl || null
    });
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
  const upload = await uploadFileToKie({
    filePath: file.path,
    fileName: file.filename || file.originalname || "reference-image",
    mimeType: file.mimetype || "application/octet-stream",
    uploadPath: "video-generation"
  });

  return {
    url: upload.url,
    referenceImageUrl: upload.url,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function uploadReferenceVideo({ file }) {
  if (!file) {
    throw createHttpError("file is required", 400);
  }
  const upload = await uploadFileToKie({
    filePath: file.path,
    fileName: file.filename || file.originalname || "reference-video",
    mimeType: file.mimetype || "application/octet-stream",
    uploadPath: "video-generation"
  });

  return {
    url: upload.url,
    referenceVideoUrl: upload.url,
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
    const record = await getKieVideoTask({ taskId: task.provider_task_id, providerType: task.provider_type });
    const mapped = mapKieVideoState(record, task.provider_type);
    if (mapped === "completed") {
      const urls = extractVideoResultUrls(record, task.provider_type);
      await setVideoTaskCompleted(id, urls);
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "视频任务失败");
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
  return deleteVideoTask(id, userId);
}

export async function toggleFavorite(id, userId) {
  await toggleVideoTaskFavorite(id, userId);
  return getTask(id, userId);
}
