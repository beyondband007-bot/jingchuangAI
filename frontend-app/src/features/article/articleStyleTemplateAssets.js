import manifest from "./articleStyleTemplateManifest.json";

const STYLE_TEMPLATE_BASE = "/assets/爆款图文模板";

const STYLE_TEMPLATE_COPY = {
  fresh: [
    ["今日份小确幸", "适合咖啡、鲜花、早餐和轻生活分享，用干净画面放大日常里的治愈感。", ["小红书", "日常", "治愈"]],
    ["清爽好物安利", "适合护肤、家清、母婴等轻种草内容，卖点表达柔和，画面更有呼吸感。", ["种草", "清爽", "好物"]],
    ["温柔生活清单", "适合合集、攻略和周末计划类笔记，让用户快速看懂内容主题和情绪氛围。", ["清单", "生活", "分享"]],
    ["轻盈开箱记录", "适合新品开箱、桌面布置和生活方式内容，视觉干净，标题识别度高。", ["开箱", "新品", "简洁"]],
  ],
  cute: [
    ["可爱好物集合", "适合零食、美妆、文具和萌系用品，用明快色彩强化亲和力和点击欲。", ["可爱", "好物", "少女感"]],
    ["甜感种草笔记", "适合低门槛安利和日常分享，标题轻松，画面更容易传达快乐情绪。", ["甜感", "种草", "日常"]],
    ["萌趣清单攻略", "适合合集类内容，把多个卖点做成轻巧模块，信息明确但不显得沉重。", ["清单", "攻略", "萌趣"]],
    ["元气开箱时刻", "适合新品、礼物和盲盒类内容，突出惊喜感，让用户愿意继续往下看。", ["元气", "开箱", "礼物"]],
  ],
  minimal: [
    ["极简好物指南", "适合家居、数码和效率工具，用克制排版突出核心卖点，阅读负担更低。", ["极简", "指南", "效率"]],
    ["一页看懂重点", "适合测评、对比和知识卡片，把复杂信息收束成清晰层级，方便快速扫读。", ["干货", "对比", "清晰"]],
    ["高级感种草页", "适合美妆、香氛和生活方式内容，留白更足，整体更像品牌视觉。", ["高级感", "品牌", "种草"]],
    ["干净标题封面", "适合标题驱动的图文封面，弱化装饰，强化主题本身的可信度。", ["封面", "标题", "留白"]],
  ],
  bold: [
    ["生活碎片收集", "适合咖啡、日落、好书和通勤小确幸，用强对比画面抓住第一眼。", ["小红书", "日常", "吸睛"]],
    ["小家电真香合集", "适合厨电、收纳和租房好物，信息密度高，卖点表达更直接有冲击力。", ["家居", "合集", "种草"]],
    ["宝藏小物清单", "适合美妆、数码、家清等多品类合集，用大标题和分区增强记忆点。", ["清单", "好物", "强视觉"]],
    ["今日份爆款封面", "适合需要高点击率的封面图，标题更醒目，适合活动、测评和带货内容。", ["封面", "爆款", "高点击"]],
  ],
  handdrawn: [
    ["手账灵感记录", "适合旅行、美食、学习和生活复盘，用手绘感让内容更轻松亲近。", ["手账", "灵感", "记录"]],
    ["周末计划清单", "适合攻略、打卡和计划类笔记，像手写便签一样把步骤讲得更自然。", ["计划", "攻略", "打卡"]],
    ["生活观察笔记", "适合个人经验、心得和好物分享，语气更像朋友之间的认真推荐。", ["笔记", "生活", "分享"]],
    ["轻松教程拆解", "适合步骤教程和避坑内容，用插画感降低理解压力，适合收藏型图文。", ["教程", "避坑", "收藏"]],
  ],
  retro: [
    ["复古生活提案", "适合咖啡、书店、穿搭和家居内容，用怀旧色调制造更强的故事感。", ["复古", "生活", "氛围"]],
    ["旧时光好物志", "适合质感单品、香氛和文创内容，画面更有温度，适合慢节奏种草。", ["好物", "质感", "慢生活"]],
    ["胶片感探店封面", "适合探店、美食和城市漫游，用复古视觉增强地点记忆和情绪浓度。", ["探店", "胶片", "城市"]],
    ["怀旧清单合集", "适合清单、回顾和主题集合，让多张内容形成统一的复古视觉系列。", ["清单", "合集", "系列"]],
  ],
  notion: [
    ["知识卡片整理", "适合教程、方法论和学习笔记，用模块化排版让重点一眼可见。", ["知识", "卡片", "整理"]],
    ["效率工具清单", "适合软件、数码和办公用品推荐，结构清楚，适合干货型用户收藏。", ["效率", "工具", "干货"]],
    ["一页式攻略", "适合流程、步骤和攻略内容，把复杂信息拆成可扫描的小模块。", ["攻略", "流程", "收藏"]],
    ["理性测评总结", "适合测评、对比和观点输出，视觉克制，让内容显得更可靠。", ["测评", "对比", "理性"]],
  ],
  blackboard: [
    ["课堂感知识点", "适合科普、课程和干货拆解，用黑板式层级强化重点和学习感。", ["知识", "课程", "重点"]],
    ["考点速记卡", "适合备考、语言学习和技能总结，信息集中，方便用户截图收藏。", ["速记", "学习", "收藏"]],
    ["干货拆解笔记", "适合方法论、避坑指南和经验复盘，标题醒目，内容更像系统整理。", ["干货", "拆解", "笔记"]],
    ["知识合集封面", "适合系列课程和知识合集，用统一黑板风形成更强栏目感。", ["合集", "栏目", "封面"]],
  ],
};

