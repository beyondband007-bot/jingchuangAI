import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { articleApi } from "./articleApi";

const articlePromptMarker = "爆款图文设计";

const contentTypes = [
  { value: "xiaohongshu-cover", label: "小红书封面", prompt: "适合小红书封面的竖版视觉，标题醒目，信息有层次，适合社交媒体浏览。" },
  { value: "knowledge-card", label: "知识卡片", prompt: "知识卡片设计，重点清晰，结构化排版，适合收藏和转发。" },
  { value: "quote-poster", label: "金句海报", prompt: "金句海报设计，文字有情绪张力，画面留白充足，适合传播。" },
  { value: "tutorial", label: "步骤教程图", prompt: "步骤教程信息图，步骤编号清楚，阅读路径明确，便于照着执行。" },
  { value: "product-card", label: "产品卖点图", prompt: "产品卖点图，突出核心价值和使用场景，视觉干净专业。" },
  { value: "comparison", label: "对比分析图", prompt: "对比分析信息图，左右或上下分区，对比关系一眼可读。" }
];

const styleOptions = [
  { value: "fresh", label: "清新", prompt: "清新明亮，轻盈自然，低噪点，高级感。" },
  { value: "cute", label: "可爱", prompt: "可爱亲和，圆润图形，轻松活泼但不过度幼稚。" },
  { value: "minimal", label: "极简", prompt: "极简设计，克制留白，少量元素，高级排版。" },
  { value: "bold", label: "大胆", prompt: "高对比，大标题，强视觉冲击，适合快速吸引注意。" },
  { value: "handdrawn", label: "手绘笔记", prompt: "手绘笔记风格，轻微纸张质感，标注、箭头和小插画自然融合。" },
  { value: "retro", label: "复古", prompt: "复古平面设计，怀旧质感，字体和构图有年代感。" },
  { value: "notion", label: "Notion 风", prompt: "Notion 风格，模块化信息块，干净理性，轻量图标点缀。" },
  { value: "blackboard", label: "黑板风", prompt: "黑板板书风格，粉笔质感，像课堂重点总结。" }
];

const layoutOptions = [
  { value: "balanced", label: "均衡", prompt: "主视觉、标题和说明文字比例协调。" },
  { value: "sparse", label: "留白", prompt: "大量留白，中心信息突出，画面有呼吸感。" },
  { value: "dense", label: "密集", prompt: "信息密度较高但不拥挤，分组清晰，适合知识总结。" },
  { value: "list", label: "列表", prompt: "列表式布局，条目对齐，重点用编号或图标区分。" },
  { value: "contrast", label: "对比", prompt: "对比式布局，左右或上下分区，差异关系明确。" },
  { value: "flow", label: "流程", prompt: "流程式布局，用箭头、步骤和路径引导阅读顺序。" }
];

const paletteOptions = [
  { value: "auto", label: "自动配色", prompt: "根据主题自动选择协调配色，避免杂乱。" },
  { value: "pastel", label: "马卡龙", prompt: "柔和马卡龙配色，亲和、轻快、干净。" },
  { value: "warm", label: "暖色", prompt: "温暖明亮配色，友好、有生活感。" },
  { value: "mono", label: "黑白极简", prompt: "黑白极简配色，少量强调色，克制专注。" },
  { value: "bluegreen", label: "蓝绿色", prompt: "蓝绿色系，清爽、可靠、科技感适中。" },
  { value: "neon", label: "霓虹", prompt: "霓虹强调色，高能量，高识别度，保持文字可读。" },
  { value: "custom", label: "自定义主色", prompt: "围绕自定义主色建立统一配色，层次分明。" }
];

const audienceOptions = ["新手创作者", "职场人", "学生", "家长", "设计师", "知识博主", "小红书用户", "产品用户"];
const sceneOptions = ["社交媒体封面和知识分享", "小红书封面", "课程配图", "海报宣传", "朋友圈分享", "产品介绍", "知识卡片", "演示文稿"];
const keyMessageOptions = [
  "用 3 个步骤快速理解主题、风格和画幅",
  "让用户一眼看懂核心结论",
  "突出一个明确的行动建议",
  "用对比帮助用户快速做选择",
  "把复杂概念拆成清晰模块",
  "强调情绪氛围和记忆点"
];
const avoidOptions = ["过多英文、模糊小字、复杂背景", "水印、二维码、品牌标志", "人物变形、错别字、乱码", "低清晰度、杂乱元素", "过度装饰、信息拥挤"];

