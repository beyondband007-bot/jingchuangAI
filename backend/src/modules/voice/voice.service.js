import { randomUUID } from "crypto";
import { config } from "../../config/index.js";
import { cloneMinimaxVoice, uploadMinimaxVoiceFile } from "../../providers/minimax/voiceClone.js";
import { saveMinimaxSpeechAudio, synthesizeMinimaxSpeech } from "../../providers/minimax/tts.js";
import { createHttpError } from "../../shared/http.js";
import { createVoiceSynthesisTaskRow, listVoiceSynthesisTaskRows } from "./voice.repository.js";

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
  if (!file) throw createHttpError("audio file is required", 400);
  if (file.size > maxAudioBytes) throw createHttpError("audio file must be 20MB or smaller", 400);

  const mimeType = String(file.mimetype || "").toLowerCase();
  const ext = getExt(file.originalname);
  if (!allowedMimeTypes.has(mimeType) && !allowedExtensions.has(ext)) {
    throw createHttpError("audio file must be mp3, m4a, or wav", 400);
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
    throw createHttpError("prompt audio must be shorter than 8 seconds", 400);
  }

  if (purpose === "voice_clone" && (duration < 10000 || duration > 5 * 60 * 1000)) {
    throw createHttpError("clone audio must be between 10 seconds and 5 minutes", 400);
  }
}

function normalizeVoiceId(value = "") {
  const voiceId = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{7,255}$/.test(voiceId)) {
    throw createHttpError("voiceId must start with a letter and be 8-256 characters of letters, numbers, - or _", 400);
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

function displayTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
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
    createdAt: displayTime(row.created_at)
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
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
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

export async function listTasks(userId) {
  const rows = await listVoiceSynthesisTaskRows({ userId });
  return rows.map(mapVoiceTask);
}

export async function uploadAudio({ file, purpose, durationMs }) {
  assertAudioFile(file);
  assertDuration(purpose, durationMs);

  const result = await uploadMinimaxVoiceFile({
    buffer: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    purpose
  });

  return {
    ...result,
    durationMs: normalizeDurationMs(durationMs),
    localName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function createClone(payload) {
  const cloneAudioFileId = String(payload.cloneAudioFileId || payload.file_id || "").trim();
  const promptAudioFileId = String(payload.promptAudioFileId || "").trim();
  const promptText = String(payload.promptText || "").trim();
  const previewText = String(payload.previewText || payload.text || "").trim();
  const model = String(payload.model || config.minimax.ttsModel || "").trim();
  const name = String(payload.name || "").trim();

  if (!cloneAudioFileId) throw createHttpError("cloneAudioFileId is required", 400);
  const voiceId = normalizeVoiceId(payload.voiceId || payload.voice_id);
  if (!previewText) throw createHttpError("previewText is required", 400);
  if (previewText.length > 1000) throw createHttpError("previewText must be 1000 characters or fewer", 400);
  if ((promptAudioFileId && !promptText) || (!promptAudioFileId && promptText)) {
    throw createHttpError("promptAudioFileId and promptText must be provided together", 400);
  }

  const result = await createCloneFromUpload({
    cloneAudioFileId,
    voiceId,
    promptAudioFileId,
    promptText,
    previewText,
    model,
    name
  });

  return result;
}

export async function synthesize(payload, userId) {
  const text = String(payload.text || "").trim();
  const voiceId = String(payload.voiceId || payload.voice_id || "").trim();
  if (!text) throw createHttpError("text is required", 400);
  if (!voiceId) throw createHttpError("voiceId is required", 400);
  if (text.length > 2000) throw createHttpError("text must be 2000 characters or fewer", 400);

  const speech = await synthesizeMinimaxSpeech({
    text,
    voiceId,
    speed: normalizeNumber(payload.speed, 1),
    volume: normalizeNumber(payload.volume, 1),
    pitch: normalizeNumber(payload.pitch, 0),
    emotion: normalizeEmotion(payload.emotion)
  });

  const taskId = `voice-${Date.now()}-${randomUUID().slice(0, 8)}`;
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
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
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
}
