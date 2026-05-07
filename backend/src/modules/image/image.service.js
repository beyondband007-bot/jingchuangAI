import { getPool } from "../../db/pool.js";
import { extractResultUrls, getKieTask, mapKieState } from "../../providers/kie/client.js";
import { createKieImageTask } from "../../providers/kie/image.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapImageTask } from "./image.mapper.js";
import {
  createImageTask,
  deleteImageTask,
  findEnabledImageModels,
  findImageModelPrice,
  findImageTaskRow,
  findImageTaskStatus,
  findRefreshableImageTasks,
  listImageTaskRows,
  lockImageTaskForRefund,
  markImageTaskRefunded,
  setImageTaskCompleted,
  setImageTaskError,
  setImageTaskFailed,
  setImageTaskProcessing,
  setImageTaskProviderTaskId,
  toggleImageTaskFavorite
} from "./image.repository.js";
import {
  imageCountOptions,
  imageQualityOptions,
  imageRatioOptions,
  qualityMultiplier,
  validateImagePayload
} from "./image.options.js";

export async function getCredits() {
  return getDemoUserCredits();
}

export async function getModels() {
  return {
    models: await findEnabledImageModels(),
    ratios: imageRatioOptions,
    qualities: imageQualityOptions,
    counts: imageCountOptions
  };
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listImageTaskRows({ filter });
  return rows.map(mapImageTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findImageTaskRow(id);
  return row ? mapImageTask(row) : null;
}

export async function createTask(payload) {
  const { prompt, model, ratio, quality, count = 1 } = payload;
  validateImagePayload({ prompt, model, ratio, quality, count });

  const pool = getPool();
  const connection = await pool.getConnection();
  let userId;
  let taskId;
  let costPoints;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;

    const modelPrice = await findImageModelPrice(connection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }

    costPoints = Math.ceil(modelPrice.base_points * qualityMultiplier(quality) * Number(count));
    taskId = await createImageTask(connection, {
      userId,
      modelKey: model,
      prompt: prompt.trim(),
      ratio,
      quality,
      count: Number(count),
      costPoints
    });

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "image generation debit"
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }

  connection.release();

  try {
    const provider = await createKieImageTask({ prompt: prompt.trim(), modelKey: model, ratio, quality });
    await setImageTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("KIE create image task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `KIE 创建任务失败：${error.message}`);
  }

  return getTask(taskId);
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableImageTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findImageTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieTask(task.provider_task_id);
    const mapped = mapKieState(record.data?.state);
    if (mapped === "completed") {
      const urls = extractResultUrls(record);
      await setImageTaskCompleted(id, urls);
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || "KIE task failed");
    } else {
      await setImageTaskProcessing(id);
    }
  } catch (error) {
    await setImageTaskError(id, `查询 KIE 状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockImageTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setImageTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "image generation refund"
      });
      await markImageTaskRefunded(connection, id);
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
  return deleteImageTask(id);
}

export async function toggleFavorite(id) {
  await toggleImageTaskFavorite(id);
  return getTask(id);
}
