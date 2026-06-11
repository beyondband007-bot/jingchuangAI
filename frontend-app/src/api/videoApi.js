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
      "未来科技城市夜景，霓虹灯闪烁，高楼林立，飞行汽车穿梭天空，镜头缓慢向前推进，电影级光影，超高清画质",
      "一辆黑色超级跑车停在现代科技展厅中央，镜头环绕车身360度展示，车漆反射高级灯光，商业广告质感",
      "金色神龙穿梭云海之间，远处群山若隐若现，阳光穿透云层洒下金光，镜头跟随飞行，震撼史诗感",
      "宇航员行走在未知星球表面，天空悬挂两颗巨大星球，镜头环绕拍摄，科幻大片风格",
      "少女站在盛开的樱花树下，花瓣随风飘落，微风吹动长发，镜头缓慢拉近，唯美电影感",
      "深海世界中五彩珊瑚随水流摆动，大量发光水母漂浮，镜头穿梭其中，梦幻氛围",
      "火焰中一只金色凤凰展翅飞起，羽毛燃烧着神圣火焰，火星四溅，史诗级特效",
      "狼群奔跑在雪山之巅，雪花飞扬，无人机航拍视角，壮丽自然风光",
      "未来机器人在实验室中启动，蓝色能量流动，全息投影浮现，科幻电影质感",
      "一列发光列车穿梭于银河之间，周围星云流转，镜头平稳跟拍，梦幻童话风格",
      "雨夜东京街头，霓虹灯映照湿润路面，行人撑伞穿行，电影级镜头语言",
      "神秘森林中发光蘑菇遍布地面，萤火虫漫天飞舞，镜头缓慢穿行，奇幻氛围浓厚",
      "冰雪女王走出水晶宫殿，雪花环绕飞舞，镜头由远及近，梦幻史诗风格",
      "夕阳下的沙漠商队缓慢前行，金色沙丘绵延起伏，无人机俯拍镜头",
      "巨大的蓝鲸在云海中游动，下方悬浮着梦幻城市，镜头跟随鲸鱼飞行",
      "可爱熊猫在古代庭院练习武术，动作流畅自然，动画电影风格",
      "红色巨龙从火山熔岩中冲天而起，岩浆喷发，镜头快速拉远展现全景",
      "仙人御剑飞行穿越群山云海，仙气缭绕，镜头跟随飞行轨迹，国风大片感",
      "赛博朋克少女站在未来都市天台，霓虹灯光映照脸庞，镜头缓慢环绕，科技感十足",
      "一只橘猫坐在温馨咖啡馆窗边，阳光透过玻璃洒落，镜头慢慢推进，治愈系风格",
      "一座漂浮在云海之上的未来天空之城，瀑布从空中倾泻而下，飞行器穿梭于建筑之间，镜头从云层中穿出缓缓升高，阳光洒满整座城市，宏大震撼，电影级特效，超高清画质",
      "一位探险家手持火把走进尘封千年的地下古墓，墙壁上的符文逐渐发出金色光芒，机关缓缓启动，镜头跟随人物深入遗迹，气氛紧张神秘，电影大片质感，超真实细节"
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
