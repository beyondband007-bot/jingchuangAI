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
import { calculateVideoPoints } from "../../shared/billingRules.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { createVirtualAssetFromLocalFile, waitForVirtualAssetReference } from "../digital-human/arkVirtualAssets.service.js";
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

const defaultPrompt =
  "让图片中的虚拟角色跟随参考视频完成同款动作，保持角色身份、服装和画面主体稳定，动作自然流畅。";

function getModelDefinitions() {
  return [
    {
      value: "motion-transfer",
      label: "动作迁移",
      provider: "ark",
      providerModel: config.ark.videoModel,
      basePoints: config.kie.motionTransferPoints,
      resolution: config.kie.motionTransferResolution,
      characterOrientation: config.kie.motionTransferCharacterOrientation
    }
  ];
}

function getModelByKey(modelKey) {
  const key = String(modelKey || "").trim();
  return getModelDefinitions().find((model) => model.value === key) || getModelDefinitions()[0];
}

function normalizeResolution(value) {
  const resolution = String(value || "").trim();
  if (resolution === "1080p") return "1080p";
  return "720p";
}

function normalizeCharacterOrientation(value) {
  const orientation = String(value || "").trim();
  return orientation === "video" ? "video" : "image";
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

function getProviderDuration() {
  const duration = Number(config.kie.motionTransferDuration || config.kie.faceSwapDuration || 5);
  return duration === 10 ? 10 : 5;
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
      characterOrientation: models[0].characterOrientation
    },
    modes: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" }
    ],
    characterOrientations: [
      { value: "image", label: "图片朝向", maxSeconds: 15 },
      { value: "video", label: "视频朝向", maxSeconds: 15 }
    ],
    limits: {
      maxImageBytes: 10 * 1024 * 1024,
      maxVideoBytes: 50 * 1024 * 1024,
      recommendedVideoSeconds: 15
    }
  };
}

export async function createAsset({ kind, file }) {
  if (!file) throw createHttpError(kind === "image" ? "请上传图片" : "请上传视频", 400);

  if (kind === "video") {
    try {
      await getSourceVideoDuration({ file_path: file.path });
    } catch (error) {
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

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
  if (!imageAssetId) throw createHttpError("缺少图片素材，请重新上传", 400);
  if (!videoAssetId) throw createHttpError("缺少视频素材，请重新上传", 400);

  const [imageAsset, videoAsset] = await Promise.all([
    findMotionTransferAsset(imageAssetId, "image"),
    findMotionTransferAsset(videoAssetId, "video")
  ]);
  if (!imageAsset) throw createHttpError("图片素材不存在，请重新上传", 400);
  if (!videoAsset) throw createHttpError("视频素材不存在，请重新上传", 400);

  const model = getModelByKey(payload.model);
  const prompt = String(payload.prompt || defaultPrompt).trim() || defaultPrompt;
  const resolution = normalizeResolution(payload.resolution || model.resolution);
  const characterOrientation = normalizeCharacterOrientation(payload.characterOrientation || model.characterOrientation);
  await getSourceVideoDuration(videoAsset);
  const duration = getProviderDuration();
  const costPoints = calculateVideoPoints(duration);

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
      characterOrientation,
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
    const [imageUri, videoUri] = await Promise.all([
      uploadAssetToArk(imageAsset, "motion-transfer-image", userId),
      uploadAssetToArk(videoAsset, "motion-transfer-video", userId)
    ]);
    const provider = await createArkVideoGenerationTask({
      model: model.providerModel,
      content: [
        {
          type: "text",
          text: `${prompt}\n图片1是需要保持身份和外观的虚拟形象，视频1是动作和镜头参考。请让图片1中的虚拟角色完成视频1的动作，保持背景来源于视频1，动作自然连贯。`
        },
        buildReferenceImage(imageUri),
        buildReferenceVideo(videoUri)
      ],
      resolution,
      ratio: "adaptive",
      generateAudio: false,
      watermark: false
    });
    await setMotionTransferTaskProviderTaskId(taskId, provider.taskId);
  } catch (error) {
    console.error("Create motion transfer provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `动作迁移任务创建失败：${error.message}`);
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
  await setMotionTransferAssetProviderUrl(asset.id, referenceUrl);
  return referenceUrl;
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableMotionTransferTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const task = await findMotionTransferTaskStatus(id);
  if (!task || !task.provider_task_id || !["pending", "processing"].includes(task.status)) return;

  try {
    const record = await getArkVideoGenerationTask({ taskId: task.provider_task_id });
    const mapped = mapArkVideoGenerationState(record);
    if (mapped === "completed") {
      const result = extractArkVideoGenerationResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "动作迁移结果缺少视频链接");
      } else {
        await setMotionTransferTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      const result = extractArkVideoGenerationResult(record);
      await refundTask(id, null, null, result.errorMessage || "动作迁移任务失败");
    } else {
      await setMotionTransferTaskProcessing(id);
    }
  } catch (error) {
    await setMotionTransferTaskError(id, `查询动作迁移状态失败：${error.message}`);
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
