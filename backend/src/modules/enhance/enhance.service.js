import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieEnhanceImageTask,
  createKieEnhanceVideoTask,
  extractEnhanceResult,
  getKieEnhanceTask,
  mapKieEnhanceState
} from "../../providers/kie/enhance.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapEnhanceAsset, mapEnhanceTask } from "./enhance.mapper.js";
import {
  createEnhanceAsset,
  createEnhanceTask,
  deleteEnhanceTask,
  findEnhanceAsset,
  findEnhanceTaskRow,
  findEnhanceTaskStatus,
  findRefreshableEnhanceTasks,
  listEnhanceTaskRows,
  lockEnhanceTaskForRefund,
  markEnhanceTaskRefunded,
  setEnhanceAssetProviderUrl,
  setEnhanceTaskCompleted,
  setEnhanceTaskError,
  setEnhanceTaskFailed,
  setEnhanceTaskProcessing,
  setEnhanceTaskProviderTaskId,
  toggleEnhanceTaskFavorite
} from "./enhance.repository.js";

function getModelDefinitions() {
  return [
    {
      value: "kie-enhance-image",
      label: "\u56fe\u7247\u753b\u8d28\u589e\u5f3a",
      kind: "image",
      provider: "kie",
      providerModel: config.kie.enhanceImageModel,
      basePoints: config.kie.enhanceImagePoints,
      upscaleFactor: config.kie.enhanceUpscaleFactor
    },
    {
      value: "kie-enhance-video",
      label: "\u89c6\u9891\u753b\u8d28\u589e\u5f3a",
      kind: "video",
      provider: "kie",
      providerModel: config.kie.enhanceVideoModel,
      basePoints: config.kie.enhanceVideoPoints,
      upscaleFactor: config.kie.enhanceUpscaleFactor
    }
  ];
}

function getModelForKind(kind, modelKey) {
  const models = getModelDefinitions().filter((model) => model.kind === kind);
  const key = String(modelKey || "").trim();
  return models.find((model) => model.value === key) || models[0];
}

function inferKind(file) {
  const mimeType = String(file?.mimetype || "");
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  throw createHttpError("file must be an image or video", 400);
}

function normalizeUpscaleFactor(value, fallback) {
  const factor = String(value || fallback || "2").trim();
  return factor || "2";
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
      imageModel: "kie-enhance-image",
      videoModel: "kie-enhance-video",
      upscaleFactor: config.kie.enhanceUpscaleFactor
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxVideoBytes: 200 * 1024 * 1024,
      recommendedVideoSeconds: 15
    }
  };
}

export async function createAsset({ file }) {
  if (!file) throw createHttpError("file is required", 400);

  const kind = inferKind(file);
  const localUrl = `/media/enhance/${kind === "image" ? "images" : "videos"}/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    assetId = await createEnhanceAsset(connection, {
      userId: user.id,
      kind,
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

  return mapEnhanceAsset(await findEnhanceAsset(assetId, kind));
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listEnhanceTaskRows({ filter });
  return rows.map(mapEnhanceTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findEnhanceTaskRow(id);
  return row ? mapEnhanceTask(row) : null;
}

export async function createTask(payload) {
  const sourceAssetId = String(payload.sourceAssetId || "").trim();
  if (!sourceAssetId) throw createHttpError("sourceAssetId is required", 400);

  const sourceAsset = await findEnhanceAsset(sourceAssetId);
  if (!sourceAsset) throw createHttpError("source asset not found", 400);

  const model = getModelForKind(sourceAsset.kind, payload.model);
  const upscaleFactor = normalizeUpscaleFactor(payload.upscaleFactor, model.upscaleFactor);
  const costPoints = Number(model.basePoints || 0);

  const connection = await getPool().getConnection();
  let userId;
  let taskId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createEnhanceTask(connection, {
      userId,
      sourceAssetId,
      mediaType: sourceAsset.kind,
      modelKey: model.value,
      providerModel: model.providerModel,
      upscaleFactor,
      costPoints
    });
    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "enhance generation debit"
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
  connection.release();

  try {
    const upload = await uploadAssetToKie(sourceAsset, `enhance/${sourceAsset.kind}`);
    const provider = sourceAsset.kind === "image"
      ? await createKieEnhanceImageTask({
        model: model.providerModel,
        sourceUrl: upload.url,
        upscaleFactor
      })
      : await createKieEnhanceVideoTask({
        model: model.providerModel,
        sourceUrl: upload.url,
        upscaleFactor
      });
    await setEnhanceTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create enhance provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `enhance task creation failed: ${error.message}`);
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
  await setEnhanceAssetProviderUrl(asset.id, result.url);
  return result;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableEnhanceTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findEnhanceTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieEnhanceTask({ taskId: task.provider_task_id });
    const mapped = mapKieEnhanceState(record);
    if (mapped === "completed") {
      const result = extractEnhanceResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "KIE enhance result missing URL");
      } else {
        await setEnhanceTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE enhance task failed");
    } else {
      await setEnhanceTaskProcessing(id);
    }
  } catch (error) {
    await setEnhanceTaskError(id, `query KIE enhance status failed: ${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockEnhanceTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setEnhanceTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "enhance generation refund"
      });
      await markEnhanceTaskRefunded(connection, id);
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
  return deleteEnhanceTask(id);
}

export async function toggleFavorite(id) {
  await toggleEnhanceTaskFavorite(id);
  return getTask(id);
}
