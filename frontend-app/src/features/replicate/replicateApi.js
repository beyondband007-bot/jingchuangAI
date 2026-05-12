const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3006";

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