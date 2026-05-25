import { requestJson as request } from "../../api/request.js";
const listeners = new Set();
let pollTimer;
let modelsPromise;
let creditsPromise;

function notify() {
  listeners.forEach((listener) => listener());
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = window.setInterval(notify, 3000);
}

function stopPollingIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

export const articleApi = {
  subscribe(listener) {
    listeners.add(listener);
    startPolling();
    return () => {
      listeners.delete(listener);
      stopPollingIfIdle();
    };
  },

  async getCredits() {
    creditsPromise ||= request("/api/me/credits");
    return creditsPromise;
  },

  async refreshCredits() {
    creditsPromise = request("/api/me/credits");
    return creditsPromise;
  },

  async getModels() {
    modelsPromise ||= request("/api/article/models");
    return modelsPromise;
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/article/tasks?filter=${encodeURIComponent(filter)}`);
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
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/article/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/article/tasks/${id}/favorite`, { method: "POST" });
    notify();
    return task;
  }
};
