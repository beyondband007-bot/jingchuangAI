const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3006";
const listeners = new Set();
let pollTimer;

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
  pollTimer = window.setInterval(() => {
    notify();
  }, 3000);
}

function stopPollingIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

export const imageApi = {
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
    return request("/api/image/models");
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/image/tasks?filter=${encodeURIComponent(filter)}`);
  },

  calculatePrice({ model, quality, count, models = [], qualities = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    const selectedQuality = qualities.find((item) => item.value === quality) || qualities[0];
    if (!selectedModel || !selectedQuality) return "¥0.00";
    return `¥${((selectedModel.basePoints * selectedQuality.multiplier * count) / 100).toFixed(2)}`;
  },

  getRandomPrompt() {
    const prompts = [
      "时尚斑马在水里吐泡泡，水下写实摄影，高级广告质感",
      "25-30岁中国女性深夜居家写实摄影，柔和台灯，电影感构图",
      "未来城市玻璃展厅里的蓝色鲸鱼装置，极简空间，真实摄影",
      "一只柯基在浅水里奔跑，水花飞溅，明亮自然光"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  },

  async createTask(payload) {
    const task = await request("/api/image/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/image/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/image/tasks/${id}/favorite`, { method: "POST" });
    notify();
    return task;
  },

  async regenerateTask(id) {
    const task = await request(`/api/image/tasks/${id}`);
    const created = await this.createTask({
      prompt: task.prompt,
      model: task.modelKey,
      ratio: task.ratio,
      quality: task.quality,
      count: task.count || 1
    });
    notify();
    return created;
  }
};
