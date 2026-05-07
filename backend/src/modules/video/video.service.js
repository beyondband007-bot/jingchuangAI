import { getPool } from "../../db/pool.js";
import { createKieVideoTask, extractVideoResultUrls, getKieVideoTask, mapKieVideoState } from "../../providers/kie/video.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
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

export async function getCredits() {
  return getDemoUserCredits();
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

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listVideoTaskRows({ filter });
  return rows.map(mapVideoTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findVideoTaskRow(id);
  return row ? mapVideoTask(row) : null;
}

export async function createTask(payload) {
  const { prompt, model, ratio, duration, mode = "first-frame", count = 1 } = payload;

  const pool = getPool();
  const connection = await pool.getConnection();
  let userId;
  let taskId;
  let costPoints;
  let modelPrice;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;

    modelPrice = await findVideoModelPrice(connection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }
    validateVideoPayload({ prompt, model: modelPrice, ratio, duration, count });

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
      rmbCost
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
      duration: Number(duration)
    });
    await setVideoTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("KIE create video task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `KIE 创建视频任务失败：${error.message}`);
  }

  return getTask(taskId);
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
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE video task failed");
    } else {
      await setVideoTaskProcessing(id);
    }
  } catch (error) {
    await setVideoTaskError(id, `查询 KIE 视频状态失败：${error.message}`);
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

export async function deleteTask(id) {
  return deleteVideoTask(id);
}

export async function toggleFavorite(id) {
  await toggleVideoTaskFavorite(id);
  return getTask(id);
}
