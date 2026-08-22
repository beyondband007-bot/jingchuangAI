import { API_BASE } from "../../apiBase.js";
import { requestJson as request } from "../../api/request.js";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export const musicApi = {
  async getConfig() {
    return request("/api/music/config");
  },

  async getTasks() {
    const items = await request("/api/music/tasks");
    return items.map((item) => ({
      ...item,
      audioUrl: toApiUrl(item.audioUrl),
      coverUrl: toApiUrl(item.coverUrl)
    }));
  },

  async getTask(id) {
    const item = await request(`/api/music/tasks/${encodeURIComponent(id)}`);
    return {
      ...item,
      audioUrl: toApiUrl(item.audioUrl),
      coverUrl: toApiUrl(item.coverUrl)
    };
  },

  async generate({ prompt, title, cover, lyrics, isInstrumental, lyricsOptimizer }) {
    const result = await request("/api/music/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, title, cover, lyrics, isInstrumental, lyricsOptimizer })
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl),
      coverUrl: toApiUrl(result.coverUrl)
    };
  },

  async syncLyrics(id, { force = false } = {}) {
    const query = force ? "?force=1" : "";
    return request(`/api/music/tasks/${encodeURIComponent(id)}/sync-lyrics${query}`, {
      method: "POST"
    });
  },

  async deleteTask(id) {
    return request(`/api/music/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  async updateTaskCover(id, cover) {
    const item = await request(`/api/music/tasks/${encodeURIComponent(id)}/cover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover })
    });
    return {
      ...item,
      audioUrl: toApiUrl(item.audioUrl),
      coverUrl: toApiUrl(item.coverUrl)
    };
  },

  async updateTaskTitle(id, title) {
    const item = await request(`/api/music/tasks/${encodeURIComponent(id)}/title`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    return {
      ...item,
      audioUrl: toApiUrl(item.audioUrl),
      coverUrl: toApiUrl(item.coverUrl)
    };
  }
};
