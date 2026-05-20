import { access } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import {
  createKieDigitalHumanTask,
  extractKieDigitalHumanResult,
  getKieDigitalHumanTask,
  mapKieDigitalHumanState
} from "../../providers/kie/digitalHuman.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { designMinimaxVoice } from "../../providers/minimax/voiceDesign.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { formatBeijingClock, formatBeijingDateTime } from "../../shared/time.js";
import { getDemoUser } from "../../shared/userService.js";
import { publicAvatars, digitalHumanModels, voices } from "./digitalHuman.data.js";
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
const maxDigitalHumanAudioMs = 15000;

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

function getKieDurationSeconds(audioDurationMs) {
  return Math.max(2, Math.min(15, Math.ceil(Number(audioDurationMs || 0) / 1000)));
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

function getAvatarById(avatarId) {
  return [...publicAvatars, ...myAvatars].find((item) => item.id === avatarId);
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
    duration: row.audio_duration_ms ? getKieDurationSeconds(row.audio_duration_ms) : estimateSeconds(row.text || ""),
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

async function getAvatarProviderUrl(avatar) {
  if (avatar.providerAssetUrl) return avatar.providerAssetUrl;
  const assetPath = avatar.assetPath || avatar.cover;
  if (!assetPath) {
    throw createHttpError("selected avatar does not have a provider video asset", 400);
  }

  const filePath = resolvePublicAssetPath(assetPath);
  await assertFileExists(filePath, `avatar asset not found: ${assetPath}`);
  const upload = await uploadFileToKie({
    filePath,
    fileName: path.basename(filePath),
    mimeType: "video/mp4",
    uploadPath: "digital-human/avatar"
  });
  return upload.url;
}

async function createProviderTask(taskId, payload) {
  const { text, voiceId, speed, volume, pitch, emotion, avatar } = payload;
  console.log(`[digital-human] task ${taskId}: synthesizing MiniMax TTS with voice ${voiceId}`);
  const speech = await synthesizeMinimaxSpeech({ text, voiceId, speed, volume, pitch, emotion });
  const audioDurationMs = getAudioDurationMs(speech, text);
  if (audioDurationMs > maxDigitalHumanAudioMs) {
    throw createHttpError("音频时长超过 15 秒，请缩短文本或切片后分段生成", 400);
  }
  const savedAudio = await saveMinimaxSpeechAudio({ taskId, audioBuffer: speech.audioBuffer });

  console.log(`[digital-human] task ${taskId}: uploading audio and avatar assets to KIE`);
  const [audioUpload, avatarProviderUrl] = await Promise.all([
    uploadFileToKie({
      filePath: savedAudio.filePath,
      fileName: savedAudio.fileName,
      mimeType: savedAudio.mimeType,
      uploadPath: "digital-human/audio"
    }),
    getAvatarProviderUrl(avatar)
  ]);

  console.log(`[digital-human] task ${taskId}: creating KIE ${config.kie.digitalHumanModel} task`);
  const provider = await createKieDigitalHumanTask({
    model: config.kie.digitalHumanModel,
    prompt: text,
    referenceVideoUrl: avatarProviderUrl,
    referenceVoiceUrl: audioUpload.url,
    ratio: "9:16",
    resolution: config.kie.digitalHumanResolution,
    duration: getKieDurationSeconds(audioDurationMs)
  });

  await setDigitalHumanTaskProviderStarted(taskId, {
    providerTaskId: provider.taskId,
    audioUrl: savedAudio.publicPath,
    audioProviderUrl: audioUpload.url,
    avatarProviderUrl,
    audioDurationMs
  });
  console.log(`[digital-human] task ${taskId}: KIE task ${provider.taskId} created`);
}

export function getModels() {
  return {
    models: digitalHumanModels.map((model) => ({
      ...model,
      providerModel: config.kie.digitalHumanModel,
      resolution: config.kie.digitalHumanResolution,
      configured: Boolean(config.kie.apiKey && config.minimax.apiKey)
    })),
    defaults: {
      model: digitalHumanModels[0].value,
      driveMode: "text"
    }
  };
}

export function getAvatars() {
  return { public: publicAvatars, mine: myAvatars };
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
    videoDuration: getKieDurationSeconds(durationMs)
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
  const voiceId = String(payload.voiceId || voices[0].id).trim();
  const modelKey = String(payload.model || digitalHumanModels[0].value).trim();
  const speed = normalizeDecimal(payload.speed, 1);
  const volume = normalizeVolume(payload.volume);
  const pitch = normalizeDecimal(payload.pitch, 0);
  const emotion = normalizeEmotion(payload.emotion);

  if (!avatarId) throw createHttpError("avatarId is required", 400);
  if (driveMode !== "text") throw createHttpError("audio drive is not available in this version", 501);
  if (!text) throw createHttpError("text is required", 400);
  if (text.length > 2000) throw createHttpError("text must be 2000 characters or fewer", 400);

  const avatar = getAvatarById(avatarId);
  if (!avatar) throw createHttpError("avatar not found", 404);
  if (avatar.status !== "ready") throw createHttpError("avatar is not ready", 400);

  const model = getModelByKey(modelKey);
  if (!model || model.provider !== "kie") throw createHttpError("digital human model not found", 400);

  const voice = getVoiceById(voiceId);
  const costPoints = Number(model.basePoints || 30);
  const providerModel = config.kie.digitalHumanModel;

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
      text,
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
    await createProviderTask(taskId, { text, voiceId: voice.id, speed, volume, pitch, emotion, avatar, model });
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
    const record = await getKieDigitalHumanTask({ taskId: row.provider_task_id });
    const mapped = mapKieDigitalHumanState(record);
    if (mapped === "completed") {
      const result = extractKieDigitalHumanResult(record);
      if (!result.resultUrl) {
        await refundTask(id, null, null, "KIE digital human result missing video URL");
      } else {
        await setDigitalHumanTaskCompleted(id, result);
      }
    } else if (mapped === "failed") {
      await refundTask(id, null, null, record.data?.failMsg || record.data?.errorMessage || "KIE digital human task failed");
    } else {
      await setDigitalHumanTaskProcessing(id);
    }
  } catch (error) {
    await setDigitalHumanTaskError(id, `查询 KIE 数字人状态失败：${error.message}`);
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
