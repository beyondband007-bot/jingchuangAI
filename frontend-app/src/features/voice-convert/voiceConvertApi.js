import { API_BASE } from "../../apiBase.js";

function toApiUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }

  return body;
}

export const voiceConvertApi = {
  async getTasks() {
    const items = await request("/api/voice-convert/tasks");
    return items.map((item) => ({
      ...item,
      audioUrl: toApiUrl(item.audioUrl)
    }));
  },

  async uploadTargetAudio(file, durationMs) {
    const formData = new FormData();
    formData.append("audio", file);
    if (durationMs) formData.append("durationMs", String(Math.round(durationMs)));
    return request("/api/voice-convert/uploads/target-audio", {
      method: "POST",
      body: formData
    });
  },

  async convert(payload) {
    const formData = new FormData();
    formData.append("sourceAudio", payload.sourceAudio);
    if (payload.cloneAudioFileId) formData.append("cloneAudioFileId", payload.cloneAudioFileId);
    if (payload.voiceId) formData.append("voiceId", payload.voiceId);
    if (payload.generatedVoiceId) formData.append("generatedVoiceId", payload.generatedVoiceId);
    if (payload.name) formData.append("name", payload.name);
    if (payload.sourceDurationMs) formData.append("sourceDurationMs", String(Math.round(payload.sourceDurationMs)));
    formData.append("speed", String(payload.speed ?? 1));
    formData.append("volume", String(payload.volume ?? 1));
    formData.append("pitch", String(payload.pitch ?? 0));

    const result = await request("/api/voice-convert/convert", {
      method: "POST",
      body: formData
    });
    return {
      ...result,
      audioUrl: toApiUrl(result.audioUrl)
    };
  }
};
