import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieWatermarkImageTask,
  createKieWatermarkVideoTask,
  extractWatermarkResult,
  getKieWatermarkTask,
  mapKieWatermarkState
} from "../../providers/kie/watermark.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { getVideoDuration } from "../../providers/ffmpeg/video.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import {
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapWatermarkAsset, mapWatermarkTask } from "./watermark.mapper.js";
import {
  createWatermarkAsset,
  createWatermarkTask,
  deleteWatermarkTask,
  findRefreshableWatermarkTasks,
  findWatermarkAssetForUser,
  findWatermarkTaskRow,
  findWatermarkTaskStatus,
  listWatermarkTaskRows,
  lockWatermarkTaskForRefund,
  markWatermarkTaskRefunded,
  setWatermarkAssetProviderUrl,
  setWatermarkTaskCompleted,
  setWatermarkTaskError,
  setWatermarkTaskFailed,
  setWatermarkTaskProcessing,
  setWatermarkTaskProviderTaskId,
  toggleWatermarkTaskFavorite
} from "./watermark.repository.js";

const defaultPrompt = "去除画面中的水印、Logo、文字覆盖物，并自然修复背景，不改变主体内容。";

function getModelDefinitions() {
  return [
    {
      value: "kie-watermark-image",
      label: "图片去水印",
      kind: "image",
      provider: "kie",
      providerModel: config.kie.watermarkImageModel,
      basePoints: config.kie.watermarkImagePoints,
      resolution: config.kie.watermarkImageResolution
    },
    {
      value: "kie-watermark-video",
      label: "视频去水印",
      kind: "video",
      provider: "kie",
      providerModel: config.kie.watermarkVideoModel,
      basePoints: config.kie.watermarkVideoPoints,
      resolution: config.kie.watermarkVideoResolution
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
  throw createHttpError("请上传图片或视频文件", 400);
}

function normalizeResolution(value, fallback) {
  const resolution = String(value || "").trim();
  return resolution || fallback;
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
      imageModel: "kie-watermark-image",
      videoModel: "kie-watermark-video",
      imageResolution: config.kie.watermarkImageResolution,
      videoResolution: config.kie.watermarkVideoResolution
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxVideoBytes: 200 * 1024 * 1024,
      recommendedVideoSeconds: 15
    }
  };
}

export async function createAsset({ file, user: requestUser } = {}) {
  if (!file) throw createHttpError("请上传文件", 400);

  const kind = inferKind(file);
  const localUrl = `/media/watermark/${kind === "image" ? "images" : "videos"}/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  let userId;
  try {
    await connection.beginTransaction();
    const user = requestUser?.id ? requestUser : await getDemoUser(connection);
    userId = user.id;
    assetId = await createWatermarkAsset(connection, {
      userId,
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

  return mapWatermarkAsset(await findWatermarkAssetForUser(assetId, userId, kind));
}

export async function listTasks({ filter = "all" } = {}) {
  await refreshProcessingTasks();
  const rows = await listWatermarkTaskRows({ filter });
  return rows.map(mapWatermarkTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findWatermarkTaskRow(id);
  return row ? mapWatermarkTask(row) : null;
}

export async function createTask(payload, requestUser = null) {
  const sourceAssetId = String(payload.sourceAssetId || "").trim();
  if (!sourceAssetId) throw createHttpError("缺少源素材，请重新上传", 400);

  const requestUserId = requestUser?.id;
  const sourceAsset = requestUserId
    ? await findWatermarkAssetForUser(sourceAssetId, requestUserId)
    : await findWatermarkAssetForUser(sourceAssetId, (await getDemoUser()).id);
  if (!sourceAsset) throw createHttpError("源素材不存在，请重新上传", 400);

  const model = getModelForKind(sourceAsset.kind, payload.model);
  const prompt = String(payload.prompt || defaultPrompt).trim() || defaultPrompt;
  const resolution = normalizeResolution(payload.resolution || model.resolution, model.resolution);
  if (sourceAsset.kind === "video") {
    await getVideoDuration(sourceAsset.file_path);
  }
  const costPoints = Math.max(0, Math.ceil(Number(model.basePoints) || 0));

  const connection = await getPool().getConnection();
  let userId;
  let taskId;
  try {
    await connection.beginTransaction();
    const user = requestUser?.id ? requestUser : await getDemoUser(connection);
    userId = user.id;
    taskId = await createWatermarkTask(connection, {
      userId,
      sourceAssetId,
      mediaType: sourceAsset.kind,
      modelKey: model.value,
      providerModel: model.providerModel,
      prompt,
      resolution,
      costPoints
    });
    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "watermark removal generation debit"
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
  connection.release();

  try {
    const upload = await uploadAssetToKie(sourceAsset, `watermark/${sourceAsset.kind}`);
    const provider = sourceAsset.kind === "image"
      ? await createKieWatermarkImageTask({
        model: model.providerModel,
        prompt,
        sourceUrl: upload.url,
        resolution
      })
      : await createKieWatermarkVideoTask({
        model: model.providerModel,
        prompt,
        sourceUrl: upload.url,
        resolution
      });
    await setWatermarkTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create watermark provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `去水印任务创建失败：${error.message}`);
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
  await setWatermarkAssetProviderUrl(asset.id, result.url);
  return result;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableWatermarkTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findWatermarkTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getKieWatermarkTask({ taskId: task.provider_task_id });
    const mapped = mapKieWatermarkState(record);
    if (mapped === "completed") {
      const result = extractWatermarkResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "去水印结果缺少下载链接");
      } else {
        if (task.media_type === "video") {
          const [localUrl] = await persistGeneratedVideos({
            taskId: id,
            feature: "watermark-videos",
            urls: [result.resultUrl]
          });
          await setWatermarkTaskCompleted(id, { ...result, resultUrl: localUrl });
        } else {
          await setWatermarkTaskCompleted(id, result);
        }
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "去水印任务失败");
    } else {
      await setWatermarkTaskProcessing(id);
    }
  } catch (error) {
    await setWatermarkTaskError(id, `查询去水印状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockWatermarkTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setWatermarkTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "watermark removal generation refund"
      });
      await markWatermarkTaskRefunded(connection, id);
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
  const result = await deleteWatermarkTask(id);
  if (result?.ok) {
    await removeStoredGeneratedVideos({
      taskId: id,
      feature: "watermark-videos"
    }).catch((error) => {
      console.warn(`delete local watermark video for task ${id} failed:`, error.message);
    });
  }
  return result;
}

export async function toggleFavorite(id) {
  await toggleWatermarkTaskFavorite(id);
  return getTask(id);
}
