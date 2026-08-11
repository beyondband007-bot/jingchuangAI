// Static choices used by the article workbench editor and result preview.
export const platformTabs = [
  "小红书种草",
  "抖音封面",
  "视频号封面",
  "公众号头图",
];
export const morePlatformOptions = [
  "朋友圈海报",
  "B站封面",
  "知乎图文",
  "商品详情长图",
];
export const copyTemplatesByPlatform = {
  小红书种草: ["完整图文模板", "测评种草模板", "清单攻略模板", "教程拆解模板"],
  抖音封面: [
    "短视频钩子标题模板",
    "带货痛点标题",
    "短视频口播脚本",
    "3 秒开头文案",
  ],
  视频号封面: ["观点金句封面", "直播预告封面", "知识栏目标题", "人物访谈封面"],
  公众号头图: ["深度文章头图", "活动推文头图", "品牌资讯头图", "干货合集头图"],
  更多: ["朋友圈海报文案", "商品详情长图", "B 站封面标题", "知乎图文摘要"],
};
export const wordCounts = ["短文案", "适中", "长笔记"];
export const copyTones = ["种草口语风", "干货测评风", "温柔分享风", "简洁硬广风"];
export const ratios = ["3:4", "1:1", "4:3", "9:16", "16:9"];
export const imageCounts = [1, 2, 3, 4];
export const fallbackModelOptions = [
  { value: "nano_banana2", label: "Facemini Banana 2" },
  { value: "nano_banana_pro", label: "Facemini Banana Pro" },
  { value: "gpt_image_2", label: "Facemini Image 2" },
  { value: "seedream_45", label: "Seedream 4.5" },
];

export const popularSteps = [
  { num: 1, label: "选择平台 & 创作主题" },
  { num: 2, label: "AI 生成种草文案" },
  { num: 3, label: "配图风格与版式配置" },
];

export const quickTemplates = [
  {
    id: "single-product-review",
    title: "《单品测评种草》",
    subtitle: "单品实测 · 闺蜜安利风",
    image: "/assets/article/quick-templates/template-1.webp",
    copyTemplate: "测评种草模板",
    topic: "平价单品真实实测分享，突出产品质地、使用感受、外观细节与性价比，适合早八人、学生党日常种草测评，输出小红书吸睛标题 + 闺蜜安利式短种草正文，附带实用避坑小贴士与垂直好物话题标签",
    tone: "种草口语风"
  },
  {
    id: "mom-baby-review",
    title: "《母婴好物实测》",
    subtitle: "宝妈实测 · 温柔分享风",
    image: "/assets/article/quick-templates/template-2.webp",
    copyTemplate: "测评种草模板",
    topic: "宝妈自用母婴好物真实测评，重点突出材质安全、带娃减负、使用便捷性，温柔真实分享风格，适配新手宝妈种草笔记，附带母婴选购避坑提醒与母婴垂直话题标签",
    tone: "温柔分享风"
  },
  {
    id: "sensitive-skin-list",
    title: "《敏感肌护肤合集》",
    subtitle: "换季维稳 · 干货清单风",
    image: "/assets/article/quick-templates/template-3.webp",
    copyTemplate: "清单攻略模板",
    topic: "换季敏感肌全套护肤好物合集，分别讲解每款护肤品补水、舒缓、修护屏障核心功效，干货清单式排版，分享长期维稳护肤心得，附带护肤叠加避坑指南与护肤赛道话题标签",
    tone: "干货测评风"
  },
  {
    id: "kitchen-appliance-list",
    title: "《厨房小家电合集》",
    subtitle: "小户型厨房 · 生活种草风",
    image: "/assets/article/quick-templates/template-4.webp",
    copyTemplate: "清单攻略模板",
    topic: "小户型租房党厨房小家电全套合集，突出机身小巧不占地、操作简单易清洗、三餐多场景适配，生活化接地气种草，附带家电保养清洁小贴士与家居好物话题标签",
    tone: "种草口语风"
  },
  {
    id: "digital-accessory-review",
    title: "《平价数码配件测评》",
    subtitle: "百元平替 · 干货测评风",
    image: "/assets/article/quick-templates/template-5.webp",
    copyTemplate: "测评种草模板",
    topic: "高性价比手机、电脑数码配件单品实测，突出续航、质感、实用功能，对比百元平替与大牌差异，学生党、打工人刚需，附带数码选购避坑提醒",
    tone: "干货测评风"
  },
  {
    id: "pet-care-list",
    title: "《猫狗宠物养护好物》",
    subtitle: "新手养宠 · 温柔分享风",
    image: "/assets/article/quick-templates/template-6.webp",
    copyTemplate: "清单攻略模板",
    topic: "新手养猫养狗全套养护好物清单，侧重安全无刺激、清洁省力，分喂食、洗护、玩具类单品讲解，真实养宠实测分享，附带宠物用品选购避坑贴士",
    tone: "温柔分享风"
  }
];

export const contentTypes = [
  {
    id: "xiaohongshu-cover",
    label: "小红书封面",
    image: "/assets/article/template-thumbs/小红书封面.png",
  },
  {
    id: "knowledge-card",
    label: "知识卡片",
    image: "/assets/article/template-thumbs/知识卡片.png",
  },
  {
    id: "quote-poster",
    label: "金句海报",
    image: "/assets/article/template-thumbs/金句海报.png",
  },
  {
    id: "tutorial",
    label: "步骤教程图",
    image: "/assets/article/template-thumbs/步骤教程.png",
  },
  {
    id: "product-card",
    label: "产品卖点图",
    image: "/assets/article/template-thumbs/产品卖点.png",
  },
  {
    id: "comparison",
    label: "对比分析图",
    image: "/assets/article/template-thumbs/对比分析.png",
  },
];

export const layoutStyles = [
  {
    id: "balanced",
    label: "均衡",
    image: "/assets/article/template-thumbs/均衡.png",
  },
  {
    id: "spacious",
    label: "留白",
    image: "/assets/article/template-thumbs/留白.png",
  },
  {
    id: "dense",
    label: "密集",
    image: "/assets/article/template-thumbs/密集.png",
  },
  {
    id: "list",
    label: "列表",
    image: "/assets/article/template-thumbs/列表.png",
  },
  {
    id: "contrast",
    label: "对比",
    image: "/assets/article/template-thumbs/对比.png",
  },
  {
    id: "flow",
    label: "流程",
    image: "/assets/article/template-thumbs/流程.png",
  },
];

export const defaultForm = {
  platform: "小红书种草",
  copyTemplate: "",
  topic: "",
  wordCount: "短文案",
  tone: "种草口语风",
  contentType: "xiaohongshu-cover",
  visualStyle: "fresh",
  layoutStyle: "balanced",
  ratio: "3:4",
  imageCount: 1,
  quality: "2K",
};
