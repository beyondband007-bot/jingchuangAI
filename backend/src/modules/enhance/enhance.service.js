import path from "path";
import { execFile } from "child_process";
import { mkdir, readFile, rm } from "fs/promises";
import { promisify } from "util";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
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
import {
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "../../shared/generatedVideoStorage.js";
import { getDemoUser, getDemoUserCredits } from "../../shared/userService.js";
import { mapEnhanceAsset, mapEnhanceTask } from "./enhance.mapper.js";
import {
  createEnhanceAsset,
  createEnhanceTask,
  deleteEnhanceTask,
  findEnhanceAssetForUser,
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

const execFileAsync = promisify(execFile);

const KIE_COMPATIBLE_IMAGE_FORMATS = {
  jpeg: { mimeType: "image/jpeg", ext: ".jpg" },
  png: { mimeType: "image/png", ext: ".png" },
  webp: { mimeType: "image/webp", ext: ".webp" }
};

const defaultImageEnhancePrompt = [
  "Enhance the image quality while preserving the original composition, identity, layout, colors, and subject.",
  "Improve sharpness, fine details, texture clarity, edge definition, lighting balance, and overall clean high-resolution appearance.",
  "Remove compression artifacts, blur, noise, pixelation, and low-quality defects naturally.",
  "Do not add new objects, do not change the scene, do not alter faces or text content, and do not stylize the image."
].join(" ");

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
  throw createHttpError("请上传图片或视频文件", 400);
}

function normalizeUpscaleFactor(value, fallback) {
  const factor = String(value || fallback || "2").trim();
  return factor || "2";
}

function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return "";
}

function buildKieImageFileName(asset, ext) {
  const baseName = path.basename(asset.original_name || asset.stored_name || "source", path.extname(asset.original_name || asset.stored_name || ""));
  const safeBaseName = baseName.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `enhance-${asset.id}`;
  return `${safeBaseName}${ext}`;
}

export async function getCredits() {
  return getDemoUserCredits();
}

export function getModels() {
  const models = getModelDefinitions();
  return {
    models: models.map((model) => ({
      value: model.value,
      label: model.label,
      kind: model.kind,
      provider: model.provider,
      basePoints: model.basePoints,
      upscaleFactor: model.upscaleFactor,
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

export async function createAsset({ file, user: requestUser } = {}) {
  if (!file) throw createHttpError("请上传文件", 400);

  const kind = inferKind(file);
  const localUrl = `/media/enhance/${kind === "image" ? "images" : "videos"}/${file.filename}`;
  const connection = await getPool().getConnection();
  let assetId;
  let userId;
  try {
    await connection.beginTransaction();
    const user = requestUser?.id ? requestUser : await getDemoUser(connection);
    userId = user.id;
    assetId = await createEnhanceAsset(connection, {
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

  return mapEnhanceAsset(await findEnhanceAssetForUser(assetId, userId, kind));
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

export async function createTask(payload, requestUser = null) {
  const sourceAssetId = String(payload.sourceAssetId || "").trim();
  if (!sourceAssetId) throw createHttpError("缺少源素材，请重新上传", 400);

  const requestUserId = requestUser?.id;
  const sourceAsset = requestUserId
    ? await findEnhanceAssetForUser(sourceAssetId, requestUserId)
    : await findEnhanceAssetForUser(sourceAssetId, (await getDemoUser()).id);
  if (!sourceAsset) throw createHttpError("源素材不存在，请重新上传", 400);

  const model = getModelForKind(sourceAsset.kind, payload.model);
  const upscaleFactor = normalizeUpscaleFactor(payload.upscaleFactor, model.upscaleFactor);
  const costPoints = Number(model.basePoints || 0);

  const connection = await getPool().getConnection();
  let userId;
  let taskId;
  try {
    await connection.beginTransaction();
    const user = requestUser?.id ? requestUser : await getDemoUser(connection);
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
    if (costPoints > 0) {
      await debitCredits(connection, {
        userId,
        taskId,
        amount: costPoints,
        memo: "enhance generation debit"
      });
    }
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
        prompt: defaultImageEnhancePrompt,
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
    await refundTask(taskId, userId, costPoints, `画质增强任务创建失败：${error.message}`);
  }

  return getTask(taskId);
}

async function uploadAssetToKie(asset, uploadPath) {
  if (asset.provider_url && asset.kind !== "image") return { url: asset.provider_url };

  if (asset.kind === "image") {
    const result = await uploadEnhanceImageToKie(asset, uploadPath);
    await setEnhanceAssetProviderUrl(asset.id, result.url);
    return result;
  }

  const result = await uploadFileToKie({
    filePath: asset.file_path,
    fileName: asset.original_name || path.basename(asset.file_path),
    mimeType: asset.mime_type || "application/octet-stream",
    uploadPath
  });
  await setEnhanceAssetProviderUrl(asset.id, result.url);
  return result;
}

async function uploadEnhanceImageToKie(asset, uploadPath) {
  const bytes = await readFile(asset.file_path);
  const format = detectImageFormat(bytes);
  const compatible = KIE_COMPATIBLE_IMAGE_FORMATS[format];
  if (compatible) {
    return uploadFileToKie({
      filePath: asset.file_path,
      fileName: buildKieImageFileName(asset, compatible.ext),
      mimeType: compatible.mimeType,
      uploadPath
    });
  }

  const convertedDir = path.resolve(process.cwd(), config.media.storageDir, "enhance", "kie-compatible");
  await mkdir(convertedDir, { recursive: true });
  const convertedPath = path.join(convertedDir, `${Date.now()}-${asset.id}.jpg`);

  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      asset.file_path,
      "-frames:v",
      "1",
      "-vf",
      "format=yuv420p",
      "-q:v",
      "2",
      convertedPath
    ]);

    return await uploadFileToKie({
      filePath: convertedPath,
      fileName: buildKieImageFileName(asset, ".jpg"),
      mimeType: "image/jpeg",
      uploadPath
    });
  } catch (error) {
    const message = String(error?.stderr || error?.message || "").slice(-400);
    const wrapped = createHttpError(
      `图片格式不支持，请上传 JPEG、PNG 或 WEBP 格式图片${message ? `（${message}）` : ""}`,
      400
    );
    wrapped.cause = error;
    throw wrapped;
  } finally {
    await rm(convertedPath, { force: true }).catch(() => {});
  }
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
        await refundTask(id, null, null, "画质增强结果缺少下载链接");
      } else {
        if (task.media_type === "video") {
          const [localUrl] = await persistGeneratedVideos({
            taskId: id,
            feature: "enhance-videos",
            urls: [result.resultUrl]
          });
          await setEnhanceTaskCompleted(id, { ...result, resultUrl: localUrl });
        } else {
          await setEnhanceTaskCompleted(id, result);
        }
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "画质增强任务失败");
    } else {
      await setEnhanceTaskProcessing(id);
    }
  } catch (error) {
    await setEnhanceTaskError(id, `查询画质增强状态失败：${error.message}`);
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
  const result = await deleteEnhanceTask(id);
  if (result?.ok) {
    await removeStoredGeneratedVideos({
      taskId: id,
      feature: "enhance-videos"
    }).catch((error) => {
      console.warn(`delete local enhanced video for task ${id} failed:`, error.message);
    });
  }
  return result;
}

export async function toggleFavorite(id) {
  await toggleEnhanceTaskFavorite(id);
  return getTask(id);
}
