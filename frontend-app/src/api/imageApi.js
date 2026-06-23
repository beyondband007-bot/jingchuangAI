import { requestJson as request } from "./request.js";
import { createTaskPollingController } from "./taskPolling.js";
const taskPolling = createTaskPollingController();
let modelsPromise;
let creditsPromise;
export const imageToImageModelKey = "gpt_image_1_5_i2i";
export const gptImage2ImageToImageModelKey = "gpt_image_2_i2i";

export const imageApi = {
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
    modelsPromise ||= request("/api/image/models");
    return modelsPromise;
  },

  async getTasks({ filter = "all" } = {}) {
    return request(`/api/image/tasks?filter=${encodeURIComponent(filter)}`);
  },

  async getInspirationFavorites() {
    return request("/api/image/inspiration-favorites");
  },

  async toggleInspirationFavorite(id) {
    return request(`/api/image/inspiration-favorites/${encodeURIComponent(id)}`, {
      method: "POST"
    });
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
      "一只背着行囊的旅鼠，站在蒲公英花田里，举着指南针仰望星空，星空中有一颗巨大的蒲公英种子飞船。",
      "复古未来主义的书店，空中漂浮着发光的书籍，窗外是火星红色沙漠，一位机器人正在品茶阅读。",
      "一只穿西服的章鱼在指挥交响乐团，乐器都是海洋生物形状，观众席坐满了戴礼帽的企鹅，灯光是水母发出的。",
      "深夜的霓虹雨林，机械鹦鹉栖息在发光的藤蔓上，一只金属狐狸踩着落叶，落叶溅起的是数字水花。",
      "废弃的太空站里，一位陶瓷质地的宇航员坐在舷窗边，窗外的星云汇聚成一只发光的鲸鱼形状。",
      "蒸汽朋克风格的蜂巢，蜜蜂戴着黄铜护目镜，在齿轮与管道之间穿梭，蜂蜜从铜制龙头滴入玻璃瓶。",
      "漂浮的图书馆岛，书本长成树木的样子，猫头鹰管理员推着手推车，云朵是可翻阅的羊皮纸。",
      "糖果色的海底夜市，水母提着纸灯笼，章鱼在烧烤摊前翻转章鱼烧，小丑鱼用气泡支付交易。",
      "丝绸质感的液体在花瓣间缓慢流淌，颜色从粉金渐变到深蓝，表面偶尔闪出星点微光。",
      "一只纸折的蓝鸟在一片枯萎的机械森林中扇动翅膀飞起，羽毛飘落时化为发光的数据碎片。",
      "旧钢琴内部特写，琴弦被水滴连续触碰，每次滴落都绽放出一朵微小的荧光花，音波可见。",
      "一只陶瓷茶杯裂开细纹，裂纹中渗出金色的光，光流缓慢包裹杯身，最终复原如初。",
      "月光下的沙漠中央，一座玻璃金字塔悬浮半空，内部盛开着巨大的发光仙人掌花。",
      "老式理发店的红白蓝转灯，旋转时飘出彩色的音符，地面上躺着一把旧木吉他。",
      "冬天的小镇，每一栋房子的烟囱都在吐出不同颜色的烟雾，形状像各种童话动物。",
      "深海里一位穿着维多利亚裙装的美人鱼，举着珍珠镶嵌的复古相机，拍摄发光的珊瑚礁。",
      "末日后的游乐园，摩天轮长满了藤蔓，旋转木马上坐着的是一群发光的幽灵孩童。",
      "中式庭院里，棋盘上的棋子自行移动，每一颗棋子落下时溅起一滴墨色的水花。",
      "巨大的图书馆中央，一架古老的望远镜指向天花板，天花板上绘着会缓慢转动的星空。",
      "雨后的小巷，积水倒映出另一个世界的景象，有飞行的船只和穿斗篷的行人。",
      "一间开在云朵上的咖啡馆，客人都是鸟类，猫头鹰服务生端着冒着星光的咖啡杯。",
      "秋天的森林里，一只狐狸的尾巴扫过落叶，落叶没有落地而是飘向了空中的月亮。",
      "废弃工厂内，所有机器都已经生锈，只有一盏吊灯还亮着，照亮地上一张黑白照片。",
      "雪山之巅的温泉，水里泡着几只穿浴袍的企鹅，旁边是冒着热气的茶杯和寿司拼盘。",
      "城市高楼的玻璃幕墙上，一只巨大的章鱼吸附着，触手伸进打开的窗户取走书和台灯。",
      "一片向日葵花田，每朵向日葵的脸都是时钟表盘，指针全部指向三点整。",
      "古埃及神庙里，法老的黄金面具碎裂，裂缝中长出蓝色的荧光莲花，花瓣上坐着小人。",
      "深夜的便利店，门口睡着一只流浪猫，猫的梦里投射出巨大的彩色泡泡，泡泡里有鱼和毛线球。",
      "一座全是钟表零件的岛屿，海浪是齿轮咬合的声音，天空中有巨大的发条钥匙缓缓旋转。",
      "晚霞里的麦田，一个稻草人戴着耳机，电线杆上停着五只不同颜色的鹦鹉，都在看同一本书。",
      "地下的蘑菇森林，蘑菇的菌丝连接着老式电话机，两个蘑菇之间正在传递一封手写信。",
      "冰雪覆盖的游轮甲板上，一只北极熊穿着侍者制服，推着餐车，餐车上摆满了热红酒和杯子。",
      "破碎的相框里，画面还在动，里面的人正在努力修补相框的裂缝，试图爬出来。",
      "一个完全由玻璃制成的房间，里面下着雨，雨滴落在玻璃地板上开出一朵朵冰晶玫瑰。",
      "黄昏的公路上，一辆老爷车的后备箱打开，里面是一个完整的微型小镇，灯火通明。",
      "古老的石拱门下，一位穿斗篷的影子伸出手，掌心是一只正在发光的小小太阳。",
      "海底沉船的书房里，书架上的书还在翻页，翻页时冒出的气泡里是书中的插画场景。",
      "清晨的农贸市场，蔬菜水果会自己叫卖，一颗番茄举着喇叭喊道“我今天刚摘的”。",
      "太空中的花园，宇航员的头盔面罩上爬满了藤蔓和玫瑰，她在里面闭着眼睛微笑。",
      "老式电视机的屏幕上是一片雪白，雪花点逐渐凝聚成一个穿黑白连衣裙的女人的轮廓。",
      "河边的洗衣石上，一只青蛙穿着人类的小西装，手里拿着怀表，焦急地等待什么。",
      "巨大的沙漏里，上半部分的沙子是夜晚的星空，流下去变成白天的草原。",
      "冬天街头的电话亭里，话筒悬挂着，听筒里飘出的不是声音而是温暖的橘色光雾。",
      "一个被藤蔓覆盖的巨大收音机，喇叭里传出鸟鸣声和河流声，旋钮上站着一只蝴蝶。",
      "深夜的画室里，画笔自己悬浮着画画，画布上的人物正伸出手想要握住那支画笔。",
      "夕阳下的芦苇丛，风把芦苇吹成了竖琴的形状，空中有金色的音符像萤火虫一样飞舞。",
      "一个巨大的肥皂泡里装着一整座小镇，小镇里的人抬头就能看到外面放大的世界。",
      "古老的城堡的庭院里，一口枯井里传出钢琴声，往下看，井底有一架发光的三角钢琴。",
      "早高峰的地铁里，所有人都拿着书本阅读，车厢的灯是蜡烛的形状，安静而缓慢。",
      "一个装满旧照片的铁盒打开，照片里的人开始挥手、微笑、走动，像微缩的电影院。"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  },

  async createTask(payload) {
    const task = await request("/api/image/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    taskPolling.notifyNow();
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
    taskPolling.notifyNow();
    return result;
  },

  async toggleFavorite(id) {
    const task = await request(`/api/image/tasks/${id}/favorite`, { method: "POST" });
    taskPolling.notifyNow();
    return task;
  },

  async regenerateTask(id, overrides = {}) {
    const task = await request(`/api/image/tasks/${id}`);
    const created = await this.createTask({
      prompt: task.prompt,
      model: task.modelKey,
      ratio: task.ratio,
      quality: task.quality,
      count: task.count || 1,
      referenceImageUrl: task.referenceImageUrl || null,
      ...overrides
    });
    taskPolling.notifyNow();
    return created;
  }
};
