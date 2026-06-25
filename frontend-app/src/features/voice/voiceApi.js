import { API_BASE } from "../../apiBase.js";
import { requestJson as request } from "../../api/request.js";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function uploadAudio(path, file, durationMs) {
  const formData = new FormData();
  formData.append("audio", file);
  if (durationMs) formData.append("durationMs", String(Math.round(durationMs)));
  return request(path, {
    method: "POST",
    body: formData
  });
}

export const voiceApi = {
  async getConfig() {
    return request("/api/voice/config");
  },

  async getVoices() {
    return request("/api/voice/voices");
  },

  async getTasks() {
    const items = await request("/api/voice/tasks");
    return items.map((item) => ({
      ...item,
      audioUrl: toApiUrl(item.audioUrl)
    }));
  },

  async uploadPromptAudio(file, durationMs) {
    return uploadAudio("/api/voice/uploads/prompt-audio", file, durationMs);
  },

  async uploadCloneAudio(file, durationMs) {
    return uploadAudio("/api/voice/uploads/clone-audio", file, durationMs);
  },

  async createClone(payload) {
    return request("/api/voice/clones", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async synthesize(payload) {
    const result = await request("/api/voice/synthesize", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl)
    };
  }
};
