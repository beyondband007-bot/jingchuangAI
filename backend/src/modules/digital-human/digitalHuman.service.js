import { access, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { createHash, randomUUID } from "crypto";
import path from "path";
import { promisify } from "util";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  buildReferenceAudio,
  buildReferenceImage,
  createArkVideoGenerationTask,
  extractArkVideoGenerationResult,
  getArkVideoGenerationTask,
  mapArkVideoGenerationState
} from "../../providers/volcengine/videoGeneration.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { designMinimaxVoice } from "../../providers/minimax/voiceDesign.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { calculateBillingQuote, estimateSpeechSeconds } from "../../shared/billingRules.js";
import { formatBeijingClock, formatBeijingDateTime } from "../../shared/time.js";
import { getDemoUser } from "../../shared/userService.js";
import { publicAvatars, digitalHumanModels, voices } from "./digitalHuman.data.js";
import {
  createVirtualAssetFromLocalFile,
  listVirtualAssets,
  refreshVirtualAsset,
  waitForVirtualAssetReference
} from "./arkVirtualAssets.service.js";
import {
  createDigitalHumanTaskRow,
  deleteDigitalHumanTaskRow,
  findDigitalHumanTaskRow,
  findRefreshableDigitalHumanTasks,
  listDigitalHumanTaskRows,
  lockDigitalHumanTaskForRefund,
  markDigitalHumanTaskRefunded,
  setDigitalHumanTaskCompleted,
  setDigitalHumanTaskError,
  setDigitalHumanTaskFailed,
  setDigitalHumanTaskProcessing,
  setDigitalHumanTaskProviderStarted
} from "./digitalHuman.repository.js";

const myAvatars = [];
const designedVoices = [];
const uploadedDriveAudios = new Map();
const execFileAsync = promisify(execFile);
const maxDigitalHumanAudioMs = 15 * 1000;

function nowLabel(date = new Date()) {
  return formatBeijingDateTime(date);
}

function displayTime(value) {
  return formatBeijingClock(value);
}

function estimateSeconds(text = "") {
  return Math.max(5, Math.min(15, Math.ceil(String(text).length / 4)));
}

function getAudioDurationMs(speech, text = "") {
  const durationMs = Number(speech?.durationMs || 0);
  if (durationMs > 0) return durationMs;
  return estimateSeconds(text) * 1000;
}

function getVideoDurationSeconds(audioDurationMs) {
  return Math.max(2, Math.min(15, Math.ceil(Number(audioDurationMs || 0) / 1000)));
}

function getArkDurationSeconds(audioDurationMs) {
  return Math.max(2, Math.min(15, Math.ceil(Number(audioDurationMs || 0) / 1000)));
}

function normalizeUploadedAudioDurationMs(value) {
  const durationMs = Math.round(Number(value || 0));
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
}

function getUploadedDriveAudio(audioFileId) {
  const id = String(audioFileId || "").trim();
  return id ? uploadedDriveAudios.get(id) : null;
}

function isImagePath(filePath = "") {
  return /\.(jpe?g|png|webp)$/i.test(filePath);
}

function isVideoPath(filePath = "") {
  return /\.(mp4|webm|mov)$/i.test(filePath);
}

const ttsEmotionOptions = new Set(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"]);

function normalizeVolume(volume) {
  const number = Number(volume);
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(0.1, number));
}

