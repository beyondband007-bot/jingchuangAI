const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3006";
const listeners = new Set();
let pollTimer;
let modelsPromise;
let creditsPromise;

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

export const videoApi = {
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

  async getModels() {
    modelsPromise ||= request("/api/video/models");
    return modelsPromise;
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/video/tasks?filter=${encodeURIComponent(filter)}`);
  },

  calculatePrice({ model, duration, count = 1, models = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    if (!selectedModel || !duration) return "0 积分";
    const points = selectedModel.priceUnit === "per_task"
      ? selectedModel.basePoints * count
      : selectedModel.basePoints * Number(duration) * count;
    return `${Math.ceil(points)} 积分`;
  },

  calculateRmb({ model, duration, count = 1, models = [] }) {
    const selectedModel = models.find((item) => item.value === model) || models[0];
    if (!selectedModel || !selectedModel.rmbPerSecond || !duration) return "";
    return `约 ¥${(selectedModel.rmbPerSecond * Number(duration) * count).toFixed(1)}`;
  },

  getRandomPrompt() {
    const prompts = [
      "一只雄鹰展翅翱翔在峡谷之上，镜头跟随飞翔，下方是蜿蜒的河流和红色岩石，阳光穿透云层",
      "年轻女性在清晨的卧室里伸懒腰，阳光透过白色窗帘洒进来，慢动作特写",
      "未来城市街道上无人机穿梭，霓虹灯闪烁，全息广告投射在雨后的路面",
      "核心主题：美少女火火拿着手机，在参考图场景讲解AI短视频服务，镜头稳定，画面清晰"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  },

  async createTask(payload) {
    const task = await request("/api/video/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/video/tasks/${id}`, { method: "DELETE" });
    notify();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/video/tasks/${id}/favorite`, { method: "POST" });
    notify();
    return task;
  },

  async regenerateTask(id) {
    const task = await request(`/api/video/tasks/${id}`);
    const created = await this.createTask({
      prompt: task.prompt,
      model: task.modelKey,
      ratio: task.ratio,
      duration: task.duration,
      mode: task.mode || "first-frame",
      count: task.count || 1
    });
    notify();
    return created;
  }
};
