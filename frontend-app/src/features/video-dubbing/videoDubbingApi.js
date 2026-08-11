import { API_BASE } from "../../apiBase.js";
import { requestJson as request } from "../../api/request.js";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeTask(task) {
  if (!task || typeof task !== "object") return task;
  return {
    ...task,
    sourceUrl: toApiUrl(task.sourceUrl),
    thumbnailUrl: toApiUrl(task.thumbnailUrl),
    dubbing: task.dubbing
      ? { ...task.dubbing, audioUrl: toApiUrl(task.dubbing.audioUrl) }
      : task.dubbing,
    bgm: task.bgm
      ? { ...task.bgm, audioUrl: toApiUrl(task.bgm.audioUrl) }
      : task.bgm,
    result: task.result
      ? { ...task.result, videoUrl: toApiUrl(task.result.videoUrl) }
      : task.result
  };
}

export const videoDubbingApi = {
  async getConfig() {
    return request("/api/video-dub/config");
  },

  async getCredits() {
    return request("/api/me/credits");
  },

  async uploadVideo(file) {
    const formData = new FormData();
    formData.append("video", file);
    const task = await request("/api/video-dub/upload", {
      method: "POST",
      body: formData
    });
    return normalizeTask(task);
  },

  async createTask(payload) {
    const task = await request("/api/video-dub/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return normalizeTask(task);
  },

  async getTask(taskId) {
    const task = await request(`/api/video-dub/tasks/${taskId}`);
    return normalizeTask(task);
  },

  async deleteTask(taskId) {
    return request(`/api/video-dub/tasks/${taskId}`, { method: "DELETE" });
  },

  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const result = await request(`/api/video-dub/tasks${query ? `?${query}` : ""}`);
    if (Array.isArray(result)) return result.map(normalizeTask);
    return {
      ...result,
      tasks: Array.isArray(result.tasks) ? result.tasks.map(normalizeTask) : result.tasks
    };
  }
};
