import { createHash, randomUUID } from "crypto";
import { config } from "../../config/index.js";
import { getPool } from "../../db/pool.js";
import { cloneMinimaxVoice, uploadMinimaxVoiceFile } from "../../providers/minimax/voiceClone.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { debitCredits, refundCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { BILLING_RULES } from "../../shared/billingRules.js";
import {
  completeVoiceCloneAsset,
  createVoiceCloneAssetProcessing,
  createVoiceSynthesisTaskRow,
  failVoiceCloneAsset,
  findCompletedVoiceCloneAssetByHash,
  findVoiceCloneAssetByHash,
  listVoiceCloneAssetRows,
  listVoiceSynthesisTaskRows,
  retryFailedVoiceCloneAssetProcessing
} from "./voice.repository.js";
import { formatBeijingDateTime } from "../../shared/time.js";

const maxAudioBytes = 20 * 1024 * 1024;
const allowedMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/mp4a-latm", "audio/x-m4a", "audio/wav", "audio/x-wav"]);
const allowedExtensions = new Set([".mp3", ".m4a", ".wav"]);
const clonedVoices = [];
const ttsEmotionOptions = new Set(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"]);

function getExt(fileName = "") {
  const match = String(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function assertAudioFile(file) {
  if (!file) throw createHttpError("请上传音频文件", 400);
  if (file.size > maxAudioBytes) throw createHttpError("音频文件需小于 20MB", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedMimeTypes.has(mimeType) && !allowedExtensions.has(ext)) {
    throw createHttpError("音频文件需为 mp3、m4a 或 wav 格式", 400);
  }
}

function normalizeDurationMs(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function assertDuration(purpose, durationMs) {
  const duration = normalizeDurationMs(durationMs);
  if (!duration) return;

  if (purpose === "prompt_audio" && duration >= 8000) {
    throw createHttpError("提示音频需短于 8 秒", 400);
  }

  if (purpose === "voice_clone" && (duration < 10000 || duration > 5 * 60 * 1000)) {
    throw createHttpError("复刻音频时长需在 10 秒到 5 分钟之间", 400);
  }
}

function normalizeVoiceId(value = "") {
  const voiceId = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{7,255}$/.test(voiceId)) {
    throw createHttpError("voiceId 需以字母开头，长度为 8-256 个字符，仅支持字母、数字、- 和 _", 400);
  }
  return voiceId;
}

function normalizeEmotion(value) {
  const emotion = String(value || "").trim();
  return ttsEmotionOptions.has(emotion) ? emotion : "";
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function makeDefaultCloneName(name) {
  return name || `复刻音色 ${clonedVoices.length + 1}`;
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function mapSavedVoice(voice) {
  if (!voice) return null;
  return {
    ...voice,
    createdAt: voice.createdAt ? formatBeijingDateTime(voice.createdAt) : formatBeijingDateTime()
  };
}

function mapVoiceTask(row) {
  return {
    id: row.id,
    title: row.title,
    voiceId: row.voice_id,
    voiceName: row.voice_name || row.voice_id,
    text: row.text,
    audioUrl: row.audio_url,
    durationMs: row.duration_ms || 0,
    mimeType: row.mime_type || "",
    favorite: Boolean(row.favorite),
    createdAt: formatBeijingDateTime(row.created_at)
  };
}

function registerClonedVoice({ voiceId, name, description, demoAudio }) {
  const voice = {
    id: voiceId,
    name: makeDefaultCloneName(name),
    description: description || "MiniMax 快速复刻音色",
    provider: "minimax",
    source: "voice-clone",
    demoAudio: demoAudio || "",
    createdAt: formatBeijingDateTime()
  };

  const existingIndex = clonedVoices.findIndex((item) => item.id === voice.id);
  if (existingIndex >= 0) clonedVoices.splice(existingIndex, 1, voice);
  clonedVoices.unshift(voice);
  return voice;
}

async function createCloneFromUpload({ cloneAudioFileId, voiceId, promptAudioFileId, promptText, previewText, model, name }) {
  const result = await cloneMinimaxVoice({
    cloneAudioFileId,
    voiceId,
    promptAudioFileId,
    promptText,
    previewText,
    model
  });

  const voice = registerClonedVoice({
    voiceId,
    name,
    description: promptText || "MiniMax 快速复刻音色",
    demoAudio: result.demoAudio
  });

  return {
    voice,
    demoAudio: result.demoAudio,
    inputSensitive: result.inputSensitive,
    inputSensitiveType: result.inputSensitiveType,
    extraInfo: result.extraInfo
  };
}

export function getConfig() {
  return {
    configured: Boolean(config.minimax.apiKey),
    model: config.minimax.ttsModel,
    upload: {
      maxBytes: maxAudioBytes,
      formats: ["mp3", "m4a", "wav"],
      promptAudioMaxMs: 8000,
      cloneAudioMinMs: 10000,
      cloneAudioMaxMs: 5 * 60 * 1000
    },
    voices: clonedVoices
  };
}

export async function listVoices(userId) {
  const savedVoices = await listVoiceCloneAssetRows({ userId });
  return savedVoices.map(mapSavedVoice);
}

export async function listTasks(userId) {
  const rows = await listVoiceSynthesisTaskRows({ userId });
  return rows.map(mapVoiceTask);
}

export async function uploadAudio({ file, purpose, durationMs, userId }) {
  assertAudioFile(file);
  assertDuration(purpose, durationMs);

  const audioHash = hashBuffer(file.buffer);
  if (purpose === "voice_clone" && userId) {
    const cachedVoice = await findCompletedVoiceCloneAssetByHash({ userId, audioHash });
    if (cachedVoice) {
      return {
        fileId: "",
        audioHash,
        cachedVoice: mapSavedVoice(cachedVoice),
        durationMs: normalizeDurationMs(durationMs),
        localName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        reused: true
      };
    }
  }

  const result = await uploadMinimaxVoiceFile({
    buffer: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    purpose
  });

  return {
    ...result,
    audioHash,
    durationMs: normalizeDurationMs(durationMs),
    localName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

async function chargeVoiceGeneration({ userId, memo, amount }) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await debitCredits(connection, {
      userId,
      taskId: null,
      amount,
      memo
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function refundVoiceGeneration({ userId, memo, amount }) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await refundCredits(connection, {
      userId,
      taskId: null,
      amount,
      memo
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createClone(payload, userId) {
  const cloneAudioFileId = String(payload.cloneAudioFileId || payload.file_id || "").trim();
  const audioHash = String(payload.audioHash || payload.audio_sha256 || "").trim();
  const promptAudioFileId = String(payload.promptAudioFileId || "").trim();
  const promptText = String(payload.promptText || "").trim();
  const previewText = String(payload.previewText || payload.text || "").trim();
  const model = String(payload.model || config.minimax.ttsModel || "").trim();
  const name = String(payload.name || "").trim();

  if (audioHash) {
    const cachedVoice = await findCompletedVoiceCloneAssetByHash({ userId, audioHash });
    if (cachedVoice) {
      return {
        voice: mapSavedVoice(cachedVoice),
        demoAudio: cachedVoice.demoAudio || "",
        reused: true,
        points: 0
      };
    }

    try {
      await createVoiceCloneAssetProcessing({
        userId,
        audioHash,
        voiceId: normalizeVoiceId(payload.voiceId || payload.voice_id || `VoiceClone_${Date.now()}_${randomUUID().slice(0, 8)}`),
        voiceName: name,
        sourceFileName: payload.sourceFileName || payload.localName || "",
        sourceMimeType: payload.sourceMimeType || payload.mimeType || "",
        sourceSize: Number(payload.sourceSize || payload.size || 0),
        durationMs: normalizeDurationMs(payload.durationMs)
      });
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") throw error;

      const existing = await findVoiceCloneAssetByHash({ userId, audioHash });
      if (existing?.status === "completed") {
        return {
          voice: mapSavedVoice(existing),
          demoAudio: existing.demoAudio || "",
          reused: true,
          points: 0
        };
      }
      if (existing?.status === "failed" || existing?.status === "expired") {
        const retryStarted = await retryFailedVoiceCloneAssetProcessing({
          userId,
          audioHash,
          voiceId: normalizeVoiceId(payload.voiceId || payload.voice_id || `VoiceClone_${Date.now()}_${randomUUID().slice(0, 8)}`),
          voiceName: name,
          sourceFileName: payload.sourceFileName || payload.localName || "",
          sourceMimeType: payload.sourceMimeType || payload.mimeType || "",
          sourceSize: Number(payload.sourceSize || payload.size || 0),
          durationMs: normalizeDurationMs(payload.durationMs)
        });
        if (!retryStarted) {
          throw createHttpError("voice clone is already processing", 409);
        }
      } else {
        throw createHttpError("voice clone is already processing", 409);
      }
    }
  }

  if (!cloneAudioFileId) throw createHttpError("请上传复刻音频", 400);
  const voiceId = normalizeVoiceId(payload.voiceId || payload.voice_id);
  if (!previewText) throw createHttpError("请输入试听文本", 400);
  if (previewText.length > 1000) throw createHttpError("试听文本长度不能超过 1000 个字符", 400);
  if ((promptAudioFileId && !promptText) || (!promptAudioFileId && promptText)) {
    throw createHttpError("提示音频和提示文本需同时提供", 400);
  }

  const clonePoints = BILLING_RULES.voiceClonePoints;
  if (clonePoints > 0) {
    await chargeVoiceGeneration({ userId, memo: "voice clone debit", amount: clonePoints });
  }
  try {
    const result = await createCloneFromUpload({
      cloneAudioFileId,
      voiceId,
      promptAudioFileId,
      promptText,
      previewText,
      model,
      name
    });

    if (audioHash) {
      await completeVoiceCloneAsset({
        userId,
        audioHash,
        voiceId: result.voice.id,
        voiceName: result.voice.name,
        demoAudio: result.demoAudio,
        durationMs: normalizeDurationMs(payload.durationMs)
      });
    }

    return {
      ...result,
      reused: false,
      points: clonePoints
    };
  } catch (error) {
    await failVoiceCloneAsset({ userId, audioHash, errorMessage: error.message });
    if (clonePoints > 0) {
      await refundVoiceGeneration({ userId, memo: "voice clone refund", amount: clonePoints });
    }
    throw error;
  }
}

export async function synthesize(payload, userId) {
  const text = String(payload.text || "").trim();
  const voiceId = String(payload.voiceId || payload.voice_id || "").trim();
  if (!text) throw createHttpError("请输入合成文本", 400);
  if (!voiceId) throw createHttpError("请选择音色", 400);
  if (text.length > 2000) throw createHttpError("合成文本长度不能超过 2000 个字符", 400);

  const taskId = `voice-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const estimatedPoints = BILLING_RULES.voiceGenerationPoints;
  await chargeVoiceGeneration({ userId, memo: "voice synthesis debit", amount: estimatedPoints });

  try {
    const speech = await synthesizeMinimaxSpeech({
      text,
      voiceId,
      speed: normalizeNumber(payload.speed, 1),
      volume: normalizeNumber(payload.volume, 1),
      pitch: normalizeNumber(payload.pitch, 0),
      emotion: normalizeEmotion(payload.emotion)
    });

    const savedAudio = await saveMinimaxSpeechAudio({
      taskId,
      audioBuffer: speech.audioBuffer,
      featureDir: "voice"
    });

    const result = {
      id: taskId,
      title: text.slice(0, 48) || "语音合成结果",
      voiceId,
      voiceName: payload.voiceName || "",
      audioBase64: speech.audioBase64,
      audioDataUrl: `data:${speech.mimeType};base64,${speech.audioBase64}`,
      audioUrl: savedAudio.publicPath,
      durationMs: speech.durationMs,
      mimeType: speech.mimeType,
      points: estimatedPoints,
      price: `${estimatedPoints} 积分`,
      createdAt: formatBeijingDateTime()
    };

    await createVoiceSynthesisTaskRow({
      id: taskId,
      userId,
      title: result.title,
      voiceId,
      voiceName: result.voiceName,
      text,
      audioUrl: savedAudio.publicPath,
      durationMs: speech.durationMs,
      mimeType: speech.mimeType
    });

    return result;
  } catch (error) {
    await refundVoiceGeneration({ userId, memo: "voice synthesis refund", amount: estimatedPoints });
    throw error;
  }
}
