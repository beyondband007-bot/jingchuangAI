import { requestJson as request } from "../../api/request.js";
import { createTaskPollingController } from "../../api/taskPolling.js";
import { getCachedCredits, refreshCachedCredits } from "../../api/creditsCache.js";
const taskPolling = createTaskPollingController();
let modelsPromise;

export const articleApi = {
  subscribe(listener) {
    return taskPolling.subscribe(listener);
  },

  setHasRunningTasks(value) {
    taskPolling.setHasRunningTasks(value);
  },

  async getCredits() {
    return getCachedCredits();
  },

  async refreshCredits() {
    return refreshCachedCredits();
  },

  async getModels() {
    if (!modelsPromise) {
      modelsPromise = request("/api/article/models").catch((err) => {
        modelsPromise = undefined;
        return Promise.reject(err);
      });
    }
    return modelsPromise;
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/article/tasks?filter=${encodeURIComponent(filter)}`);
  },

  async createCopyDraft(payload) {
    return request("/api/article/copy-draft", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async uploadReferenceImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/image/uploads/reference", {
      method: "POST",
      body: formData
    });
  },

  async createPackage(payload) {
    const item = await request("/api/article/packages", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return item;
  },

  async getPackage(id) {
    return request(`/api/article/packages/${encodeURIComponent(id)}`);
  },

  calculatePrice({ model, quality, count, models = [], qualities = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    const selectedQuality = qualities.find((item) => item.value === quality) || qualities[0];
    if (!selectedModel || !selectedQuality) return "0 积分";
    return `${Math.ceil(selectedModel.basePoints * selectedQuality.multiplier * count)} 积分`;
  },

  async createTask(payload) {
    const task = await request("/api/article/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/article/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/article/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  }
};
