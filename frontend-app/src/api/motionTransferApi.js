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

async function uploadAsset(path, fieldName, file) {
  const formData = new FormData();
  formData.append(fieldName, file);
  return request(path, {
    method: "POST",
    body: formData
  });
}

export const motionTransferApi = {
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
    modelsPromise ||= request("/api/motion-transfer/models");
    return modelsPromise;
  },

  async uploadImage(file) {
    return uploadAsset("/api/motion-transfer/uploads/image", "image", file);
  },

  async uploadVideo(file) {
    return uploadAsset("/api/motion-transfer/uploads/video", "video", file);
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/motion-transfer/tasks?filter=${encodeURIComponent(filter)}`);
  },

  async createTask(payload) {
    const task = await request("/api/motion-transfer/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/motion-transfer/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/motion-transfer/tasks/${id}/favorite`, { method: "POST" });
    notify();
    return task;
  }
};