const caseStudies = [
  {
    id: "old-photo-shadow",
    title: "旧巷影子叙事图",
    description: "旧照片质感的情绪场景，适合成长、回忆和人生转折主题。",
    thumbnailUrl: "/assets/article/cases/5d0ff241-1da3-45d9-a545-c635cbcb6687.png",
    templateData: {
      contentType: "quote-poster",
      visualStyle: "retro",
      layout: "balanced",
      palette: "warm",
      topic: "旧照片风格的成长叙事画面：小男孩坐在巷口吃西瓜，墙上的影子已经长成穿西装的成年人。",
      audience: "职场人",
      keyMessage: "强调情绪氛围和记忆点",
      visibleText: "小时候\n以为长大很远",
      scene: "朋友圈分享",
      avoid: "低清晰度、杂乱元素",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "late-night-radio-cover",
    title: "深夜电台封面",
    description: "柔和暗恋氛围的情绪封面，适合错过、怀念和深夜独白内容。",
    thumbnailUrl: "/assets/article/cases/cafb9152-3dda-42a4-b16c-25713a81cd0f.png",
    templateData: {
      contentType: "xiaohongshu-cover",
      visualStyle: "fresh",
      layout: "balanced",
      palette: "warm",
      topic: "做一张关于暗恋和错过的深夜电台封面图。",
      audience: "小红书用户",
      keyMessage: "强调情绪氛围和记忆点",
      visibleText: "今晚\n也辛苦了",
      scene: "小红书封面",
      avoid: "水印、二维码、品牌标志",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "wuhan-city-walk",
    title: "城市漫步路线",
    description: "手绘路线教程图，适合城市攻略、周末出行和收藏型内容。",
    thumbnailUrl: "/assets/article/cases/59aa7376-c8b3-4fa9-9fbc-697b69e56d3f.png",
    templateData: {
      contentType: "tutorial",
      visualStyle: "handdrawn",
      layout: "flow",
      palette: "pastel",
      topic: "做一张适合周末出行的城市漫步半日路线图。",
      audience: "小红书用户",
      keyMessage: "用 3 个步骤快速理解主题、风格和画幅",
      visibleText: "城市漫步\n半日路线",
      scene: "社交媒体封面和知识分享",
      avoid: "低清晰度、杂乱元素",
      aspectRatio: "9:16",
      quality: "2K"
    }
  },
  {
    id: "color-guide",
    title: "配色避坑指南",
    description: "高识别度知识卡片，适合设计新手快速理解对比和选择。",
    thumbnailUrl: "/assets/article/cases/9ce3dbb3-7e70-440f-a9e7-35aee1272b2b.png",
    templateData: {
      contentType: "knowledge-card",
      visualStyle: "bold",
      layout: "contrast",
      palette: "mono",
      topic: "给设计新手做一张配色避坑指南。",
      audience: "设计师",
      keyMessage: "用对比帮助用户快速做选择",
      visibleText: "配色避坑\n这样更高级",
      scene: "课程配图",
      avoid: "过多英文、模糊小字、复杂背景",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "old-bookstore",
    title: "旧书店静物图",
    description: "复古静物画面，适合时间、遗忘、阅读和治愈主题。",
    thumbnailUrl: "/assets/article/cases/6230a1b9-ee06-410e-a8dc-f13c51a9b159.png",
    templateData: {
      contentType: "quote-poster",
      visualStyle: "retro",
      layout: "sparse",
      palette: "warm",
      topic: "做一张关于时间和遗忘的旧书店角落静物图。",
      audience: "新手创作者",
      keyMessage: "强调情绪氛围和记忆点",
      visibleText: "慢慢来\n也会到达",
      scene: "朋友圈分享",
      avoid: "过度装饰、信息拥挤",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "growth-poster",
    title: "成长金句海报",
    description: "留白充足的情绪海报，适合成长、自律和朋友圈分享。",
    thumbnailUrl: "/assets/article/cases/4dd57fe6-79ce-47c1-a2ec-7ab22c6e97a8.png",
    templateData: {
      contentType: "quote-poster",
      visualStyle: "minimal",
      layout: "sparse",
      palette: "warm",
      topic: "做一张关于成长和自律的温柔金句海报。",
      audience: "职场人",
      keyMessage: "强调情绪氛围和记忆点",
      visibleText: "慢慢来\n比较快",
      scene: "朋友圈分享",
      avoid: "水印、二维码、品牌标志",
      aspectRatio: "3:4",
      quality: "2K"
    }
  },
  {
    id: "kids-english",
    title: "少儿英语封面",
    description: "黑板板书风格，适合知识博主把复杂内容拆成清晰模块。",
    thumbnailUrl: "/assets/article/cases/f42c412f-172c-49fd-b33f-bc55b4260320.png",
    templateData: {
      contentType: "xiaohongshu-cover",
      visualStyle: "blackboard",
      layout: "flow",
      palette: "auto",
      topic: "给宝妈做一张少儿英语启蒙封面。",
      audience: "家长",
      keyMessage: "用 3 个步骤快速理解主题、风格和画幅",
      visibleText: "英语启蒙\n3 步走",
      scene: "小红书封面",
      avoid: "过多英文、模糊小字、复杂背景",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "beauty-cover",
    title: "通勤妆产品封面",
    description: "清新明亮的产品卖点图，适合视频封面和种草内容。",
    thumbnailUrl: "/assets/article/cases/4d71c971-4df1-46ec-a9b2-98b7093b82e3.png",
    templateData: {
      contentType: "product-card",
      visualStyle: "fresh",
      layout: "sparse",
      palette: "pastel",
      topic: "给美妆博主做一张 3 分钟通勤妆视频封面。",
      audience: "小红书用户",
      keyMessage: "让用户一眼看懂核心结论",
      visibleText: "3 分钟\n通勤妆",
      scene: "小红书封面",
      avoid: "人物变形、错别字、乱码",
      aspectRatio: "1:1",
      quality: "2K"
    }
  },
  {
    id: "study-comparison",
    title: "高效学习对比图",
    description: "复古霓虹对比海报，用左右差异快速建立记忆点。",
    thumbnailUrl: "/assets/article/cases/df965abb-4354-43a1-94cc-b6d7a06d9b3c.png",
    templateData: {
      contentType: "comparison",
      visualStyle: "bold",
      layout: "contrast",
      palette: "neon",
      topic: "学习 30 分钟 vs 刷手机 30 分钟的对比分析图。",
      audience: "学生",
      keyMessage: "用对比帮助用户快速做选择",
      visibleText: "学习 30 分钟\n刷手机 30 分钟",
      scene: "课程配图",
      avoid: "低清晰度、杂乱元素",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "cat-checklist",
    title: "新手养猫清单",
    description: "可收藏的清单式知识卡，适合宠物科普和新手指南。",
    thumbnailUrl: "/assets/article/cases/f447afdb-cb73-47b6-bd56-e8ea68330c8b.png",
    templateData: {
      contentType: "knowledge-card",
      visualStyle: "cute",
      layout: "list",
      palette: "pastel",
      topic: "给新手铲屎官做一张养猫准备清单。",
      audience: "新手创作者",
      keyMessage: "把复杂概念拆成清晰模块",
      visibleText: "新手养猫\n准备清单",
      scene: "知识卡片",
      avoid: "过多英文、模糊小字、复杂背景",
      aspectRatio: "3:4",
      quality: "2K"
    }
  },
  {
    id: "featured-visual",
    title: "精选视觉案例",
    description: "通用案例起点，适合快速生成社交媒体视觉方向。",
    thumbnailUrl: "/assets/article/cases/6d6d9a50-24f9-4ff8-8b81-91c5ada674f1.png",
    templateData: {
      contentType: "knowledge-card",
      visualStyle: "fresh",
      layout: "balanced",
      palette: "auto",
      topic: "做一张适合社交媒体发布的精选视觉案例图。",
      audience: "新手创作者",
      keyMessage: "让用户一眼看懂核心结论",
      visibleText: "灵感案例",
      scene: "社交媒体封面和知识分享",
      avoid: "低清晰度、杂乱元素",
      aspectRatio: "16:9",
      quality: "2K"
    }
  },
  {
    id: "featured-cover",
    title: "精选封面案例",
    description: "适合标题突出的封面方向，能快速套用到知识分享内容。",
    thumbnailUrl: "/assets/article/cases/be9181d0-3416-45d7-91f7-57262ce6c5ad.png",
    templateData: {
      contentType: "xiaohongshu-cover",
      visualStyle: "bold",
      layout: "balanced",
      palette: "bluegreen",
      topic: "做一张适合小红书发布的精选封面图。",
      audience: "小红书用户",
      keyMessage: "突出一个明确的行动建议",
      visibleText: "今天就能用",
      scene: "小红书封面",
      avoid: "过多英文、模糊小字、复杂背景",
      aspectRatio: "3:4",
      quality: "2K"
    }
  },
  {
    id: "ai-guide-card",
    title: "第一张 AI 图教程",
    description: "手绘笔记风教程图，适合把流程拆成可执行步骤。",
    thumbnailUrl: "/assets/article/cases/banana2-202604161723-请生成一张中文视觉设计图。类型：知识.png",
    templateData: {
      contentType: "tutorial",
      visualStyle: "handdrawn",
      layout: "flow",
      palette: "pastel",
      topic: "从 0 到 1 做出第一张 AI 图。",
      audience: "新手创作者",
      keyMessage: "用 3 个步骤快速理解主题、风格和画幅",
      visibleText: "第一张 AI 图\n3 步完成",
      scene: "课程配图",
      avoid: "人物变形、错别字、乱码",
      aspectRatio: "3:4",
      quality: "2K"
    }
  }
];

const creativeInspirations = [
  caseStudies[2],
  caseStudies[3],
  caseStudies[5],
  caseStudies[7],
  caseStudies[9],
  {
    id: "workplace-focus",
    title: "下班前专注清单",
    description: "适合职场效率博主的知识卡，把行动建议拆成清晰模块。",
    templateData: {
      contentType: "knowledge-card",
      visualStyle: "notion",
      layout: "list",
      palette: "bluegreen",
      topic: "给职场人做一张下班前专注清单。",
      audience: "职场人",
      keyMessage: "突出一个明确的行动建议",
      visibleText: "下班前\n专注清单",
      scene: "社交媒体封面和知识分享",
      avoid: "过度装饰、信息拥挤",
      aspectRatio: "1:1",
      quality: "2K"
    }
  }
];

const defaultForm = {
  contentType: "xiaohongshu-cover",
  visualStyle: "fresh",
  layout: "balanced",
  palette: "auto",
  customColor: "#14b8a6",
  topic: "给刚开始学习 AI 绘画的人做一张入门指南，画面文字：AI 绘画入门，3 步做出第一张图",
  audience: "",
  keyMessage: "",
  visibleText: "",
  scene: "",
  avoid: "",
  aspectRatio: "1:1",
  quality: "2K"
};

const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };

function findOption(options, value) {
  return options.find((item) => item.value === value);
}

function findLabel(options, value) {
  return findOption(options, value)?.label || value;
}

function findPrompt(options, value) {
  return findOption(options, value)?.prompt || "";
}

function pickDefaultModel(models) {
  return (
    models.find((item) => item.value === "nano_banana2")?.value ||
    models.find((item) => item.value === "nano_banana_pro")?.value ||
    models[0]?.value ||
    ""
  );
}

function getSmartRecommendation(form) {
  const text = `${form.topic} ${form.keyMessage} ${form.visibleText}`;
  const hasSteps = /步骤|流程|方法|指南|教程|step|how/i.test(text);
  const hasProduct = /产品|卖点|价格|功能|转化|购买|品牌/.test(text);
  const hasQuote = /金句|语录|句子|情绪|治愈|成长/.test(text);

  if (form.contentType === "tutorial" || hasSteps) {
    return {
      visualStyle: "handdrawn",
      layout: "flow",
      palette: "pastel",
      aspectRatio: "3:4",
      quality: "2K",
      reason: "教程类内容需要清楚的阅读路径，流程布局和手绘标注更容易让人照着做。"
    };
  }

  if (form.contentType === "product-card" || hasProduct) {
    return {
      visualStyle: "minimal",
      layout: "balanced",
      palette: "bluegreen",
      aspectRatio: "1:1",
      quality: "2K",
      reason: "产品卖点图更适合稳定、清晰、可信的表达，减少装饰能让核心价值更突出。"
    };
  }

  if (form.contentType === "quote-poster" || hasQuote) {
    return {
      visualStyle: "fresh",
      layout: "sparse",
      palette: "warm",
      aspectRatio: "3:4",
      quality: "2K",
      reason: "金句海报需要情绪和留白，稀疏布局能给文字更多呼吸感。"
    };
  }

  if (form.contentType === "comparison") {
    return {
      visualStyle: "bold",
      layout: "contrast",
      palette: "mono",
      aspectRatio: "16:9",
      quality: "2K",
      reason: "对比内容需要快速看出差异，高对比和分区布局能降低理解成本。"
    };
  }

  if (form.contentType === "knowledge-card") {
    return {
      visualStyle: "notion",
      layout: "list",
      palette: "bluegreen",
      aspectRatio: "1:1",
      quality: "2K",
      reason: "知识卡片重在结构化和收藏价值，列表布局更利于快速扫读。"
    };
  }

  return {
    visualStyle: "fresh",
    layout: "balanced",
    palette: "pastel",
    aspectRatio: "3:4",
    quality: "2K",
    reason: "封面内容需要第一眼好看、信息集中，清新风格和竖版卡片更适合社交媒体。"
  };
}

function buildGuidedPrompt(form) {
  const parts = [
    `请生成一张中文${articlePromptMarker}。类型：${findLabel(contentTypes, form.contentType)}。`,
    `主题：${form.topic.trim() || defaultForm.topic}。`,
    form.audience.trim() ? `目标受众：${form.audience.trim()}。` : "",
    form.keyMessage.trim() ? `核心信息：${form.keyMessage.trim()}。` : "",
    form.visibleText.trim() ? `画面中需要出现的中文文字：${form.visibleText.trim()}。请保证文字清晰、不要乱码、不要错别字。` : "",
    form.scene.trim() ? `使用场景：${form.scene.trim()}。` : "",
    `内容形式要求：${findPrompt(contentTypes, form.contentType)}`,
    `视觉风格：${findPrompt(styleOptions, form.visualStyle)}`,
    `布局要求：${findPrompt(layoutOptions, form.layout)}`,
    `配色要求：${findPrompt(paletteOptions, form.palette)}${form.palette === "custom" && form.customColor.trim() ? ` 主色参考 ${form.customColor.trim()}。` : ""}`,
    `画幅：${form.aspectRatio}。`,
    "请把用户填写的内容转化为高质量视觉设计，不要把提示词说明、参数名或内部生成逻辑写到画面里。",
    "画面需要有完整设计感、清晰信息层级、整洁边距和可读排版。",
    "不要出现水印、品牌标志、二维码、真实个人信息、杂乱背景或变形文字。",
    form.avoid.trim() ? `额外避免：${form.avoid.trim()}。` : ""
  ];

  return parts.filter(Boolean).join("\n");
}

function OptionButtons({ items, value, onChange }) {
  return (
    <div className="article-option-row">
      {items.map((item) => (
        <button
          className={value === item.value ? "is-selected" : ""}
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TextPills({ items, value, onPick }) {
  return (
    <div className="article-pill-row">
      {items.map((item) => (
        <button className={value === item ? "is-selected" : ""} key={item} type="button" onClick={() => onPick(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function ArticlePreview({ task, onClose }) {
  if (!task?.image) return null;

  return (
    <aside className="article-preview-overlay" aria-label="爆款图文预览">
      <div className="article-preview-dialog">
        <div className="article-preview-head">
          <div>
            <span>生成结果</span>
            <strong>{task.model}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭预览">
            <X size={18} />
          </button>
        </div>
        <div className="article-preview-stage">
          <img src={task.image} alt="爆款图文生成结果" />
        </div>
        <a className="article-primary-link" href={task.image} download>
          <Download size={16} />
          下载图片
        </a>
      </div>
    </aside>
  );
}

export function ArticleGenerationView() {
  const [form, setForm] = useState(defaultForm);
  const [options, setOptions] = useState(emptyOptions);
  const [model, setModel] = useState("");
  const [credits, setCredits] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [viewMode, setViewMode] = useState("home");
  const [previewTask, setPreviewTask] = useState(null);
  const [showAudience, setShowAudience] = useState(false);

  useEffect(() => {
    let mounted = true;
    function refreshTasks() {
      articleApi.getTasks({ filter: "all" }).then((value) => {
        if (!mounted) return;
        setCards(value);
      }).catch((error) => mounted && setSubmitError(error.message));
    }

    articleApi.getModels().then((value) => {
      if (!mounted) return;
      setOptions(value);
      setModel((current) => current || pickDefaultModel(value.models));
      setForm((current) => ({
        ...current,
        aspectRatio: value.ratios.includes(current.aspectRatio) ? current.aspectRatio : value.ratios[0] || current.aspectRatio,
        quality: value.qualities.some((item) => item.value === current.quality) ? current.quality : value.qualities[0]?.value || current.quality
      }));
    }).catch((error) => mounted && setSubmitError(error.message));

    articleApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    refreshTasks();
    const unsubscribe = articleApi.subscribe(refreshTasks);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const selectedTask = useMemo(() => cards.find((card) => card.id === selectedTaskId) || null, [cards, selectedTaskId]);
  const generatedPrompt = useMemo(() => buildGuidedPrompt(form), [form]);
  const recommendation = useMemo(() => getSmartRecommendation(form), [form]);
  const price = useMemo(
    () => articleApi.calculatePrice({ model, quality: form.quality, count: 1, models: options.models, qualities: options.qualities }),
    [form.quality, model, options]
  );
  const articleCards = viewMode === "favorite" ? cards.filter((card) => card.favorite) : cards;

  useEffect(() => {
    if (selectedTask && (selectedTask.status === "completed" || selectedTask.status === "failed")) {
      setIsSubmitting(false);
      articleApi.refreshCredits().then(setCredits).catch(() => {});
    }
  }, [selectedTask]);

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function applyTemplate(template) {
    setForm({ ...defaultForm, ...template.templateData, customColor: template.templateData.customColor || defaultForm.customColor });
    setShowAudience(Boolean(template.templateData.audience));
    setSelectedTaskId(null);
    setPreviewTask(null);
    setSubmitError("");
  }

  function applyRandomInspiration() {
    const item = creativeInspirations[Math.floor(Math.random() * creativeInspirations.length)];
    applyTemplate(item);
  }

  function applySmartRecommendation() {
    updateForm({
      visualStyle: recommendation.visualStyle,
      layout: recommendation.layout,
      palette: recommendation.palette,
      aspectRatio: recommendation.aspectRatio,
      quality: recommendation.quality
    });
    setSubmitError("");
  }

  async function submitGeneration() {
    if (!form.topic.trim()) {
      setSubmitError("请先填写主题。");
      return;
    }
    const selectedModel = model || pickDefaultModel(options.models);
    if (!selectedModel) {
      setSubmitError("暂无可用图片模型。");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);
    setPreviewTask(null);

    try {
      const task = await articleApi.createTask({
        prompt: generatedPrompt,
        model: selectedModel,
        ratio: form.aspectRatio,
        quality: form.quality,
        count: 1
      });
      setCards((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      setSelectedTaskId(task.id);
      articleApi.refreshCredits().then(setCredits).catch(() => {});
      if (task.status === "failed") setIsSubmitting(false);
    } catch (error) {
      setSubmitError(error.message || "创建爆款图文任务失败。");
      setIsSubmitting(false);
    }
  }

  async function regenerateTask(task) {
    setSubmitError("");
    setIsSubmitting(true);
    setPreviewTask(null);
    try {
      const created = await articleApi.createTask({
        prompt: task.prompt,
        model: task.modelKey || model || pickDefaultModel(options.models),
        ratio: task.ratio || form.aspectRatio,
        quality: task.quality || form.quality,
        count: 1
      });
      setCards((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedTaskId(created.id);
      articleApi.refreshCredits().then(setCredits).catch(() => {});
    } catch (error) {
      setSubmitError(error.message || "再次生成失败。");
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await articleApi.deleteTask(id);
    setCards((current) => current.filter((item) => item.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

  async function toggleFavorite(id) {
    const updated = await articleApi.toggleFavorite(id);
    setCards((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  const isGenerating = isSubmitting || selectedTask?.status === "pending" || selectedTask?.status === "processing";

  return (
    <section className="article-view-root">
      <div className="article-topbar">
        <div>
          <span>爆款图文</span>
        </div>
        <div className="article-top-actions">
          {credits && <span className="article-credit">积分 {credits.balance}</span>}
          <button type="button" onClick={applyRandomInspiration}>
            <Sparkles size={17} />
            灵感换一换
          </button>
        </div>
      </div>

      <div className="article-view-tabs" aria-label="爆款图文页面切换">
        <button className={viewMode === "home" ? "is-selected" : ""} type="button" onClick={() => setViewMode("home")}>
          主页
        </button>
        <button className={viewMode === "recent" ? "is-selected" : ""} type="button" onClick={() => setViewMode("recent")}>
          最近生成
        </button>
        <button className={viewMode === "favorite" ? "is-selected" : ""} type="button" onClick={() => setViewMode("favorite")}>
          收藏
        </button>
      </div>

      {viewMode === "home" ? (
      <div className="article-workspace">
        <aside className="article-form-panel">
          <label className="article-field">
            <span>写下主题，并说明画面里要出现的文字</span>
            <textarea
              value={form.topic}
              onChange={(event) => updateForm({ topic: event.target.value })}
              placeholder="例如：给职场新人做一张时间管理封面，画面文字：每天多出 1 小时"
            />
          </label>

          <div className="article-field">
            <span>内容类型</span>
            <OptionButtons items={contentTypes} value={form.contentType} onChange={(value) => updateForm({ contentType: value })} />
          </div>

          <div className="article-field">
            <span>视觉风格</span>
            <OptionButtons items={styleOptions} value={form.visualStyle} onChange={(value) => updateForm({ visualStyle: value })} />
          </div>

          <div className="article-two-col">
            <label className="article-field">
              <span>布局</span>
              <select value={form.layout} onChange={(event) => updateForm({ layout: event.target.value })}>
                {layoutOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="article-field">
              <span>配色</span>
              <select value={form.palette} onChange={(event) => updateForm({ palette: event.target.value })}>
                {paletteOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          {form.palette === "custom" && (
            <label className="article-field">
              <span>自定义主色</span>
              <input value={form.customColor} onChange={(event) => updateForm({ customColor: event.target.value })} />
            </label>
          )}

          <div className="article-two-col">
            <label className="article-field">
              <span>模型</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {options.models.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="article-field">
              <span>画幅</span>
              <select value={form.aspectRatio} onChange={(event) => updateForm({ aspectRatio: event.target.value })}>
                {options.ratios.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="article-two-col article-one-col">
            <label className="article-field">
              <span>清晰度</span>
              <select value={form.quality} onChange={(event) => updateForm({ quality: event.target.value })}>
                {options.qualities.map((item) => (
                  <option key={item.value} value={item.value}>{item.value}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="article-optional-field">
            <button type="button" className="article-add-field" onClick={() => setShowAudience((value) => !value)}>
              <Plus size={16} />
              目标受众
            </button>
            {showAudience && (
              <label className="article-field">
                <input
                  value={form.audience}
                  onChange={(event) => updateForm({ audience: event.target.value })}
                  placeholder="可选：填写目标受众"
                />
                <TextPills items={audienceOptions} value={form.audience} onPick={(value) => updateForm({ audience: value })} />
              </label>
            )}
          </div>

          <div className="article-recommendation">
            <div>
              <strong>智能推荐</strong>
              <p>{recommendation.reason}</p>
            </div>
            <button type="button" onClick={applySmartRecommendation}>
              <Wand2 size={17} />
              应用
            </button>
          </div>

          <div className="article-submit-row">
            <span>{price}</span>
            <button type="button" onClick={submitGeneration} disabled={isGenerating || !options.models.length}>
              {isGenerating ? <Loader2 size={18} /> : <Sparkles size={18} />}
              {isGenerating ? "生成中" : "生成图文"}
            </button>
          </div>
          {submitError && <div className="article-error">{submitError}</div>}
        </aside>

        <main className="article-main-panel">
          <section className="article-result-surface">
            {!selectedTask && !isGenerating && (
              <div className="article-empty-state">
                <Sparkles size={28} />
                <h2>选择一个案例，或直接填写主题</h2>
                <p>右侧会展示生成结果，历史图文会保留在下方。</p>
              </div>
            )}
            {isGenerating && (
              <div className="article-generating-state">
                <Loader2 size={30} />
                <h2>正在生成爆款图文</h2>
                <p>正在为你生成图片，请稍等片刻。</p>
              </div>
            )}
            {selectedTask?.status === "failed" && (
              <div className="article-failed-state">
                <h2>这次没有生成成功</h2>
                <p>{selectedTask.error || submitError}</p>
                <button type="button" onClick={() => regenerateTask(selectedTask)}>
                  <RefreshCcw size={17} />
                  再次生成
                </button>
              </div>
            )}
            {selectedTask?.status === "completed" && selectedTask.image && (
              <div className="article-completed-state">
                <button className="article-result-image" type="button" onClick={() => setPreviewTask(selectedTask)}>
                  <img src={selectedTask.image} alt="爆款图文生成结果" />
                </button>
                <div className="article-result-meta">
                  <span><CheckCircle2 size={16} /> 生成完成</span>
                  <strong>{selectedTask.model}</strong>
                  <p>{selectedTask.ratio} · {selectedTask.quality}</p>
                  <div>
                    <button type="button" onClick={() => setPreviewTask(selectedTask)}>
                      <Eye size={16} />
                      预览
                    </button>
                    <a href={selectedTask.image} download>
                      <Download size={16} />
                      下载
                    </a>
                    <button type="button" onClick={() => regenerateTask(selectedTask)}>
                      <RefreshCcw size={16} />
                      再次生成
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="article-cases-section">
            <div className="article-section-head">
              <div>
                <span>案例灵感</span>
                <h2>从一个案例开始</h2>
              </div>
            </div>
            <div className="article-case-grid">
              {caseStudies.map((item) => (
                <article className="article-case-card" key={item.id}>
                  <button type="button" onClick={() => applyTemplate(item)}>
                    <img src={item.thumbnailUrl} alt={item.title} />
                  </button>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <button type="button" onClick={() => applyTemplate(item)}>使用模板</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </main>
      </div>
      ) : (
      <section className="article-history-section article-history-page">
            <div className="article-section-head">
              <div>
                <span>{viewMode === "favorite" ? "收藏案例" : "历史结果"}</span>
                <h2>{viewMode === "favorite" ? "收藏" : "最近生成"}</h2>
              </div>
            </div>
            <div className="article-history-grid">
              {articleCards.map((task) => (
                <article className={`article-history-card status-${task.status}`} key={task.id}>
                  <button type="button" onClick={() => setSelectedTaskId(task.id)}>
                    {task.image ? <img src={task.image} alt="爆款图文历史结果" /> : <span>{task.status === "failed" ? "失败" : "生成中"}</span>}
                  </button>
                  <div>
                    <strong>{task.model}</strong>
                    <p>{task.ratio} · {task.quality} · {task.time}</p>
                    <div>
                      <button type="button" onClick={() => toggleFavorite(task.id)} aria-label="收藏">
                        <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
                      </button>
                      {task.image && (
                        <a href={task.image} download aria-label="下载">
                          <Download size={15} />
                        </a>
                      )}
                      <button type="button" onClick={() => regenerateTask(task)} aria-label="再次生成">
                        <RefreshCcw size={15} />
                      </button>
                      <button type="button" onClick={() => deleteTask(task.id)} aria-label="删除">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!articleCards.length && <div className="article-history-empty">还没有爆款图文历史。</div>}
            </div>
          </section>
      )}
      <ArticlePreview task={previewTask} onClose={() => setPreviewTask(null)} />
    </section>
  );
}
