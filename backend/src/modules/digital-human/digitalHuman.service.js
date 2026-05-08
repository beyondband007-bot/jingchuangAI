import { config } from "../../config/index.js";
import { designMinimaxVoice } from "../../providers/minimax/voiceDesign.js";
import { publicAvatars, digitalHumanModels, voices } from "./digitalHuman.data.js";

const tasks = [];
const myAvatars = [];
const designedVoices = [];

function nowLabel(date = new Date()) {
  return date.toLocaleString("zh-CN", { hour12: false });
}

function estimateSeconds({ text = "", audioName = "" }) {
  if (audioName) return 45;
  return Math.max(12, Math.min(180, Math.ceil(text.length / 4)));
}

function normalizeTask(task) {
  return {
    ...task,
    progress: task.status === "completed" ? 100 : task.status === "processing" ? Math.min(92, task.progress) : 0
  };
}

function refreshMockTasks() {
  const now = Date.now();
  for (const task of tasks) {
    if (task.status !== "processing") continue;
    const elapsed = now - task.createdAtMs;
    task.progress = Math.min(92, 18 + Math.floor(elapsed / 450));
    if (elapsed > 7000) {
      task.status = "completed";
      task.progress = 100;
      task.resultUrl = "";
      task.thumbnailUrl = "";
      task.completedAt = nowLabel();
    }
  }
}

export function getModels() {
  return {
    models: digitalHumanModels.map((model) => ({
      ...model,
      configured: model.value === "minimax-voice-design" ? Boolean(config.minimax.apiKey) : model.configured
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

  if (!prompt) {
    const error = new Error("prompt is required");
    error.status = 400;
    throw error;
  }
  if (!previewText) {
    const error = new Error("previewText is required");
    error.status = 400;
    throw error;
  }
  if (previewText.length > 500) {
    const error = new Error("previewText must be 500 characters or fewer");
    error.status = 400;
    throw error;
  }

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

export function listTasks() {
  refreshMockTasks();
  return tasks.map(normalizeTask);
}

export function getTask(id) {
  refreshMockTasks();
  const task = tasks.find((item) => item.id === id);
  return task ? normalizeTask(task) : null;
}

export function createTask(payload) {
  const {
    avatarId,
    avatarName = "",
    driveMode = "text",
    text = "",
    audioName = "",
    voiceId = voices[0].id,
    model = digitalHumanModels[0].value,
    speed = 1,
    volume = 50,
    pitch = 1
  } = payload;

  if (!avatarId) {
    const error = new Error("avatarId is required");
    error.status = 400;
    throw error;
  }
  if (driveMode === "text" && !text.trim()) {
    const error = new Error("text is required");
    error.status = 400;
    throw error;
  }
  if (driveMode === "audio" && !audioName) {
    const error = new Error("audioName is required");
    error.status = 400;
    throw error;
  }

  const voice = voices.find((item) => item.id === voiceId) || voices[0];
  const avatar = [...publicAvatars, ...myAvatars].find((item) => item.id === avatarId);
  const createdAt = nowLabel();
  const task = {
    id: `dh-${Date.now()}`,
    avatarId,
    avatarName: avatarName || avatar?.name || "未命名形象",
    voiceId,
    voiceName: voice.name,
    model,
    driveMode,
    text: text.trim(),
    audioName,
    speed: Number(speed),
    volume: Number(volume),
    pitch: Number(pitch),
    status: "processing",
    progress: 18,
    duration: estimateSeconds({ text, audioName }),
    costPoints: 30,
    resultUrl: "",
    thumbnailUrl: "",
    createdAt,
    completedAt: "",
    createdAtMs: Date.now()
  };
  tasks.unshift(task);
  return normalizeTask(task);
}

export function deleteTask(id) {
  const index = tasks.findIndex((item) => item.id === id);
  if (index >= 0) tasks.splice(index, 1);
  return { ok: index >= 0 };
}

export function regenerateTask(id) {
  const task = getTask(id);
  if (!task) return null;
  return createTask(task);
}

export function createAvatar(payload) {
  const { name, fileName = "" } = payload;
  if (!name?.trim()) {
    const error = new Error("name is required");
    error.status = 400;
    throw error;
  }

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
