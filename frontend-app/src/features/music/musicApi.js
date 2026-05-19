import { API_BASE } from "../../apiBase.js";
import { requestJson as request } from "../../api/request.js";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export const musicApi = {
  async getTasks() {
    const items = await request("/api/music/tasks");
    return items.map((item) => ({
      ...item,
      audioUrl: toApiUrl(item.audioUrl)
    }));
  },

  async generate({ prompt, lyrics, model = "music-2.6-free", isInstrumental, lyricsOptimizer }) {
    const result = await request("/api/music/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, lyrics, model, isInstrumental, lyricsOptimizer })
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl)
    };
  }
};
