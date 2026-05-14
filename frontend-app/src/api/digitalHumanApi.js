import { API_BASE } from "../apiBase.js";
const listeners = new Set();
let pollTimer;
let modelsPromise;
let avatarsPromise;
let voicesPromise;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

export const digitalHumanApi = {
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
    modelsPromise ||= request("/api/digital-human/models");
    return modelsPromise;
  },

  async getAvatars() {
    avatarsPromise ||= request("/api/digital-human/avatars");
    return avatarsPromise;
  },

  async getVoices() {
    voicesPromise ||= request("/api/digital-human/voices");
    return voicesPromise;
  },

  async designVoice(payload) {
    const result = await request("/api/digital-human/voices/design", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    voicesPromise = undefined;
    notify();
    return result;
  },

  async previewVoice(payload) {
    return request("/api/digital-human/voices/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getTasks() {
    return request("/api/digital-human/tasks");
  },

  async createTask(payload) {
    const task = await request("/api/digital-human/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/digital-human/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async regenerateTask(id) {
    const task = await request(`/api/digital-human/tasks/${id}/regenerate`, { method: "POST" });
    notify();
    return task;
  },

  async createAvatar(payload) {
    const avatar = await request("/api/digital-human/avatars", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    avatarsPromise = undefined;
    notify();
    return avatar;
  },

  async updateAvatar(id, payload) {
    const avatar = await request(`/api/digital-human/avatars/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    avatarsPromise = undefined;
    notify();
    return avatar;
  },

  async deleteAvatar(id) {
    const result = await request(`/api/digital-human/avatars/${id}`, { method: "DELETE" });
    avatarsPromise = undefined;
    notify();
    return result;
  }
};
