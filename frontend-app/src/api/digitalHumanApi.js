import { requestJson as request } from "./request.js";
import { API_BASE } from "../apiBase.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;
let avatarsPromise;
let voicesPromise;

function toApiUrl(url) {
  const value = String(url || "").trim();
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

export const digitalHumanApi = {
  subscribe(listener) {
    return taskPolling.subscribe(listener);
  },

  setHasRunningTasks(value) {
    taskPolling.setHasRunningTasks(value);
  },

  async getCredits() {
    return request("/api/me/credits");
  },

  async getModels() {
    if (!modelsPromise) {
      modelsPromise = request("/api/digital-human/models").catch((err) => {
        modelsPromise = undefined;
        return Promise.reject(err);
      });
    }
    return modelsPromise;
  },

  async getAvatars({ force = false } = {}) {
    if (force) avatarsPromise = undefined;
    if (!avatarsPromise) {
      avatarsPromise = request("/api/digital-human/avatars", force ? { cache: "no-store" } : {}).catch((err) => {
        avatarsPromise = undefined;
        return Promise.reject(err);
      });
    }
    return avatarsPromise;
  },

  async getVoices({ force = false } = {}) {
    if (force) voicesPromise = undefined;
    if (!voicesPromise) {
      voicesPromise = request("/api/digital-human/voices", force ? { cache: "no-store" } : {}).catch((err) => {
        voicesPromise = undefined;
        return Promise.reject(err);
      });
    }
    return voicesPromise;
  },

  async uploadVoiceCloneAudio(file, durationMs) {
    const formData = new FormData();
    formData.append("audio", file);
    if (durationMs) formData.append("durationMs", String(Math.round(durationMs)));
    return request("/api/digital-human/voices/uploads/clone-audio", {
      method: "POST",
      body: formData
    });
  },

  async createVoiceClone(payload) {
    const result = await request("/api/digital-human/voices/clones", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    voicesPromise = undefined;
    taskPolling.notifyNow();
    return result;
  },

  async designVoice(payload) {
    const result = await request("/api/digital-human/voices/design", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    voicesPromise = undefined;
    taskPolling.notifyNow();
    return result;
  },

  async previewVoice(payload) {
    const result = await request("/api/digital-human/voices/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl)
    };
  },

  async uploadAudio(file, { durationMs } = {}) {
    const formData = new FormData();
    formData.append("audio", file);
    if (durationMs) formData.append("durationMs", String(durationMs));
    return request("/api/digital-human/uploads/audio", {
      method: "POST",
      body: formData
    });
  },

  async uploadScene(file) {
    const formData = new FormData();
    formData.append("scene", file);
    const scene = await request("/api/digital-human/uploads/scene", {
      method: "POST",
      body: formData
    });
    return {
      ...scene,
      localUrl: toApiUrl(scene.localUrl || scene.url),
      url: toApiUrl(scene.url || scene.localUrl)
    };
  },

  async getTasks() {
    return request("/api/digital-human/tasks");
  },

  async createTask(payload) {
    const task = await request("/api/digital-human/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/digital-human/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async regenerateTask(id) {
    const task = await request(`/api/digital-human/tasks/${id}/regenerate`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  },

  async createAvatar(payload) {
    const formData = new FormData();
    formData.append("name", payload.name || "");
    if (payload.file) formData.append("avatar", payload.file);
    if (payload.scene) formData.append("scene", payload.scene);
    if (payload.performance) formData.append("performance", payload.performance);
    if (payload.voiceId) formData.append("voiceId", payload.voiceId);
    if (payload.voiceSpeed) formData.append("voiceSpeed", String(payload.voiceSpeed));
    if (payload.voiceEmotion) formData.append("voiceEmotion", payload.voiceEmotion);
    const avatar = await request("/api/digital-human/avatars", {
      method: "POST",
      body: formData
    });
    avatarsPromise = undefined;
    taskPolling.notifyNow();
    return avatar;
  },

  async createAiAvatar(payload) {
    const task = await request("/api/digital-human/avatars/ai-custom", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return task;
  },

  async getAiAvatarTask(id) {
    return request(`/api/digital-human/avatars/ai-custom/${id}`);
  },

  async saveAiAvatarTask(id, payload = {}) {
    const result = await request(`/api/digital-human/avatars/ai-custom/${id}/save`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    avatarsPromise = undefined;
    taskPolling.notifyNow();
    return result;
  },

  async updateAvatar(id, payload) {
    const avatar = await request(`/api/digital-human/avatars/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    avatarsPromise = undefined;
    taskPolling.notifyNow();
    return avatar;
  },

  async deleteAvatar(id) {
    const result = await request(`/api/digital-human/avatars/${id}`, { method: "DELETE" });
    avatarsPromise = undefined;
    taskPolling.notifyNow();
    return result;
  },

  async updateVoice(id, payload) {
    const voice = await request(`/api/digital-human/voices/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    voicesPromise = undefined;
    taskPolling.notifyNow();
    return voice;
  },

  async deleteVoice(id) {
    const result = await request(`/api/digital-human/voices/${id}`, { method: "DELETE" });
    voicesPromise = undefined;
    taskPolling.notifyNow();
    return result;
  }
};
