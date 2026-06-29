import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;
let avatarsPromise;
let voicesPromise;

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
    modelsPromise ||= request("/api/digital-human/models");
    return modelsPromise;
  },

  async getAvatars() {
    avatarsPromise ||= request("/api/digital-human/avatars");
    return avatarsPromise;
  },

  async getVoices() {
    voicesPromise ||= request("/api/digital-human/voices");
    return voicesPromise;
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
    return request("/api/digital-human/voices/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
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
    return request("/api/digital-human/uploads/scene", {
      method: "POST",
      body: formData
    });
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
  }
};