function normalizeDecimal(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEmotion(value) {
  const emotion = String(value || "").trim();
  return ttsEmotionOptions.has(emotion) ? emotion : "";
}

function getVoiceById(voiceId) {
  return [...designedVoices, ...voices].find((item) => item.id === voiceId) || voices[0];
}

function mapVirtualAssetToAvatar(asset) {
  if (!asset) return null;
  const ready = asset.status === "active";
  return {
    id: `ark-asset-${asset.id}`,
    name: asset.fileName || `Ark Avatar ${asset.id}`,
    description:
      asset.status === "failed"
        ? asset.error || "Ark asset failed"
        : ready
          ? "Ark AIGC asset is Active"
          : "Ark AIGC asset is processing",
    language: "AIGC / Seedance",
    status: ready ? "ready" : asset.status === "failed" ? "failed" : "training",
    cover: asset.localUrl,
    provider: "ark",
    arkAssetId: asset.id,
    providerAssetId: asset.providerAssetId,
    assetUri: asset.assetUri,
    createdAt: nowLabel(asset.createdAt || new Date())
  };
}

async function getMyAvatars() {
  const assets = await listVirtualAssets({ feature: "digital-human" });
  return assets.filter((asset) => asset.assetType === "Image").map(mapVirtualAssetToAvatar).filter(Boolean);
}

async function getAvatarById(avatarId) {
  const staticAvatar = publicAvatars.find((item) => item.id === avatarId);
  if (staticAvatar) return { ...staticAvatar, provider: "ark" };

  const match = /^ark-asset-(\d+)$/.exec(String(avatarId || ""));
  if (!match) return null;
  return mapVirtualAssetToAvatar(await refreshVirtualAsset(match[1]));
}

function getModelByKey(modelKey) {
  return digitalHumanModels.find((item) => item.value === modelKey) || digitalHumanModels[0];
}

function mapTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  const progress = row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24;

  return {
    id: String(row.id),
    avatarId: row.avatar_id,
    avatarName: row.avatar_name,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    model: row.model_key,
    providerModel: row.provider_model,
    driveMode: row.drive_mode,
    text: row.text || "",
    speed: Number(row.speed || 1),
    volume: Number(row.volume || 1),
    pitch: Number(row.pitch || 0),
    emotion: row.emotion || "",
    audioUrl: row.audio_url || "",
    status,
    progress,
    duration: row.audio_duration_ms ? getVideoDurationSeconds(row.audio_duration_ms) : estimateSeconds(row.text || ""),
    audioDurationMs: Number(row.audio_duration_ms || 0),
    costPoints: row.cost_points,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    error: row.error_message || "",
    createdAt: nowLabel(row.created_at),
    time: displayTime(row.created_at)
  };
}

function resolvePublicAssetPath(assetPath = "") {
  const relativePath = String(assetPath || "").replace(/^\/+/, "");
  return path.resolve(process.cwd(), config.media.publicAssetsDir, relativePath);
}

async function assertFileExists(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw createHttpError(message, 500);
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getCompanionPosterPath(filePath) {
  const parsed = path.parse(filePath);
  const posterPath = path.join(parsed.dir, "posters", `${parsed.name}.jpg`);
  return (await fileExists(posterPath)) ? posterPath : "";
}

async function getVideoPosterPath(filePath) {
  const outputDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "avatar-frames");
  await mkdir(outputDir, { recursive: true });
  const fileHash = createHash("sha256").update(path.resolve(filePath)).digest("hex").slice(0, 16);
  const safeBaseName = path.basename(filePath, path.extname(filePath)).replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 48);
  const outputPath = path.join(outputDir, `${safeBaseName || "avatar"}-${fileHash}.jpg`);

  try {
    await access(outputPath);
    return outputPath;
  } catch {}

  await execFileAsync(ffmpegPath, [
    "-y",
    "-ss",
    "0.1",
    "-i",
    filePath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath
  ]);
  return outputPath;
}

async function getAvatarArkReference(avatar, userId) {
  if (avatar.arkAssetId) return waitForVirtualAssetReference(avatar.arkAssetId);
  const assetPath = avatar.imagePath || avatar.posterPath || avatar.poster || avatar.assetPath || avatar.cover;
  if (!assetPath) {
    throw createHttpError("selected avatar does not have an image asset", 400);
  }

  const filePath = resolvePublicAssetPath(assetPath);
  await assertFileExists(filePath, `avatar asset not found: ${assetPath}`);
  const imagePath = isImagePath(filePath)
    ? filePath
    : isVideoPath(filePath)
      ? await getVideoPosterPath(filePath)
      : "";
  if (!imagePath) {
    throw createHttpError("selected avatar asset must be an image or video", 400);
  }

  const asset = await createVirtualAssetFromLocalFile({
    userId,
    feature: "digital-human-avatar",
    localUrl: `/media/digital-human/avatar-frames/${path.basename(imagePath)}`,
    filePath: imagePath,
    originalName: path.basename(imagePath),
    mimeType: "image/jpeg",
    sizeBytes: 0
  });
  return waitForVirtualAssetReference(asset.id);
}

