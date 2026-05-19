import { requestJson as request } from "./request.js";
const listeners = new Set();
let pollTimer;
let modelsPromise;

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

export const watermarkApi = {
  subscribe(listener) {
    listeners.add(listener);
    startPolling();
    return () => {
      listeners.delete(listener);
      stopPollingIfIdle();
    };
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
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/watermark/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/watermark/tasks/${id}/favorite`, { method: "POST" });
    notify();
    return task;
  }
};
