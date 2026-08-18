import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  TENCENT_IMAGE2_PROVIDER_MODEL,
  createTencentImage2Task,
  extractTencentImage2Error,
  extractTencentImage2ResultUrls,
  getTencentImage2Task,
  isTencentImage2ProviderModel,
  mapTencentImage2State
} from "../../providers/tencent/aigcImage.js";
import {
  extractWatermarkResult,
  getKieWatermarkTask,
  mapKieWatermarkState
} from "../../providers/kie/watermark.js";
import { normalizeVideoToSource, probeVideo } from "../../providers/ffmpeg/video.js";
import {
  createTencentMpsWatermarkTask,
  extractTencentMpsWatermarkError,
  extractTencentMpsWatermarkResult,
  getTencentMpsWatermarkTask,
  mapTencentMpsWatermarkState
} from "../../providers/tencent/mpsWatermark.js";
import { uploadReferenceToTencentVod } from "../../providers/tencent/vodUpload.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import {
  createGeneratedVideoThumbnail,
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { persistGeneratedImages, removeStoredGeneratedImages } from "../../shared/generatedImageStorage.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapWatermarkAsset, mapWatermarkTask } from "./watermark.mapper.js";
import { calculateTencentMpsWatermarkPoints } from "./watermark.pricing.js";
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
  setWatermarkAssetProvider,
  setWatermarkTaskCompleted,
  setWatermarkTaskError,
  setWatermarkTaskFailed,
  setWatermarkTaskProcessing,
  setWatermarkTaskProviderTaskId,
  toggleWatermarkTaskFavorite
} from "./watermark.repository.js";

const defaultPrompt = "去除画面中的水印、Logo、文字覆盖物，并自然修复背景，不改变主体内容。";

function getTencentMpsProviderModel() {
  return `smart-erase-${config.tencentCloud.mpsWatermarkModel}-${config.tencentCloud.mpsWatermarkMethod}`;
}

function getDefaultVideoPointsPerMinute() {
  return calculateTencentMpsWatermarkPoints({
    durationSeconds: 60,
    width: 1280,
    height: 720,
    model: config.tencentCloud.mpsWatermarkModel,
    markup: config.tencentCloud.mpsWatermarkMarkup
  });
}

function getModelDefinitions() {
  return [
    {
      value: "kie-watermark-image",
      label: "图片去水印（Facemini Image2）",
      kind: "image",
      provider: "tencent-vod",
      providerModel: TENCENT_IMAGE2_PROVIDER_MODEL,
      basePoints: config.tencentCloud.image2WatermarkPoints,
      resolution: config.tencentCloud.image2WatermarkResolution
    },
    {
      value: "tencent-mps-watermark-video",
      label: "视频去水印",
      kind: "video",
      provider: "tencent-mps",
      providerModel: getTencentMpsProviderModel(),
      basePoints: getDefaultVideoPointsPerMinute(),
      pointsPerMinute: getDefaultVideoPointsPerMinute(),
      billingUnit: "per_minute",
      resolution: "source"
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
      configured: model.provider.startsWith("tencent-")
        ? Boolean(config.tencentCloud.secretId && config.tencentCloud.secretKey && config.tencentCloud.vodSubAppId)
        : Boolean(config.kie.apiKey)
    })),
    defaults: {
      imageModel: "kie-watermark-image",
      videoModel: "tencent-mps-watermark-video",
      imageResolution: config.tencentCloud.image2WatermarkResolution,
      videoResolution: "source"
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
  const videoMetadata = kind === "video" ? await probeVideo(file.path) : null;
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
      sizeBytes: file.size || 0,
      durationSeconds: videoMetadata?.durationSeconds || null,
      width: videoMetadata?.width || null,
      height: videoMetadata?.height || null
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const asset = mapWatermarkAsset(await findWatermarkAssetForUser(assetId, userId, kind));
  if (kind === "video") {
    asset.estimatedPoints = calculateTencentMpsWatermarkPoints({
      durationSeconds: asset.durationSeconds,
      width: asset.width,
      height: asset.height,
      model: config.tencentCloud.mpsWatermarkModel,
      markup: config.tencentCloud.mpsWatermarkMarkup
    });
  }
  return asset;
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
  let videoMetadata = null;
  if (sourceAsset.kind === "video") {
    videoMetadata = sourceAsset.duration_seconds && sourceAsset.width && sourceAsset.height
      ? {
          durationSeconds: Number(sourceAsset.duration_seconds),
          width: Number(sourceAsset.width),
          height: Number(sourceAsset.height)
        }
      : await probeVideo(sourceAsset.file_path);
  }
  const resolution = sourceAsset.kind === "video"
    ? `${videoMetadata.width}x${videoMetadata.height}`
    : normalizeResolution(payload.resolution || model.resolution, model.resolution);
  const costPoints = sourceAsset.kind === "video"
    ? calculateTencentMpsWatermarkPoints({
        ...videoMetadata,
        model: config.tencentCloud.mpsWatermarkModel,
        markup: config.tencentCloud.mpsWatermarkMarkup
      })
    : Math.max(0, Math.ceil(Number(model.basePoints) || 0));

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
    const provider = sourceAsset.kind === "image"
      ? await createTencentImage2Task({
        prompt,
        quality: resolution === "1K" ? "1K" : "2K",
        referenceFileIds: [(await uploadAssetToTencentVod(sourceAsset)).fileId]
      })
      : await createTencentMpsWatermarkTask({
        fileId: (await uploadAssetToTencentVod(sourceAsset)).fileId,
        method: config.tencentCloud.mpsWatermarkMethod,
        model: config.tencentCloud.mpsWatermarkModel
      });
    await setWatermarkTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create watermark provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `去水印任务创建失败：${error.message}`);
  }

  return mapWatermarkTask(await findWatermarkTaskRow(taskId));
}

