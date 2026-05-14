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
    throw new Error(body.error || body.message || `Request failed with ${response.status}`);
  }

  return body;
}

export const replicateApi = {
  async getTasks() {
    return request("/api/replicate/tasks");
  },

  async analyzeImage(file, fileName) {
    const formData = new FormData();
    formData.append("image", file, fileName);
    return request("/api/replicate/analyze-image", {
      method: "POST",
      body: formData
    });
  },

  async analyzeVideo(file, fileName) {
    const formData = new FormData();
    formData.append("video", file, fileName);
    return request("/api/replicate/analyze-video", {
      method: "POST",
      body: formData
    });
  }
};
