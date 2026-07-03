import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;

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
      modelsPromise = request("/api/motion-transfer/models").catch((err) => {
        modelsPromise = undefined;
        return Promise.reject(err);
      });
    }
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
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/motion-transfer/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/motion-transfer/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  }
};
