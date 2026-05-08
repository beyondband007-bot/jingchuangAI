const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3006";
const listeners = new Set();
let pollTimer;
let modelsPromise;
let voicesPromise;

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

function notify() {
  listeners.forEach((listener) => listener());
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = window.setInterval(notify, 3000);
}

function stopPollingIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

export const imageDigitalHumanApi = {
  subscribe(listener) {
    listeners.add(listener);
    startPolling();
    return () => {
      listeners.delete(listener);
      stopPollingIfIdle();
    };
  },

  async getCredits() {
    return request("/api/me/credits");
  },

  async getModels() {
    modelsPromise ||= request("/api/image-digital-human/models");
    return modelsPromise;
  },

  async getVoices() {
    voicesPromise ||= request("/api/image-digital-human/voices");
    return voicesPromise;
  },

  async previewVoice(payload) {
    return request("/api/image-digital-human/voices/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getTasks() {
    return request("/api/image-digital-human/tasks");
  },

  async createTask(payload) {
    const formData = new FormData();
    formData.append("portrait", payload.portrait);
    formData.append("text", payload.text);
    formData.append("voiceId", payload.voiceId);
    formData.append("model", payload.model);
    formData.append("speed", String(payload.speed));
    formData.append("volume", String(payload.volume));
    formData.append("pitch", String(payload.pitch));
    formData.append("emotion", payload.emotion || "");

    const task = await request("/api/image-digital-human/tasks", {
      method: "POST",
      body: formData
    });
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/image-digital-human/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async regenerateTask(id) {
    const task = await request(`/api/image-digital-human/tasks/${id}/regenerate`, { method: "POST" });
    notify();
    return task;
  }
};
