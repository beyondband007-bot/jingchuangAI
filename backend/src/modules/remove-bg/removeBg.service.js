import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieRemoveBgTask,
  extractRemoveBgResult,
  getKieRemoveBgTask,
  mapKieRemoveBgState
} from "../../providers/kie/removeBg.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapRemoveBgAsset, mapRemoveBgTask } from "./removeBg.mapper.js";
import {
  createRemoveBgAsset,
  createRemoveBgTask,
  deleteRemoveBgTask,
  findRefreshableRemoveBgTasks,
  findRemoveBgAsset,
  findRemoveBgTaskRow,
  findRemoveBgTaskStatus,
  listRemoveBgTaskRows,
  lockRemoveBgTaskForRefund,
  markRemoveBgTaskRefunded,
  setRemoveBgAssetProviderUrl,
  setRemoveBgTaskCompleted,
  setRemoveBgTaskError,
  setRemoveBgTaskFailed,
  setRemoveBgTaskProcessing,
  setRemoveBgTaskProviderTaskId,
  toggleRemoveBgTaskFavorite
} from "./removeBg.repository.js";

function getModelDefinitions() {
  return [
    {
      value: "kie-remove-bg-image",
      label: "图片去背景",
      kind: "image",
      provider: "kie",
      providerModel: config.kie.removeBgImageModel,
      basePoints: config.kie.removeBgImagePoints
    }
  ];
}

function getModel(modelKey) {
  const models = getModelDefinitions();
  const key = String(modelKey || "").trim();
  return models.find((model) => model.value === key) || models[0];
}

function assertImage(file) {
  const mimeType = String(file?.mimetype || "");
  if (!mimeType.startsWith("image/")) {
    throw createHttpError("file must be an image", 400);
  }
}

export async function getCredits() {
  return getDemoUserCredits();
}

export function getModels() {
  const models = getModelDefinitions();
  return {
    models: models.map((model) => ({
      ...model,
      configured: Boolean(config.kie.apiKey)
    })),
    defaults: {
      imageModel: "kie-remove-bg-image"
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024
    }
  };
}

export async function createAsset({ file }) {
  if (!file) throw createHttpError("file is required", 400);
  assertImage(file);

  const localUrl = `/media/remove-bg/images/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    assetId = await createRemoveBgAsset(connection, {
      userId: user.id,
      localUrl,
      filePath: file.path,
      storedName: file.filename,
      originalName: file.originalname || file.filename,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size || 0
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return mapRemoveBgAsset(await findRemoveBgAsset(assetId));
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listRemoveBgTaskRows({ filter });
  return rows.map(mapRemoveBgTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findRemoveBgTaskRow(id);
  return row ? mapRemoveBgTask(row) : null;
}

export async function createTask(payload) {
  const sourceAssetId = String(payload.sourceAssetId || "").trim();
  if (!sourceAssetId) throw createHttpError("sourceAssetId is required", 400);

  const sourceAsset = await findRemoveBgAsset(sourceAssetId);
  if (!sourceAsset) throw createHttpError("source asset not found", 400);

  const model = getModel(payload.model);
  const costPoints = Number(model.basePoints || 0);

  const connection = await getPool().getConnection();
  let userId;
  let taskId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createRemoveBgTask(connection, {
      userId,
      sourceAssetId,
      modelKey: model.value,
      providerModel: model.providerModel,
      costPoints
    });
    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "remove background generation debit"
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
  connection.release();

  try {
    const upload = await uploadAssetToKie(sourceAsset, "remove-bg/image");
    const provider = await createKieRemoveBgTask({
      model: model.providerModel,
      sourceUrl: upload.url
    });
    await setRemoveBgTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create remove background provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `remove background task creation failed: ${error.message}`);
  }

  return getTask(taskId);
}

async function uploadAssetToKie(asset, uploadPath) {
  if (asset.provider_url) return { url: asset.provider_url };
  const result = await uploadFileToKie({
    filePath: asset.file_path,
    fileName: asset.original_name || path.basename(asset.file_path),
    mimeType: asset.mime_type || "application/octet-stream",
    uploadPath
  });
  await setRemoveBgAssetProviderUrl(asset.id, result.url);
  return result;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableRemoveBgTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findRemoveBgTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieRemoveBgTask({ taskId: task.provider_task_id });
    const mapped = mapKieRemoveBgState(record);
    if (mapped === "completed") {
      const result = extractRemoveBgResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "KIE remove background result missing URL");
      } else {
        await setRemoveBgTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE remove background task failed");
    } else {
      await setRemoveBgTaskProcessing(id);
    }
  } catch (error) {
    await setRemoveBgTaskError(id, `query KIE remove background status failed: ${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockRemoveBgTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setRemoveBgTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "remove background generation refund"
      });
      await markRemoveBgTaskRefunded(connection, id);
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
  return deleteRemoveBgTask(id);
}

export async function toggleFavorite(id) {
  await toggleRemoveBgTaskFavorite(id);
  return getTask(id);
}
