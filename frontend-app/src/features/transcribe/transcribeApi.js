import { API_BASE } from "../../apiBase.js";

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

export const transcribeApi = {
  async getTasks() {
    return request("/api/transcribe/tasks");
  },

  async transcribe(file, durationMs) {
    const formData = new FormData();
    formData.append("audio", file);
    if (durationMs) formData.append("durationMs", String(Math.round(durationMs)));

    return request("/api/transcribe", {
      method: "POST",
      body: formData
    });
  }
};