async function uploadAssetToTencentVod(asset) {
  if (asset.provider_asset_id) {
    return { fileId: asset.provider_asset_id, url: asset.provider_url || "" };
  }
  const result = await uploadReferenceToTencentVod({ filePath: asset.file_path });
  if (!result.fileId) throw new Error("Tencent Cloud VOD upload response missing FileId");
  await setWatermarkAssetProvider(asset.id, {
    providerUrl: result.mediaUrl,
    providerAssetId: result.fileId
  });
  return { fileId: result.fileId, url: result.mediaUrl };
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableWatermarkTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findWatermarkTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const isTencentMpsVideo = task.media_type === "video" && String(task.provider_model || "").startsWith("smart-erase-");
    const isTencentImage2 = isTencentImage2ProviderModel(task.provider_model);
    const record = isTencentMpsVideo
      ? await getTencentMpsWatermarkTask({ taskId: task.provider_task_id })
      : isTencentImage2
        ? await getTencentImage2Task({ taskId: task.provider_task_id })
        : await getKieWatermarkTask({ taskId: task.provider_task_id });
    const mapped = isTencentMpsVideo
      ? mapTencentMpsWatermarkState(record)
      : isTencentImage2
        ? mapTencentImage2State(record)
        : mapKieWatermarkState(record);
    if (mapped === "completed") {
      const result = isTencentMpsVideo
        ? extractTencentMpsWatermarkResult(record)
        : isTencentImage2
          ? { resultUrl: extractTencentImage2ResultUrls(record)[0] || "", thumbnailUrl: "" }
          : extractWatermarkResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "去水印结果缺少下载链接");
      } else {
        if (task.media_type === "video") {
          const [localUrl] = await persistGeneratedVideos({
            taskId: id,
            feature: "watermark-videos",
            urls: [result.resultUrl]
          });
          const normalizedUrl = await normalizeWatermarkVideo({
            taskId: id,
            sourcePath: task.source_file_path,
            videoUrl: localUrl
          });
          const thumbnailUrl = await createGeneratedVideoThumbnail({
            taskId: id,
            feature: "watermark-videos",
            videoUrl: normalizedUrl
          }).catch(() => "");
          await setWatermarkTaskCompleted(id, { ...result, resultUrl: normalizedUrl, thumbnailUrl });
        } else {
          const [localUrl] = await persistGeneratedImages({ taskId: id, feature: "watermark-images", urls: [result.resultUrl] });
          await setWatermarkTaskCompleted(id, { ...result, resultUrl: localUrl, thumbnailUrl: localUrl.replace(/\/result-1\.[^/]+$/, "/thumbnail-1.jpg") });
        }
      }
    } else if (mapped === "failed") {
      const failureMessage = isTencentMpsVideo
        ? extractTencentMpsWatermarkError(record)
        : isTencentImage2 ? extractTencentImage2Error(record) : record.data?.failMsg || record.data?.errorMessage || "去水印任务失败";
      await refundTask(id, null, null, failureMessage);
    } else {
      await setWatermarkTaskProcessing(id);
    }
  } catch (error) {
    await setWatermarkTaskError(id, `查询去水印状态失败：${error.message}`);
  }
}

async function getVideoAspectRatio(filePath) {
  const { width, height } = await probeVideo(filePath);
  if (!width || !height) return "";
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Number(left) || 0);
  let b = Math.abs(Number(right) || 0);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

async function normalizeWatermarkVideo({ taskId, sourcePath, videoUrl }) {
  if (!sourcePath) return videoUrl;
  const outputPath = path.resolve(
    process.cwd(),
    config.media.storageDir,
    "generated",
    "watermark-videos",
    String(taskId),
    "result-2.mp4"
  );
  await normalizeVideoToSource({
    videoPath: path.resolve(process.cwd(), config.media.storageDir, videoUrl.replace(/^\/media\//, "")),
    sourcePath,
    outputPath
  });
  return `/media/generated/watermark-videos/${taskId}/result-2.mp4`;
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
    await removeStoredGeneratedImages({ taskId: id, feature: "watermark-images" });
  }
  return result;
}

export async function toggleFavorite(id) {
  await toggleWatermarkTaskFavorite(id);
  return getTask(id);
}