async function createProviderTask(taskId, payload) {
  const { text, voiceId, speed, volume, pitch, emotion, avatar, uploadedAudio, userId } = payload;
  let savedAudio;
  let audioDurationMs;
  let audioSizeBytes;

  if (uploadedAudio) {
    console.log(`[digital-human] task ${taskId}: using uploaded drive audio ${uploadedAudio.id}`);
    savedAudio = {
      fileName: path.basename(uploadedAudio.filePath),
      filePath: uploadedAudio.filePath,
      publicPath: uploadedAudio.localUrl,
      mimeType: uploadedAudio.mimeType || "audio/mpeg"
    };
    audioDurationMs = normalizeUploadedAudioDurationMs(uploadedAudio.durationMs) || estimateSeconds(text) * 1000;
    audioSizeBytes = Number(uploadedAudio.sizeBytes || 0);
  } else {
    console.log(`[digital-human] task ${taskId}: synthesizing MiniMax TTS with voice ${voiceId}`);
    const speech = await synthesizeMinimaxSpeech({ text, voiceId, speed, volume, pitch, emotion });
    audioDurationMs = getAudioDurationMs(speech, text);
    savedAudio = await saveMinimaxSpeechAudio({ taskId, audioBuffer: speech.audioBuffer });
    audioSizeBytes = speech.audioBuffer.length;
  }
  if (audioDurationMs > maxDigitalHumanAudioMs) {
    throw createHttpError("音频时长不能超过 15 秒，请缩短文本或切片后分段生成", 400);
  }
  console.log(`[digital-human] task ${taskId}: creating Ark audio asset and Seedance task`);
    const audioAsset = await createVirtualAssetFromLocalFile({
      userId,
      feature: "digital-human-audio",
      localUrl: savedAudio.publicPath,
      filePath: savedAudio.filePath,
      originalName: savedAudio.fileName,
      mimeType: savedAudio.mimeType,
      sizeBytes: audioSizeBytes
    });
    const [avatarReferenceUrl, audioReferenceUrl] = await Promise.all([
      getAvatarArkReference(avatar, userId),
      waitForVirtualAssetReference(audioAsset.id)
    ]);
    const provider = await createArkVideoGenerationTask({
      model: config.ark.videoModel,
      content: [
        {
          type: "text",
          text: `图片1中的虚拟人像按照音频1自然开口说话，保持人物身份、五官、服装、画面主体和背景稳定。口型与音频1同步，表情自然。台词：${text}`
        },
        buildReferenceImage(avatarReferenceUrl),
        buildReferenceAudio(audioReferenceUrl)
      ],
      resolution: config.kie.digitalHumanResolution || "720p",
      ratio: "adaptive",
      duration: getArkDurationSeconds(audioDurationMs),
      generateAudio: true,
      watermark: false
    });

    await setDigitalHumanTaskProviderStarted(taskId, {
      providerTaskId: provider.taskId,
      audioUrl: savedAudio.publicPath,
      audioProviderUrl: audioReferenceUrl,
      avatarProviderUrl: avatarReferenceUrl,
      audioDurationMs
    });
    console.log(`[digital-human] task ${taskId}: Ark task ${provider.taskId} created`);
  return;
}

export function getModels() {
  return {
    models: digitalHumanModels.map((model) => ({
      ...model,
      providerModel: config.ark.videoModel,
      resolution: config.kie.digitalHumanResolution,
      configured: Boolean(config.ark.apiKey && config.ark.accessKeyId && config.ark.secretAccessKey && config.minimax.apiKey)
    })),
    defaults: {
      model: digitalHumanModels[0].value,
      driveMode: "text"
    }
  };
}

export async function getAvatars() {
  return { public: publicAvatars, mine: await getMyAvatars() };
}

export function getVoices() {
  return { voices: [...designedVoices, ...voices] };
}

export async function designVoice(payload) {
  const prompt = String(payload.prompt || payload.description || "").trim();
  const previewText = String(payload.previewText || payload.preview_text || "").trim();
  const voiceId = String(payload.voiceId || payload.voice_id || "").trim();
  const name = String(payload.name || "").trim();

  if (!prompt) throw createHttpError("prompt is required", 400);
  if (!previewText) throw createHttpError("previewText is required", 400);
  if (previewText.length > 500) throw createHttpError("previewText must be 500 characters or fewer", 400);

  const result = await designMinimaxVoice({
    prompt,
    previewText,
    voiceId,
    aigcWatermark: payload.aigcWatermark ?? payload.aigc_watermark ?? false
  });

  const voice = {
    id: result.voiceId,
    name: name || `定制音色 ${designedVoices.length + 1}`,
    description: prompt,
    language: "中文 / 定制",
    sampleUrl: result.trialAudioDataUrl,
    provider: "minimax",
    source: "voice-design",
    createdAt: nowLabel()
  };

  const existingIndex = designedVoices.findIndex((item) => item.id === voice.id);
  if (existingIndex >= 0) {
    designedVoices.splice(existingIndex, 1, voice);
  } else {
    designedVoices.unshift(voice);
  }

  return {
    voice,
    trialAudioBase64: result.trialAudioBase64,
    trialAudioDataUrl: result.trialAudioDataUrl
  };
}

