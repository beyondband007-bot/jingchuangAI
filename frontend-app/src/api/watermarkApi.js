import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;

export const watermarkApi = {
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
    modelsPromise ||= request("/api/watermark/models");
    return modelsPromise;
  },

  async uploadSource(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/watermark/uploads/source", {
      method: "POST",
      body: formData
    });
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/watermark/tasks?filter=${encodeURIComponent(filter)}`);
  },

  async createTask(payload) {
    const task = await request("/api/watermark/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/watermark/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/watermark/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  }
};
