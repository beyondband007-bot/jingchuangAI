import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieFaceSwapTask,
  extractFaceSwapResult,
  getKieFaceSwapTask,
  mapKieFaceSwapState
} from "../../providers/kie/faceSwap.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapFaceSwapAsset, mapFaceSwapTask } from "./faceSwap.mapper.js";
import {
  createFaceSwapAsset,
  createFaceSwapTask,
  deleteFaceSwapTask,
  findFaceSwapAsset,
  findFaceSwapTaskRow,
  findFaceSwapTaskStatus,
  findRefreshableFaceSwapTasks,
  listFaceSwapTaskRows,
  lockFaceSwapTaskForRefund,
  markFaceSwapTaskRefunded,
  setFaceSwapAssetProviderUrl,
  setFaceSwapTaskCompleted,
  setFaceSwapTaskError,
  setFaceSwapTaskFailed,
  setFaceSwapTaskProcessing,
  setFaceSwapTaskProviderTaskId,
  toggleFaceSwapTaskFavorite
} from "./faceSwap.repository.js";

const defaultPrompt =
  "将图片中的人物面部身份自然迁移到目标视频人物上，保持目标视频动作、镜头、光照、表情和画面风格一致，面部融合真实自然，不改变视频主体动作。";

function getModelDefinitions() {
  return [
    {
      value: "kie-face-swap",
      label: "KIE 视频换脸",
      provider: "kie",
      providerModel: config.kie.faceSwapModel,
      basePoints: config.kie.faceSwapPoints,
      resolution: config.kie.faceSwapResolution,
      duration: config.kie.faceSwapDuration
    }
  ];
}

function getModelByKey(modelKey) {
  const key = String(modelKey || "").trim();
  return getModelDefinitions().find((model) => model.value === key) || getModelDefinitions()[0];
}

function normalizeDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return config.kie.faceSwapDuration;
  return Math.max(2, Math.min(15, Math.round(number)));
}

function normalizeResolution(value) {
  const resolution = String(value || "").trim();
  return resolution || config.kie.faceSwapResolution;
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

  const localUrl = `/media/face-swap/${kind === "image" ? "images" : "videos"}/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    assetId = await createFaceSwapAsset(connection, {
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

  return mapFaceSwapAsset(await findFaceSwapAsset(assetId, kind));
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listFaceSwapTaskRows({ filter });
  return rows.map(mapFaceSwapTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findFaceSwapTaskRow(id);
  return row ? mapFaceSwapTask(row) : null;
}

export async function createTask(payload) {
  const imageAssetId = String(payload.imageAssetId || "").trim();
  const videoAssetId = String(payload.videoAssetId || "").trim();
  if (!imageAssetId) throw createHttpError("imageAssetId is required", 400);
  if (!videoAssetId) throw createHttpError("videoAssetId is required", 400);

  const [imageAsset, videoAsset] = await Promise.all([
    findFaceSwapAsset(imageAssetId, "image"),
    findFaceSwapAsset(videoAssetId, "video")
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
    taskId = await createFaceSwapTask(connection, {
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
      memo: "face swap generation debit"
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
      uploadAssetToKie(imageAsset, "face-swap/image"),
      uploadAssetToKie(videoAsset, "face-swap/video")
    ]);
    const provider = await createKieFaceSwapTask({
      model: model.providerModel,
      prompt,
      imageUrl: imageUpload.url,
      videoUrl: videoUpload.url,
      resolution,
      duration
    });
    await setFaceSwapTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create face swap provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `face swap task creation failed: ${error.message}`);
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
  await setFaceSwapAssetProviderUrl(asset.id, result.url);
  return result;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableFaceSwapTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findFaceSwapTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieFaceSwapTask({ taskId: task.provider_task_id });
    const mapped = mapKieFaceSwapState(record);
    if (mapped === "completed") {
      const result = extractFaceSwapResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "KIE face swap result missing video URL");
      } else {
        await setFaceSwapTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE face swap task failed");
    } else {
      await setFaceSwapTaskProcessing(id);
    }
  } catch (error) {
    await setFaceSwapTaskError(id, `query KIE face swap status failed: ${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockFaceSwapTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setFaceSwapTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "face swap generation refund"
      });
      await markFaceSwapTaskRefunded(connection, id);
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
  return deleteFaceSwapTask(id);
}

export async function toggleFavorite(id) {
  await toggleFaceSwapTaskFavorite(id);
  return getTask(id);
}
