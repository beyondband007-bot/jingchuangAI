import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;
let creditsPromise;

export const videoApi = {
  subscribe(listener) {
    return taskPolling.subscribe(listener);
  },

  setHasRunningTasks(value) {
    taskPolling.setHasRunningTasks(value);
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
    return `约 ￥${(selectedModel.rmbPerSecond * Number(duration) * count).toFixed(1)}`;
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
    taskPolling.notifyNow();
    return task;
  },

  async deleteTask(id) {
    const result = await request(`/api/video/tasks/${id}`, { method: "DELETE" });
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/video/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
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
    taskPolling.notifyNow();
    return created;
  }
};