function getStyleTemplateCopy(visualStyleId, index) {
  const copy = (STYLE_TEMPLATE_COPY[visualStyleId] || STYLE_TEMPLATE_COPY.fresh)[index % 4];
  return {
    title: copy[0],
    summary: copy[1],
    tags: copy[2],
  };
}

/** visualStyle id → 爆款图文模板文件夹名 */
export const VISUAL_STYLE_FOLDER = {
  fresh: "清新",
  cute: "可爱",
  minimal: "极简",
  bold: "大胆",
  handdrawn: "手绘",
  retro: "复古",
  notion: "Notion 风",
  blackboard: "黑板风",
};

export function buildStyleTemplateUrl(folder, filename) {
  return `${STYLE_TEMPLATE_BASE}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}

export function getStyleTemplateFiles(visualStyleId) {
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  if (!folder) return [];
  return manifest[folder] || [];
}

export function getVisualStyleThumb(visualStyleId) {
  const files = getStyleTemplateFiles(visualStyleId);
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  if (!folder || !files.length) return "";
  return buildStyleTemplateUrl(folder, files[0]);
}

export function pickRandomStyleTemplates(visualStyleId, count = 6) {
  const folder = VISUAL_STYLE_FOLDER[visualStyleId];
  const files = getStyleTemplateFiles(visualStyleId);
  if (!folder || !files.length) return [];

  const shuffled = [...files].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, files.length)).map((filename, index) => {
    const copy = getStyleTemplateCopy(visualStyleId, index);
    return {
    id: `${visualStyleId}-${filename}`,
    label: copy.title,
    image: buildStyleTemplateUrl(folder, filename),
    ...copy,
  };
  });
}

export const visualStyles = [
  { id: "fresh", label: "清新" },
  { id: "cute", label: "可爱" },
  { id: "minimal", label: "极简" },
  { id: "bold", label: "大胆" },
  { id: "handdrawn", label: "手绘笔记" },
  { id: "retro", label: "复古" },
  { id: "notion", label: "Notion 风" },
  { id: "blackboard", label: "黑板风" },
].map((item) => ({
  ...item,
  image: getVisualStyleThumb(item.id),
}));
