import { requestJson as request } from "../../api/request.js";
import { createTaskPollingController } from "../../api/taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;

export const enhanceApi = {
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
      modelsPromise = request("/api/enhance/models").catch((err) => {
        modelsPromise = undefined;
        return Promise.reject(err);
      });
    }
    return modelsPromise;
  },

  async uploadSource(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/enhance/uploads/source", {
      method: "POST",
      body: formData
    });
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/enhance/tasks?filter=${encodeURIComponent(filter)}`);
  },

  async createTask(payload) {
    const task = await request("/api/enhance/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/enhance/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/enhance/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  }
};
