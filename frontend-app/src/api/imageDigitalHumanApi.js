import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;
let voicesPromise;

export const imageDigitalHumanApi = {
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
    modelsPromise ||= request("/api/image-digital-human/models");
    return modelsPromise;
  },

  async getVoices() {
    voicesPromise ||= request("/api/image-digital-human/voices");
    return voicesPromise;
  },

  async previewVoice(payload) {
    return request("/api/image-digital-human/voices/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getTasks() {
    return request("/api/image-digital-human/tasks");
  },

  async createTask(payload) {
    const formData = new FormData();
    formData.append("portrait", payload.portrait);
    formData.append("text", payload.text);
    formData.append("voiceId", payload.voiceId);
    formData.append("model", payload.model);
    formData.append("speed", String(payload.speed));
    formData.append("volume", String(payload.volume));
    formData.append("pitch", String(payload.pitch));
    formData.append("emotion", payload.emotion || "");

    const task = await request("/api/image-digital-human/tasks", {
      method: "POST",
      body: formData
    });
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/image-digital-human/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async regenerateTask(id) {
    const task = await request(`/api/image-digital-human/tasks/${id}/regenerate`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  }
};