export async function previewVoice(payload) {
  const text = String(payload.previewText || payload.text || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  if (!text) throw createHttpError("previewText is required", 400);

  const result = await synthesizeMinimaxSpeech({
    text,
    voiceId,
    speed: normalizeDecimal(payload.speed, 1),
    volume: normalizeVolume(payload.volume),
    pitch: normalizeDecimal(payload.pitch, 0),
    emotion: normalizeEmotion(payload.emotion)
  });
  const durationMs = getAudioDurationMs(result, text);

  return {
    voiceId,
    audioBase64: result.audioBase64,
    audioDataUrl: `data:${result.mimeType};base64,${result.audioBase64}`,
    durationMs,
    maxDurationMs: maxDigitalHumanAudioMs,
    isTooLong: durationMs > maxDigitalHumanAudioMs,
    videoDuration: getVideoDurationSeconds(durationMs)
  };
}

export async function uploadDriveAudio(payload, file) {
  if (!file) throw createHttpError("audio file is required", 400);
  const id = `dh-audio-${randomUUID()}`;
  const originalName = file.originalname || file.filename || "uploaded-audio";
  const localUrl = `/media/digital-human/audio-uploads/${file.filename}`;
  const durationMs = normalizeUploadedAudioDurationMs(payload.durationMs || payload.duration_ms);
  const audio = {
    id,
    filePath: file.path,
    localUrl,
    originalName,
    mimeType: file.mimetype || "audio/mpeg",
    sizeBytes: file.size || 0,
    durationMs,
    createdAt: new Date()
  };
  uploadedDriveAudios.set(id, audio);

  return {
    id,
    audioFileId: id,
    url: localUrl,
    originalName,
    name: originalName,
    mimeType: audio.mimeType,
    size: audio.sizeBytes,
    durationMs
  };
}

export async function listTasks() {
  await refreshProcessingTasks();
  const rows = await listDigitalHumanTaskRows();
  return rows.map(mapTask);
}

export async function getTask(id) {
  await refreshTask(id);
  const row = await findDigitalHumanTaskRow(id);
  return row ? mapTask(row) : null;
}

export async function createTask(payload) {
  const avatarId = String(payload.avatarId || "").trim();
  const driveMode = String(payload.driveMode || "text");
  const text = String(payload.text || "").trim();
  const audioFileId = String(payload.audioFileId || payload.audio_file_id || "").trim();
  const audioName = String(payload.audioName || payload.audio_name || "").trim();
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  const modelKey = String(payload.model || digitalHumanModels[0].value).trim();
  const speed = normalizeDecimal(payload.speed, 1);
  const volume = normalizeVolume(payload.volume);
  const pitch = normalizeDecimal(payload.pitch, 0);
  const emotion = normalizeEmotion(payload.emotion);

  if (!avatarId) throw createHttpError("avatarId is required", 400);
  if (!["text", "audio"].includes(driveMode)) throw createHttpError("driveMode is invalid", 400);
  const uploadedAudio = driveMode === "audio" ? getUploadedDriveAudio(audioFileId) : null;
  if (driveMode === "audio" && !uploadedAudio) throw createHttpError("audio file is required", 400);
  if (driveMode === "text" && !text) throw createHttpError("text is required", 400);
  if (driveMode === "text" && text.length > 2000) throw createHttpError("text must be 2000 characters or fewer", 400);

  const avatar = await getAvatarById(avatarId);
  if (!avatar) throw createHttpError("avatar not found", 404);
  if (avatar.status !== "ready") throw createHttpError("avatar is not ready", 400);

  const model = getModelByKey(modelKey);
  if (!model || model.provider !== "ark") throw createHttpError("digital human model not found", 400);

  const voice = driveMode === "audio"
    ? { id: "uploaded-audio", name: audioName || uploadedAudio.originalName || "用户上传音频" }
    : getVoiceById(voiceId);
  const taskText = driveMode === "audio" ? audioName || uploadedAudio.originalName || "用户上传音频" : text;
  const billingDuration = driveMode === "audio"
    ? Math.ceil(Number(uploadedAudio?.durationMs || 0) / 1000)
    : estimateSpeechSeconds(text);
  const costPoints = calculateBillingQuote("digital-human", {
    durationSeconds: billingDuration,
    durationMs: uploadedAudio?.durationMs || 0,
    text,
    uploadedAudio: driveMode === "audio"
  }).points;
  const providerModel = config.ark.videoModel;

  const pool = getPool();
  const connection = await pool.getConnection();
  let taskId;
  let userId;

  try {
    await connection.beginTransaction();
    const user = await getDemoUser(connection);
    userId = user.id;
    taskId = await createDigitalHumanTaskRow(connection, {
      userId,
      avatarId,
      avatarName: avatar.name,
      modelKey: model.value,
      providerModel,
      driveMode,
      text: taskText,
      voiceId: voice.id,
      voiceName: voice.name,
      speed,
      volume,
      pitch,
      emotion,
      costPoints
    });

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: "digital human generation debit"
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }

  connection.release();

  try {
    await createProviderTask(taskId, {
      text: taskText,
      voiceId: voice.id,
      speed,
      volume,
      pitch,
      emotion,
      avatar,
      model,
      uploadedAudio,
      userId
    });
  } catch (error) {
    console.error("Create digital human provider task failed:", error.message, error.body || "");
    await refundTask(taskId, userId, costPoints, `数字人任务创建失败：${error.message}`);
  }

  return getTask(taskId);
}

async function refreshProcessingTasks() {
  const rows = await findRefreshableDigitalHumanTasks();
  await Promise.all(rows.map((row) => refreshTask(row.id)));
}

async function refreshTask(id) {
  const row = await findDigitalHumanTaskRow(id);
  if (!row || !row.provider_task_id || !["pending", "processing"].includes(row.status)) return;

  try {
    const record = await getArkVideoGenerationTask({ taskId: row.provider_task_id });
    const mapped = mapArkVideoGenerationState(record);
    if (mapped === "completed") {
      const result = extractArkVideoGenerationResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "digital human result missing video URL");
      } else {
        await setDigitalHumanTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      const result = extractArkVideoGenerationResult(record);
      await refundTask(id, null, null, result.errorMessage || record.data?.failMsg || record.data?.errorMessage || "digital human task failed");
    } else {
      await setDigitalHumanTaskProcessing(id);
    }
  } catch (error) {
    await setDigitalHumanTaskError(id, `查询数字人状态失败：${error.message}`);
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const task = await lockDigitalHumanTaskForRefund(connection, id);
    if (!task) {
      await connection.rollback();
      return;
    }

    const userId = userIdArg || task.user_id;
    const costPoints = costPointsArg || task.cost_points;
    await setDigitalHumanTaskFailed(connection, id, message);

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: "digital human generation refund"
      });
      await markDigitalHumanTaskRefunded(connection, id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function deleteTask(id) {
  return deleteDigitalHumanTaskRow(id);
}

export async function regenerateTask(id) {
  const task = await getTask(id);
  if (!task) return null;
  return createTask(task);
}

export function createAvatar(payload) {
  const { name, fileName = "" } = payload;
  if (!name?.trim()) throw createHttpError("name is required", 400);

  const avatar = {
    id: `mine-${Date.now()}`,
    name: name.trim(),
    description: fileName ? `来自 ${fileName}` : "待上传训练素材",
    language: "自定义",
    status: "training",
    cover: "",
    createdAt: nowLabel()
  };
  myAvatars.unshift(avatar);

  setTimeout(() => {
    avatar.status = "ready";
  }, 1000);

  return avatar;
}

export function updateAvatar(id, payload) {
  const avatar = myAvatars.find((item) => item.id === id);
  if (!avatar) return null;
  if (payload.name?.trim()) avatar.name = payload.name.trim();
  return avatar;
}

export function deleteAvatar(id) {
  const index = myAvatars.findIndex((item) => item.id === id);
  if (index >= 0) myAvatars.splice(index, 1);
  return { ok: index >= 0 };
}

export async function createArkAvatar(payload, file) {
  const { name } = payload;
  if (!name?.trim()) throw createHttpError("name is required", 400);
  if (!file) throw createHttpError("avatar image is required", 400);

  const user = await getDemoUser();
  const asset = await createVirtualAssetFromLocalFile({
    userId: user.id,
    feature: "digital-human",
    localUrl: `/media/digital-human/avatars/${file.filename}`,
    filePath: file.path,
    originalName: file.originalname || file.filename,
    mimeType: file.mimetype || "image/png",
    sizeBytes: file.size || 0
  });
  const avatar = mapVirtualAssetToAvatar(asset);
  avatar.name = name.trim();
  return avatar;
}
