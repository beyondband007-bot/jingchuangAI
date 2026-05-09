import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieMotionTransferTask,
  extractMotionTransferResult,
  getKieMotionTransferTask,
  mapKieMotionTransferState
} from "../../providers/kie/motionTransfer.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapMotionTransferAsset, mapMotionTransferTask } from "./motionTransfer.mapper.js";
import {
  createMotionTransferAsset,
  createMotionTransferTask,
  deleteMotionTransferTask,
  findMotionTransferAsset,
  findMotionTransferTaskRow,
  findMotionTransferTaskStatus,
  findRefreshableMotionTransferTasks,
  listMotionTransferTaskRows,
  lockMotionTransferTaskForRefund,
  markMotionTransferTaskRefunded,
  setMotionTransferAssetProviderUrl,
  setMotionTransferTaskCompleted,
  setMotionTransferTaskError,
  setMotionTransferTaskFailed,
  setMotionTransferTaskProcessing,
  setMotionTransferTaskProviderTaskId,
  toggleMotionTransferTaskFavorite
} from "./motionTransfer.repository.js";

const defaultPrompt = "让静态人物跟随参考视频完成同款动作，保持人物身份、服饰和画面主体稳定，动作自然流畅。";

function getModelDefinitions() {
  return [
    {
      value: "kie-motion-transfer",
      label: "KIE 动作迁移",
      provider: "kie",
      providerModel: config.kie.motionTransferModel,
      basePoints: config.kie.motionTransferPoints,
      resolution: config.kie.motionTransferResolution,
      duration: config.kie.motionTransferDuration
    }
  ];
}

function getModelByKey(modelKey) {
  const key = String(modelKey || "").trim();
  return getModelDefinitions().find((model) => model.value === key) || getModelDefinitions()[0];
}

function normalizeDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return config.kie.motionTransferDuration;
  return Math.max(2, Math.min(15, Math.round(number)));
}

function normalizeResolution(value) {
  const resolution = String(value || "").trim();
  return resolution || config.kie.motionTransferResolution;
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
      model: models[0].value,
      resolution: models[0].resolution,
      duration: models[0].duration
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxVideoBytes: 200 * 1024 * 1024,
      recommendedVideoSeconds: 15
    }
  };
}

export async function createAsset({ kind, file }) {
  if (!file) throw createHttpError(`${kind} file is required`, 400);

  const localUrl = `/media/motion-transfer/${kind === "image" ? "images" : "videos"}/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    assetId = await createMotionTransferAsset(connection, {
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

  return mapMotionTransferAsset(await findMotionTransferAsset(assetId, kind));
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listMotionTransferTaskRows({ filter });
  return rows.map(mapMotionTransferTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findMotionTransferTaskRow(id);
  return row ? mapMotionTransferTask(row) : null;
}

export async function createTask(payload) {
  const imageAssetId = String(payload.imageAssetId || "").trim();
  const videoAssetId = String(payload.videoAssetId || "").trim();
  if (!imageAssetId) throw createHttpError("imageAssetId is required", 400);
  if (!videoAssetId) throw createHttpError("videoAssetId is required", 400);

  const [imageAsset, videoAsset] = await Promise.all([
    findMotionTransferAsset(imageAssetId, "image"),
    findMotionTransferAsset(videoAssetId, "video")
  ]);
  if (!imageAsset) throw createHttpError("image asset not found", 400);
  if (!videoAsset) throw createHttpError("video asset not found", 400);

  const model = getModelByKey(payload.model);
  const prompt = String(payload.prompt || defaultPrompt).trim() || defaultPrompt;
  const resolution = normalizeResolution(payload.resolution || model.resolution);
  const duration = normalizeDuration(payload.duration || model.duration);
  const costPoints = Number(model.basePoints || 100);

  const connection = await getPool().getConnection();
  let userId;
  let taskId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createMotionTransferTask(connection, {
      userId,
      imageAssetId,
      videoAssetId,
      modelKey: model.value,
      providerModel: model.providerModel,
      prompt,
      resolution,
      duration,
      costPoints
    });
    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "motion transfer generation debit"
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
  connection.release();

  try {
    const [imageUpload, videoUpload] = await Promise.all([
      uploadAssetToKie(imageAsset, "motion-transfer/image"),
      uploadAssetToKie(videoAsset, "motion-transfer/video")
    ]);
    const provider = await createKieMotionTransferTask({
      model: model.providerModel,
      prompt,
      imageUrl: imageUpload.url,
      videoUrl: videoUpload.url,
      resolution,
      duration
    });
    await setMotionTransferTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create motion transfer provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `motion transfer task creation failed: ${error.message}`);
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
  await setMotionTransferAssetProviderUrl(asset.id, result.url);
  return result;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableMotionTransferTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findMotionTransferTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieMotionTransferTask({ taskId: task.provider_task_id });
    const mapped = mapKieMotionTransferState(record);
    if (mapped === "completed") {
      const result = extractMotionTransferResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "KIE motion transfer result missing video URL");
      } else {
        await setMotionTransferTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE motion transfer task failed");
    } else {
      await setMotionTransferTaskProcessing(id);
    }
  } catch (error) {
    await setMotionTransferTaskError(id, `query KIE motion transfer status failed: ${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockMotionTransferTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setMotionTransferTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "motion transfer generation refund"
      });
      await markMotionTransferTaskRefunded(connection, id);
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
  return deleteMotionTransferTask(id);
}

export async function toggleFavorite(id) {
  await toggleMotionTransferTaskFavorite(id);
  return getTask(id);
}
