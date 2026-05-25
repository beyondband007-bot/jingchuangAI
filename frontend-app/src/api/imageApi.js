import { requestJson as request } from "./request.js";
const listeners = new Set();
let pollTimer;
let modelsPromise;
let creditsPromise;
export const imageToImageModelKey = "gpt_image_1_5_i2i";
export const gptImage2ImageToImageModelKey = "gpt_image_2_i2i";

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
    creditsPromise ||= request("/api/me/credits");
    return creditsPromise;
  },

  async refreshCredits() {
    creditsPromise = request("/api/me/credits");
    return creditsPromise;
  },

  async getModels() {
    modelsPromise ||= request("/api/image/models");
    return modelsPromise;
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/image/tasks?filter=${encodeURIComponent(filter)}`);
  },

  calculatePrice({ model, quality, count, models = [], qualities = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    const selectedQuality = qualities.find((item) => item.value === quality) || qualities[0];
    if (!selectedModel || !selectedQuality) return "0 积分";
    return `${Math.ceil(selectedModel.basePoints * selectedQuality.multiplier * count)} 积分`;
  },

  calculatePriceDetail({ model, quality, count, models = [], qualities = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    const selectedQuality = qualities.find((item) => item.value === quality) || qualities[0];
    if (!selectedModel || !selectedQuality) return "扣费标准：模型基础积分 × 清晰度倍率 × 张数";
    return `扣费标准：${selectedModel.basePoints} × ${selectedQuality.multiplier} × ${count} = ${Math.ceil(selectedModel.basePoints * selectedQuality.multiplier * count)} 积分`;
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

  async uploadReference(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/image/uploads/reference", {
      method: "POST",
      body: formData
    });
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
      count: task.count || 1,
      referenceImageUrl: task.referenceImageUrl || null
    });
    notify();
    return created;
  }
};
