import path from "path";
import { unlink } from "fs/promises";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  buildReferenceImage,
  buildReferenceVideo,
  createArkVideoGenerationTask,
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../../providers/volcengine/videoGeneration.js";
import { getVideoDuration } from "../../providers/ffmpeg/video.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { createVirtualAssetFromLocalFile, waitForVirtualAssetReference } from "../digital-human/arkVirtualAssets.service.js";
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
  "将图片中的虚拟角色自然迁移到目标视频人物上，保持目标视频动作、镜头、光照、表情和画面风格一致，融合真实自然。";

function getModelDefinitions() {
  return [
    {
      value: "face-swap",
      label: "视频换脸",
      provider: "ark",
      providerModel: config.ark.videoModel,
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

async function getSourceVideoDuration(videoAsset) {
  try {
    const sourceDuration = await getVideoDuration(videoAsset.file_path);
    if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
      throw createHttpError("无法读取视频时长，请更换视频后重试", 400);
    }
    if (sourceDuration > 15) {
      throw createHttpError("视频时长不能超过 15 秒", 400);
    }
    return Math.max(2, Math.ceil(sourceDuration));
  } catch (error) {
    if (error.status) throw error;
    throw createHttpError(`无法读取视频时长：${error.message}`, 400);
  }
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
      configured: Boolean(config.ark.apiKey && config.ark.accessKeyId && config.ark.secretAccessKey && config.media.publicBaseUrl)
    })),
    defaults: {
      model: models[0].value,
      resolution: models[0].resolution,
      duration: models[0].duration
    },
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxVideoBytes: 50 * 1024 * 1024,
      recommendedVideoSeconds: 15
    }
  };
}

export async function createAsset({ kind, file }) {
  if (!file) throw createHttpError(`${kind} file is required`, 400);

  if (kind === "video") {
    try {
      await getSourceVideoDuration({ file_path: file.path });
    } catch (error) {
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

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
  const duration = await getSourceVideoDuration(videoAsset);
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
    const [imageUri, videoUri] = await Promise.all([
      uploadAssetToArk(imageAsset, "face-swap-image", userId),
      uploadAssetToArk(videoAsset, "face-swap-video", userId)
    ]);
    const provider = await createArkVideoGenerationTask({
      model: model.providerModel,
      resolution,
      ratio: "adaptive",
      duration,
      generateAudio: false,
      watermark: false,
      content: [
        {
          type: "text",
          text: `${prompt}\n图片1是需要保持身份和面部特征的虚拟形象，视频1是目标动作、镜头和场景参考。请将图片1中的虚拟角色自然融入视频1的人物动作与画面，保持光照、表情、镜头和画面风格一致。`
        },
        buildReferenceImage(imageUri),
        buildReferenceVideo(videoUri)
      ]
    });
    await setFaceSwapTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create face swap provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `视频换脸任务创建失败：${error.message}`);
  }

  return getTask(taskId);
}

async function uploadAssetToArk(asset, feature, userId) {
  if (asset.provider_url && String(asset.provider_url).startsWith("asset://")) return asset.provider_url;
  const virtualAsset = await createVirtualAssetFromLocalFile({
    userId,
    feature,
    localUrl: asset.local_url,
    filePath: asset.file_path,
    originalName: asset.original_name || path.basename(asset.file_path),
    mimeType: asset.mime_type || "application/octet-stream",
    sizeBytes: asset.size_bytes || 0
  });
  const referenceUrl = await waitForVirtualAssetReference(virtualAsset.id);
  await setFaceSwapAssetProviderUrl(asset.id, referenceUrl);
  return referenceUrl;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableFaceSwapTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findFaceSwapTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getArkVideoGenerationTask({ taskId: task.provider_task_id });
    const mapped = mapArkVideoGenerationState(record);
    if (mapped === "completed") {
      const result = extractArkVideoGenerationResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "face swap result missing video URL");
      } else {
        await setFaceSwapTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      const result = extractArkVideoGenerationResult(record);
      await refundTask(id, null, null, result.errorMessage || "视频换脸任务失败");
    } else {
      await setFaceSwapTaskProcessing(id);
    }
  } catch (error) {
    await setFaceSwapTaskError(id, `查询视频换脸状态失败：${error.message}`);
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
