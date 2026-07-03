import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCcw,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { articleApi } from "./articleApi";
import { downloadArticleImagesZip } from "./articleImageZip";
import { ArticleXhsNotePreview } from "./ArticleXhsNotePreview";
import { ArticlePopularResultPanel } from "./ArticlePopularResultPanel";
import { ArticleImageConfigPanel } from "./ArticleImageConfigPanel";
import { ArticleStyleTemplatePreview } from "./ArticleStyleTemplatePreview";
import {
  pickRandomStyleTemplates,
  visualStyles,
} from "./articleStyleTemplateAssets";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { formatBeijingDateTime } from "../../utils/time";

const ARTICLE_PROMPT_MARKER = "爆款图文设计";
const PENDING_GENERATION_SEED_KEY = "facemini:pending-generation-seed";
const MAX_ARTICLE_REFERENCE_ASSETS = 6;

const platformTabs = [
  "小红书种草",
  "抖音封面",
  "视频号封面",
  "公众号头图",
];
const morePlatformOptions = [
  "朋友圈海报",
  "B站封面",
  "知乎图文",
  "商品详情长图",
];
const COPY_TEMPLATE_PLACEHOLDER = "请选择文案模板";
const copyTemplatesByPlatform = {
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
const wordCounts = ["短文案", "适中", "长笔记"];
const copyTones = ["种草口语风", "干货测评风", "温柔分享风", "简洁硬广风"];
const ratios = ["3:4", "1:1", "4:3", "9:16", "16:9"];
const imageCounts = [1, 2, 3, 4];
const fallbackModelOptions = [
  { value: "nano_banana2", label: "Nano Banana 2" },
  { value: "nano_banana_pro", label: "Nano Banana Pro" },
  { value: "gpt_image_2", label: "GPT Image 2" },
  { value: "seedream_45", label: "Seedream 4.5" },
];

const popularSteps = [
  { num: 1, label: "选择平台 & 创作主题" },
  { num: 2, label: "AI 生成种草文案" },
  { num: 3, label: "配图风格与版式配置" },
];

const quickTemplates = [
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

const contentTypes = [
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

const layoutStyles = [
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

const defaultForm = {
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

function takePendingArticleSeed() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_GENERATION_SEED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.target !== "article") return null;
    window.sessionStorage.removeItem(PENDING_GENERATION_SEED_KEY);
    return parsed;
  } catch {
    return null;
  }
}

function pickDefaultModel(models) {
  return (
    models.find((item) => item.value === "gpt_image_2")?.value ||
    models.find((item) => item.value === "nano_banana2")?.value ||
    models.find((item) => item.value === "nano_banana_pro")?.value ||
    models[0]?.value ||
    ""
  );
}

function formatHistoryStatus(status) {
  if (status === "failed") return "生成失败";
  if (status === "completed" || status === "partial_completed") return "已完成";
  return "生成中";
}

function formatArticleError(error, fallback = "创建爆款图文任务失败") {
  const message = typeof error === "string" ? error : error?.message || "";
  if (message.toLowerCase().includes("invalid generation options")) {
    return "生成参数无效，请检查模型、尺寸比例和配图数量";
  }
  return message || fallback;
}

function buildDraftCopy(form) {
  const topic =
    form.topic.trim() || "夏日清爽护肤好物推荐，敏感肌也能用的宝藏单品合集";
  const title =
    form.tone === "干货测评风"
      ? `${topic.slice(0, 24)}，真实使用感受、优缺点对比、适合人群与避坑点`
      : `${topic.slice(0, 24)}，真实好用的种草清单`;
  const body = [
    topic,
    "真的被惊艳到了！质地清爽不黏腻，使用门槛低，日常场景里也很好坚持。",
    "我会从核心卖点、适合人群、使用感受和避坑提醒几个角度拆开讲，让大家快速判断值不值得入手。",
    "有问题欢迎评论区聊聊，也可以先收藏起来，下次需要的时候直接照着选。",
  ].join("\n\n");
  const tags = "种草,好物,分享"
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  return { title, body, tags };
}

function buildArticlePrompt(form, draftCopy) {
  return [
    `请生成一组中文${ARTICLE_PROMPT_MARKER}。`,
    `平台：${form.platform}。`,
    `模板：${form.copyTemplate}。`,
    `标题：${draftCopy.title}。`,
    `正文：${draftCopy.body}。`,
    `标签：${draftCopy.tags.map((tag) => `#${tag}`).join(" ")}。`,
    `内容类型：${contentTypes.find((item) => item.id === form.contentType)?.label || "小红书封面"}。`,
    `视觉风格：${visualStyles.find((item) => item.id === form.visualStyle)?.label || "清新"}。`,
    `布局方式：${layoutStyles.find((item) => item.id === form.layoutStyle)?.label || "均衡"}。`,
    `尺寸比例：${form.ratio}。`,
    "画面必须使用中文排版，文字清晰可读，不能乱码，不能出现水印、二维码或无关品牌标志。",
    "整体像成熟的小红书图文封面与配图，信息层级清楚，适合用户直接发布。",
  ].join("\n");
}

function RatioIcon({ ratio }) {
  const [width, height] = ratio.split(":").map(Number);
  const isPortrait = height > width;
  const isWide = width > height;
  return (
    <span
      className={`article-ratio-icon ${isPortrait ? "is-portrait" : ""} ${isWide ? "is-wide" : ""}`}
      aria-hidden="true"
    />
  );
}

function isLandscapeRatio(ratio) {
  const [width, height] = String(ratio || "")
    .split(":")
    .map(Number);
  return Number.isFinite(width) && Number.isFinite(height) && width > height;
}

function probeImageLandscape(src, ratioFallback) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth > img.naturalHeight);
    };
    img.onerror = () => {
      resolve(isLandscapeRatio(ratioFallback));
    };
    img.src = src;
  });
}

function useArticlePreviewLayout(images, ratioFallback) {
  const imageKey = images.map((item) => item.image).join("|");
  const [isLandscapePreview, setIsLandscapePreview] = useState(() =>
    isLandscapeRatio(ratioFallback),
  );

  useEffect(() => {
    if (!images.length) {
      setIsLandscapePreview(isLandscapeRatio(ratioFallback));
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      images.map((item) => probeImageLandscape(item.image, ratioFallback)),
    ).then((results) => {
      if (cancelled) return;
      setIsLandscapePreview(results.some(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [imageKey, images, ratioFallback]);

  return isLandscapePreview;
}

function ArticleFullPreviewMedia({
  images,
  ratioFallback,
  title,
  activeIndex,
  onActiveIndexChange,
  className = "",
  stacked = false,
  variant = "history",
}) {
  const carouselRef = useRef(null);
  const isLandscapePreview = useArticlePreviewLayout(images, ratioFallback);
  const isPopular = variant === "popular";
  const mediaClassName = [
    isPopular ? "article-popular-media" : "article-result-full-media",
    isPopular ? "" : "article-history-full-media",
    `count-${Math.min(images.length, 4)}`,
    isLandscapePreview ? "is-landscape" : "",
    stacked ? "is-stacked" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const stackedGalleryClass = isPopular
    ? "article-popular-media-gallery"
    : "article-result-stacked-gallery";
  const landscapeGalleryClass = isPopular
    ? "article-popular-media-gallery"
    : "article-history-full-gallery";
  const carouselClass = isPopular
    ? "article-popular-media-carousel"
    : "article-result-full-carousel";
  const slideClass = isPopular
    ? "article-popular-media-slide"
    : "article-result-full-slide";
  const navButtonClass = isPopular
    ? "article-popular-media-nav"
    : "article-history-image-nav";
  const dotsClass = isPopular
    ? "article-popular-media-dots"
    : "article-history-preview-dots";

  function scrollToIndex(index) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollTo({
      left: carousel.clientWidth * index,
      behavior: "smooth",
    });
    onActiveIndexChange?.(index);
  }

  function handleCarouselScroll(event) {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;
    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    if (images[nextIndex] && nextIndex !== activeIndex) {
      onActiveIndexChange?.(nextIndex);
    }
  }

  if (stacked) {
    return (
      <section className={mediaClassName}>
        <div className={stackedGalleryClass}>
          {images.map((item, index) => (
            <figure key={item.id}>
              <img
                src={item.image}
                alt={item.title || title || `配图 ${index + 1}`}
                draggable="false"
              />
            </figure>
          ))}
        </div>
      </section>
    );
  }

  if (isLandscapePreview) {
    return (
      <section className={mediaClassName}>
        <div className={landscapeGalleryClass}>
          {images.map((item, index) => (
            <figure key={item.id}>
              <img
                src={item.image}
                alt={item.title || title || `配图 ${index + 1}`}
                draggable="false"
              />
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={mediaClassName}>
      <div
        className={carouselClass}
        ref={carouselRef}
        onScroll={handleCarouselScroll}
      >
        {images.map((item, index) => (
          <figure className={slideClass} key={item.id}>
            <img
              src={item.image}
              alt={item.title || title || `配图 ${index + 1}`}
              draggable="false"
            />
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            className={`${navButtonClass} is-prev`}
            type="button"
            onClick={() =>
              scrollToIndex((activeIndex - 1 + images.length) % images.length)
            }
            aria-label="上一张"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className={`${navButtonClass} is-next`}
            type="button"
            onClick={() =>
              scrollToIndex((activeIndex + 1) % images.length)
            }
            aria-label="下一张"
          >
            <ChevronRight size={22} />
          </button>
          <div className={dotsClass}>
            {images.map((item, index) => (
              <button
                className={index === activeIndex ? "is-active" : ""}
                type="button"
                key={item.id}
                onClick={() => scrollToIndex(index)}
                aria-label={`查看第 ${index + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ArticleVisualOptionGroup({
  title,
  options,
  value,
  onChange,
  variant = "image",
}) {
  return (
    <div className="article-field article-visual-field">
      <span>{title}</span>
      <div
        className={`article-visual-option-grid ${variant === "palette" ? "is-palette" : ""}`}
      >
        {options.map((item) => (
          <button
            className={value === item.id ? "is-selected" : ""}
            type="button"
            key={item.id}
            onClick={() => onChange(item.id)}
          >
            {variant === "palette" ? (
              <span
                className="article-visual-color"
                style={{ background: item.swatch }}
              />
            ) : (
              <img src={item.image} alt="" />
            )}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickTemplatePreviewDialog({ template, onClose, onApply }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!template) return null;

  return (
    <div className="article-quick-template-preview-overlay" role="presentation">
      <button
        className="article-quick-template-preview-backdrop"
        type="button"
        aria-label="关闭模板预览"
        onClick={onClose}
      />
      <section
        className="article-quick-template-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-quick-template-preview-title"
      >
        <header className="article-quick-template-preview-head">
          <strong id="article-quick-template-preview-title">快捷图文模板</strong>
          <button type="button" onClick={onClose} aria-label="关闭模板预览">
            <X size={18} />
          </button>
        </header>
        <div className="article-quick-template-preview-body">
          <div className="article-quick-template-preview-media">
            <img src={template.image} alt={template.title} />
          </div>
          <div className="article-quick-template-preview-copy">
            <h3>{template.title}</h3>
            <p>{template.topic}</p>
            <div className="article-quick-template-preview-meta">
              <span>{template.copyTemplate}</span>
              <span>{template.tone}</span>
            </div>
          </div>
        </div>
        <footer className="article-quick-template-preview-foot">
          <button type="button" className="article-quick-template-preview-apply" onClick={onApply}>
            引用此模板
          </button>
        </footer>
      </section>
    </div>
  );
}

function QuickTemplateConfirmDialog({ template, onCancel, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="logout-confirm-layer" role="presentation">
      <button
        className="logout-confirm-backdrop"
        type="button"
        aria-label="关闭提示"
        onClick={onCancel}
      />
      <section
        className="logout-confirm-dialog article-quick-template-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-quick-template-confirm-title"
      >
        <div className="logout-confirm-icon article-quick-template-confirm-icon">
          <Sparkles size={20} />
        </div>
        <div className="logout-confirm-copy">
          <h2 id="article-quick-template-confirm-title">套用快捷模板？</h2>
          <p>
            是否返回上一步并且套用模板
            {template?.title ? `「${template.title}」` : ""}？
          </p>
        </div>
        <div className="logout-confirm-actions">
          <button type="button" onClick={onCancel}>
            否
          </button>
          <button type="button" onClick={onConfirm}>
            是
          </button>
        </div>
      </section>
    </div>
  );
}

function LegacyArticlePreview({ task, onClose }) {
  if (!task?.image) return null;
  return (
    <aside className="article-preview-overlay" aria-label="爆款图文预览">
      <div className="article-preview-dialog">
        <div className="article-preview-head">
          <div>
            <span>生成结果</span>
            <strong>{task.model || "AI 图文"}</strong>
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

function getArticleImages(task) {
  if (!task) return [];
  if (task.imageTasks?.length) {
    return task.imageTasks
      .map((item, index) => ({
        id: item.id || `${task.id}-image-${index}`,
        image: item.imageUrl || item.image,
        title: item.segmentTitle || item.title || `配图 ${index + 1}`,
        status: item.status
      }))
      .filter((item) => item.image);
  }
  if (task.images?.length) {
    return task.images
      .map((image, index) => ({
        id: `${task.id}-image-${index}`,
        image,
        title: `配图 ${index + 1}`,
        status: task.status
      }))
      .filter((item) => item.image);
  }
  return task.image ? [{ id: task.id, image: task.image, title: "配图 1", status: task.status }] : [];
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function buildArticleBodyCopy(body, tags = []) {
  const tagsText = tags.map((tag) => `#${tag}`).join(" ");
  return [body, tagsText].filter(Boolean).join("\n\n");
}

function getPopularStepState(currentStep, hasDraftCopy) {
  if (currentStep >= 3) {
    return { activeStep: 3, doneSteps: [1, 2] };
  }
  if (hasDraftCopy) {
    return { activeStep: 2, doneSteps: [1] };
  }
  return { activeStep: 1, doneSteps: [] };
}

function PopularStepper({ currentStep, hasDraftCopy }) {
  const { activeStep, doneSteps } = getPopularStepState(currentStep, hasDraftCopy);

  return (
    <div
      className="fm-popular-stepper is-three-steps is-flat"
      aria-label="爆款图文生成步骤"
    >
      {popularSteps.map((item) => {
        const isDone = doneSteps.includes(item.num);
        const isActive = item.num === activeStep || isDone;
        return (
          <div
            className={`${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
            key={item.num}
          >
            <span>
              {isDone ? <Check size={16} strokeWidth={2.5} /> : item.num}
            </span>
            <p>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function CopyParamsPanel({
  form,
  wordCounts,
  copyTones,
  onUpdateForm,
}) {
  return (
    <section className="article-copy-params">
      <div className="article-copy-params__head">
        <strong className="article-copy-params__title">文案参数</strong>
        <span className="article-copy-params__summary">
          {form.wordCount} · {form.tone}
        </span>
      </div>
      <div className="article-copy-params__body">
        <div className="article-copy-params__group">
          <strong>期望字数</strong>
          <div className="article-copy-params__options">
            {wordCounts.map((item) => (
              <button
                className={form.wordCount === item ? "is-selected" : ""}
                type="button"
                key={item}
                onClick={() => onUpdateForm({ wordCount: item })}
              >
                <span aria-hidden="true" />
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="article-copy-params__group">
          <strong>文案语气</strong>
          <div className="article-copy-params__options is-wrap">
            {copyTones.map((item) => (
              <button
                className={form.tone === item ? "is-selected" : ""}
                type="button"
                key={item}
                onClick={() => onUpdateForm({ tone: item })}
              >
                <span aria-hidden="true" />
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ArticlePreview({ task, onClose, authUser }) {
  const [previewMode, setPreviewMode] = useState("full");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const copyTextTimerRef = useRef(null);
  const images = getArticleImages(task);
  const prompt = task?.prompt || "暂无提示词";
  const articleTitle = task?.copy?.title || task?.title || "AI 图文创作";
  const articleBody = task?.copy?.body || prompt;
  const articleTags = Array.isArray(task?.copy?.tags) ? task.copy.tags : [];
  const activeImage = images[activeImageIndex] || images[0];
  const createdAt =
    formatBeijingDateTime(task?.createdAt || task?.created_at || task?.time) ||
    "刚刚";

  useEffect(() => {
    setPreviewMode("full");
    setActiveImageIndex(0);
    setCopiedField(null);
  }, [task?.id]);

  useEffect(() => {
    if (!images.length) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTextTimerRef.current) {
        window.clearTimeout(copyTextTimerRef.current);
      }
    };
  }, [onClose, images.length]);

  function markCopiedField(field) {
    setCopiedField(field);
    if (copyTextTimerRef.current) {
      window.clearTimeout(copyTextTimerRef.current);
    }
    copyTextTimerRef.current = window.setTimeout(() => setCopiedField(null), 1600);
  }

  async function copyArticleTitle() {
    if (!articleTitle) return;
    await copyTextToClipboard(articleTitle);
    markCopiedField("title");
  }

  async function copyArticleBody() {
    const text = buildArticleBodyCopy(articleBody, articleTags);
    if (!text) return;
    await copyTextToClipboard(text);
    markCopiedField("body");
  }

  if (!images.length) return null;

  return (
    <div
      className="fm-detail-modal-backdrop article-detail-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="爆款图文详情"
    >
      <button
        className="fm-detail-modal-shade"
        type="button"
        onClick={onClose}
        aria-label="关闭详情"
      />
      <section className={`article-history-preview-dialog is-${previewMode}`}>
        <div className="article-history-preview-tabs" aria-label="历史图文预览模式">
          <button
            className={previewMode === "full" ? "is-active" : ""}
            type="button"
            onClick={() => setPreviewMode("full")}
          >
            全文预览
          </button>
          <button
            className={previewMode === "cover" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setActiveImageIndex(0);
              setPreviewMode("cover");
            }}
          >
            封面预览
          </button>
        </div>
        <button
          className="article-history-preview-close"
          type="button"
          onClick={onClose}
          aria-label="关闭详情"
        >
          <X size={20} />
        </button>

        {previewMode === "full" ? (
          <div className="article-history-full-preview">
            <ArticleFullPreviewMedia
              images={images}
              ratioFallback={task?.ratio}
              title={articleTitle}
              activeIndex={activeImageIndex}
              onActiveIndexChange={setActiveImageIndex}
            />
            <article className="article-history-full-copy">
              <div className="article-history-full-copy-head">
                <span className="article-history-preview-kicker">爆款图文</span>
                <button type="button" onClick={copyArticleTitle}>
                  <Copy size={15} />
                  {copiedField === "title" ? "已复制" : "复制标题"}
                </button>
              </div>
              <h2>{articleTitle}</h2>
              <div className="article-history-full-body">
                {articleBody
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`}>{paragraph}</p>
                  ))}
              </div>
              {articleTags.length > 0 && (
                <div className="article-history-preview-tags">
                  {articleTags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
              <div className="article-history-full-footer">
                <div className="article-history-full-footer-actions">
                  <button
                    type="button"
                    className="article-history-full-copy-btn"
                    onClick={copyArticleBody}
                  >
                    <Copy size={15} />
                    {copiedField === "body" ? "已复制" : "复制正文"}
                  </button>
                  <a href={activeImage.image} download>
                    <Download size={16} />
                    下载图片
                  </a>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <ArticleXhsNotePreview
            images={images}
            title={articleTitle}
            body={articleBody}
            tags={articleTags}
            createdAt={createdAt}
            authorName={authUser?.displayName || authUser?.username || "Facemini AI"}
            activeIndex={activeImageIndex}
            onActiveIndexChange={setActiveImageIndex}
            ratioFallback={task?.ratio}
          />
        )}
      </section>
    </div>
  );
}

export function ArticleGenerationView({
  authUser,
  onOpenAuth,
  mode = "home",
  onModeChange,
  isActive = true,
}) {
  const [form, setForm] = useState(defaultForm);
  const [options, setOptions] = useState({
    models: [],
    ratios: [],
    qualities: [],
    counts: [],
  });
  const [model, setModel] = useState("");
  const [credits, setCredits] = useState(null);
  const [cards, setCards] = useState([]);
  const [draftCopy, setDraftCopy] = useState(null);
  const [imagePromptPlan, setImagePromptPlan] = useState(null);
  const [selectedStyleTemplateId, setSelectedStyleTemplateId] = useState(null);
  const [referenceAssets, setReferenceAssets] = useState([]);
  const [isReferenceUploading, setIsReferenceUploading] = useState(false);
  const [resultViewMode, setResultViewMode] = useState("full");
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [step, setStep] = useState(2);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [previewTask, setPreviewTask] = useState(null);
  const [isDraftSubmitting, setIsDraftSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isMorePlatformOpen, setIsMorePlatformOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [pendingQuickTemplate, setPendingQuickTemplate] = useState(null);
  const [previewQuickTemplate, setPreviewQuickTemplate] = useState(null);
  const templateSelectRef = useRef(null);
  const morePlatformRef = useRef(null);
  const modelSelectRef = useRef(null);
  const referenceInputRef = useRef(null);
  const referenceAssetsRef = useRef([]);
  const toastTimerRef = useRef(null);
  const taskStatusSignatureRef = useRef("");
  const generationSubmitLockRef = useRef(false);
  const isGuest = Boolean(authUser?.isGuest);

  function applyCredits(creditsValue) {
    if (!creditsValue) return;
    setCredits(creditsValue);
    emitCreditsUpdated(creditsValue);
  }

  useEffect(() => {
    if (!isActive) return;
    const pendingSeed = takePendingArticleSeed();
    if (!pendingSeed) return;
    setForm((current) => ({
      ...current,
      topic: pendingSeed.prompt || current.topic,
    }));
    setDraftCopy(null);
    setImagePromptPlan(null);
    setStep(2);
    setSelectedTaskId(null);
    setPreviewTask(null);
    onModeChange?.("home");
    if (pendingSeed.notice) showToast(pendingSeed.notice);
  }, [isActive, onModeChange]);

  useEffect(() => {
    referenceAssetsRef.current = referenceAssets;
  }, [referenceAssets]);

  useEffect(() => {
    return () => {
      referenceAssetsRef.current.forEach((asset) => {
        if (asset?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(asset.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    function refreshTasks() {
      articleApi
        .getTasks({ filter: "all" })
        .then((value) => {
          if (!mounted) return;
          const nextSignature = taskStatusSignature(value);
          const didStatusChange =
            taskStatusSignatureRef.current &&
            taskStatusSignatureRef.current !== nextSignature;
          taskStatusSignatureRef.current = nextSignature;
          articleApi.setHasRunningTasks(hasRunningTasks(value));
          setCards(value);
          if (didStatusChange) {
            articleApi
              .refreshCredits()
              .then((nextCredits) => mounted && applyCredits(nextCredits))
              .catch(() => {});
          }
        })
        .catch((error) => mounted && setSubmitError(error.message));
    }

    articleApi
      .getModels()
      .then((value) => {
        if (!mounted) return;
        setOptions(value);
        setModel(pickDefaultModel(value.models));
        setForm((current) => ({
          ...current,
          ratio: value.ratios.includes(current.ratio)
            ? current.ratio
            : value.ratios[0] || current.ratio,
          quality: value.qualities.some(
            (item) => item.value === current.quality,
          )
            ? current.quality
            : value.qualities[0]?.value || current.quality,
        }));
      })
      .catch((error) => mounted && setSubmitError(error.message));

    articleApi
      .getCredits()
      .then((value) => mounted && applyCredits(value))
      .catch(() => {});
    refreshTasks();
    const unsubscribe = articleApi.subscribe(refreshTasks);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    function closeFloatingSelects(event) {
      if (!templateSelectRef.current?.contains(event.target)) {
        setIsTemplateOpen(false);
      }
      if (!morePlatformRef.current?.contains(event.target)) {
        setIsMorePlatformOpen(false);
      }
      if (!modelSelectRef.current?.contains(event.target)) {
        setIsModelOpen(false);
      }
    }

    document.addEventListener("mousedown", closeFloatingSelects);
    return () =>
      document.removeEventListener("mousedown", closeFloatingSelects);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectedTask = useMemo(
    () => cards.find((card) => card.id === selectedTaskId) || null,
    [cards, selectedTaskId],
  );
  const selectedImages = getArticleImages(selectedTask);
  const selectedCompletedImages = selectedImages.filter((item) => item.image);
  const isGenerating =
    isSubmitting ||
    selectedTask?.status === "pending" ||
    selectedTask?.status === "processing";
  const historyCards = cards;
  const copyTemplates = copyTemplatesByPlatform[form.platform] || copyTemplatesByPlatform["更多"];
  const isMorePlatformActive = morePlatformOptions.includes(form.platform);
  const hasCompletedArticle = selectedCompletedImages.length > 0 && ["completed", "partial_completed"].includes(selectedTask?.status);
  const hasFailedArticle = selectedTask?.status === "failed";
  const modelOptions = options.models.length
    ? options.models
    : fallbackModelOptions;
  const selectedModelOption =
    modelOptions.find((item) => item.value === model) || modelOptions[0];
  const previewImages = useMemo(() => {
    if (selectedCompletedImages.length) return selectedCompletedImages;
    const completed = cards.filter((card) => card.status === "completed" && card.image).slice(0, 4);
    return completed.length ? completed : quickTemplates.slice(0, 4).map((item, index) => ({
      id: `placeholder-${item.id}`,
      image: item.image,
      title: `配图 ${index + 1}`
    }));
  }, [cards, selectedCompletedImages]);
  const resultCreatedAt =
    formatBeijingDateTime(
      selectedTask?.createdAt || selectedTask?.created_at || selectedTask?.time,
    ) || "刚刚";
  const activeStyleTemplatePreviews = useMemo(
    () => pickRandomStyleTemplates(form.visualStyle, 4),
    [form.visualStyle],
  );
  const showStyleTemplatePreview =
    step >= 3 &&
    activeStyleTemplatePreviews.length > 0 &&
    !isGenerating &&
    !isDraftSubmitting &&
    !hasCompletedArticle;
  const activeVisualStyleLabel =
    visualStyles.find((item) => item.id === form.visualStyle)?.label || "清新";

  useEffect(() => {
    setSelectedStyleTemplateId((current) =>
      activeStyleTemplatePreviews.some((item) => item.id === current)
        ? current
        : activeStyleTemplatePreviews[0]?.id || null,
    );
  }, [activeStyleTemplatePreviews]);

  useEffect(() => {
    setActivePreviewIndex((current) => Math.min(current, Math.max(previewImages.length - 1, 0)));
  }, [previewImages.length]);

  useEffect(() => {
    if (selectedTask && (selectedTask.status === "completed" || selectedTask.status === "failed" || selectedTask.status === "partial_completed")) {
      setIsSubmitting(false);
      if (selectedTask.status === "completed" || selectedTask.status === "partial_completed") setStep(4);
      if (selectedTask.copy && !draftCopy) setDraftCopy(selectedTask.copy);
      if (selectedTask.imagePromptPlan && !imagePromptPlan) setImagePromptPlan(selectedTask.imagePromptPlan);
      const planReferenceAssets =
        selectedTask.imagePromptPlan?.referenceAssets ||
        (selectedTask.imagePromptPlan?.referenceAsset
          ? [selectedTask.imagePromptPlan.referenceAsset]
          : []);
      if (planReferenceAssets.length && !referenceAssets.length) {
        setReferenceAssets(planReferenceAssets);
      }
      articleApi.refreshCredits().then(applyCredits).catch(() => {});

      if (
        (selectedTask.status === "completed" || selectedTask.status === "partial_completed") &&
        selectedTask.imagePromptPlan &&
        !getArticleImages(selectedTask).length
      ) {
        articleApi
          .getPackage(selectedTask.id)
          .then((pkg) => {
            setCards((current) =>
              current.map((card) =>
                card.id === pkg.id ? { ...card, ...pkg } : card,
              ),
            );
          })
          .catch(() => {});
      }
    }
  }, [selectedTask, draftCopy, imagePromptPlan, referenceAssets.length]);

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
    if (
      "contentType" in patch ||
      "visualStyle" in patch ||
      "layoutStyle" in patch ||
      "ratio" in patch ||
      "imageCount" in patch
    ) {
      setImagePromptPlan(null);
    }
    setSubmitError("");
  }

  function addReferenceAssets(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const validFiles = [];
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type || "")) {
        showToast("请上传 JPG、PNG 或 WebP 图片");
        continue;
      }
      validFiles.push(file);
    }
    if (!validFiles.length) return;
    setReferenceAssets((current) => {
      const slots = Math.max(0, MAX_ARTICLE_REFERENCE_ASSETS - current.length);
      const nextFiles = validFiles.slice(0, slots);
      if (validFiles.length > slots) {
        showToast(`最多上传 ${MAX_ARTICLE_REFERENCE_ASSETS} 张参考素材`);
      }
      return [
        ...current,
        ...nextFiles.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          status: "local",
        })),
      ];
    });
    setImagePromptPlan(null);
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  }

  function removeReferenceAsset(assetKey) {
    setReferenceAssets((current) => {
      const removed = current.find((asset) => (asset.id || asset.referenceImageUrl) === assetKey);
      if (removed?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((asset) => (asset.id || asset.referenceImageUrl) !== assetKey);
    });
    setImagePromptPlan(null);
  }

  async function ensureReferenceAssetsUploaded() {
    if (!referenceAssets.length) return [];
    setIsReferenceUploading(true);
    try {
      const uploadedAssets = [];
      for (const asset of referenceAssets) {
        if (asset.referenceImageUrl) {
          uploadedAssets.push(asset);
          continue;
        }
        if (!asset.file) continue;
        const uploaded = await articleApi.uploadReferenceImage(asset.file);
        uploadedAssets.push({
          ...asset,
          ...uploaded,
          name: uploaded.originalName || asset.name,
          status: "uploaded",
        });
      }
      setReferenceAssets(uploadedAssets);
      return uploadedAssets;
    } catch (error) {
      showToast(error.message || "参考素材上传失败");
      throw error;
    } finally {
      setIsReferenceUploading(false);
    }
  }

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 2000);
  }

  async function copyArticleTitle() {
    if (!draftCopy?.title) return;
    await copyTextToClipboard(draftCopy.title);
    showToast("标题已复制");
  }

  async function copyArticleBody() {
    if (!draftCopy) return;
    const text = buildArticleBodyCopy(draftCopy.body, draftCopy.tags);
    if (!text) return;
    await copyTextToClipboard(text);
    showToast("正文已复制");
  }

  async function downloadImagesAsZip() {
    const images = getArticleImages(selectedTask)
      .map((item) => item.image)
      .filter(Boolean);
    if (!images.length) {
      showToast("暂无可下载的图片");
      return;
    }

    try {
      showToast("正在打包图片…");
      const title = draftCopy?.title || selectedTask?.title || "article-images";
      await downloadArticleImagesZip(images, { zipName: title });
      showToast("图片已打包下载");
    } catch (error) {
      console.error("打包下载失败", error);
      showToast(error.message || "打包下载失败，请稍后重试");
    }
  }

  function changePlatform(platform) {
    setForm((current) => ({ ...current, platform, copyTemplate: "" }));
    setDraftCopy(null);
    setImagePromptPlan(null);
    setStep(2);
    setSubmitError("");
    setIsTemplateOpen(false);
    setIsMorePlatformOpen(false);
  }

  function selectMorePlatform(platform) {
    changePlatform(platform);
  }

  function applyQuickTemplate(
    template,
    { preserveDraftAndTopic = false } = {},
  ) {
    setForm((current) => ({
      ...current,
      platform: "小红书种草",
      copyTemplate: template.copyTemplate || "完整图文模板",
      topic: preserveDraftAndTopic ? current.topic : template.topic,
      tone: template.tone || current.tone,
      ratio: "3:4",
    }));
    if (!preserveDraftAndTopic) {
      setDraftCopy(null);
      setImagePromptPlan(null);
    }
    setStep(2);
    setSelectedTaskId(null);
    setPreviewTask(null);
    setSubmitError("");
    onModeChange?.("home");
  }

  function applyQuickTemplateFromPreview() {
    if (!previewQuickTemplate) return;
    const template = previewQuickTemplate;
    setPreviewQuickTemplate(null);
    handleQuickTemplateClick(template);
  }

  function handleQuickTemplateClick(template) {
    if (step >= 3) {
      setPendingQuickTemplate(template);
      return;
    }
    applyQuickTemplate(template);
  }

  function confirmPendingQuickTemplate() {
    if (!pendingQuickTemplate) return;
    const template = pendingQuickTemplate;
    setPendingQuickTemplate(null);
    applyQuickTemplate(template, { preserveDraftAndTopic: true });
  }

  async function generateDraft() {
    if (isGuest) {
      showToast("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (!form.copyTemplate) {
      showToast("请先选择文案模板");
      return;
    }
    if (!form.topic.trim()) {
      showToast("请先输入创作主题");
      return;
    }
    setSubmitError("");
    setIsDraftSubmitting(true);
    setPreviewTask(null);
    try {
      const uploadedReferenceAssets = await ensureReferenceAssetsUploaded();
      const result = await articleApi.createCopyDraft({
        platform: form.platform,
        copyTemplate: form.copyTemplate,
        wordCount: form.wordCount,
        tone: form.tone,
        copyExpectation: form.tone,
        topic: form.topic,
        imageCount: form.imageCount,
        ratio: form.ratio,
        contentType: form.contentType,
        layoutStyle: form.layoutStyle,
        visualStyle: form.visualStyle,
        templateId: selectedStyleTemplateId,
        referenceAssets: uploadedReferenceAssets,
      });
      setDraftCopy(result.copy);
      setImagePromptPlan(result.imagePromptPlan);
      setStep(2);
    } catch (error) {
      showToast(error.message || "生成标题正文失败");
    } finally {
      setIsDraftSubmitting(false);
    }
  }

  function updateDraft(patch) {
    setDraftCopy((current) => ({ ...(current || buildDraftCopy(form)), ...patch }));
    setImagePromptPlan(null);
  }

  function confirmDraft() {
    setDraftCopy((current) => current || buildDraftCopy(form));
    setStep(3);
    setSubmitError("");
  }

  async function submitGeneration(overrides = {}) {
    if (isGuest) {
      showToast("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (isSubmitting || generationSubmitLockRef.current) return;

    generationSubmitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    setPreviewTask(null);
    setResultViewMode("full");
    setActivePreviewIndex(0);

    try {
      let uploadedReferenceAssets = overrides.referenceAssets || referenceAssets;
      if (!overrides.referenceAssets) {
        uploadedReferenceAssets = await ensureReferenceAssetsUploaded();
      }

      const nextDraft = overrides.copy || draftCopy || buildDraftCopy(form);
      const nextImagePromptPlan = overrides.imagePromptPlan ?? imagePromptPlan;
      const selectedModel =
        overrides.model || model || pickDefaultModel(options.models);
      if (!selectedModel) {
        showToast("暂无可用图片模型");
        return;
      }

      const generationForm = {
        ...form,
        ratio: overrides.ratio || form.ratio,
        quality: overrides.quality || form.quality,
        imageCount: overrides.imageCount || form.imageCount,
        contentType: overrides.contentType || form.contentType,
        visualStyle: overrides.visualStyle || form.visualStyle,
        layoutStyle: overrides.layoutStyle || form.layoutStyle,
        templateId: overrides.templateId || selectedStyleTemplateId,
        referenceAssets: uploadedReferenceAssets,
      };

      setDraftCopy(nextDraft);
      if (nextImagePromptPlan) setImagePromptPlan(nextImagePromptPlan);

      const item = await articleApi.createPackage({
        copy: nextDraft,
        imagePromptPlan: nextImagePromptPlan,
        platform: generationForm.platform,
        copyTemplate: generationForm.copyTemplate,
        wordCount: generationForm.wordCount,
        tone: generationForm.tone,
        topic: generationForm.topic,
        contentType: generationForm.contentType,
        visualStyle: generationForm.visualStyle,
        layoutStyle: generationForm.layoutStyle,
        model: selectedModel,
        ratio: generationForm.ratio,
        quality: generationForm.quality,
        imageCount: generationForm.imageCount,
        templateId: generationForm.templateId,
        referenceAssets: generationForm.referenceAssets,
      });
      setCards((current) => [item, ...current.filter((card) => card.id !== item.id)]);
      setSelectedTaskId(item.id);
      setImagePromptPlan(item.imagePromptPlan || nextImagePromptPlan);
      articleApi.refreshCredits().then(applyCredits).catch(() => {});
    } catch (error) {
      showToast(formatArticleError(error));
    } finally {
      generationSubmitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  function buildPackageRegenerateOverrides(task) {
    const plan = task?.imagePromptPlan;
    return {
      copy: task?.copy || draftCopy,
      imagePromptPlan: plan || imagePromptPlan,
      model: task?.modelKey || task?.model,
      ratio: task?.ratio || plan?.ratio,
      quality: task?.quality,
      imageCount: plan?.count || task?.count,
      contentType: plan?.contentType,
      visualStyle: plan?.visualStyle,
      layoutStyle: plan?.layoutStyle,
      templateId: plan?.template?.id || plan?.template?.legacyId,
      referenceAssets:
        plan?.referenceAssets ||
        (plan?.referenceAsset ? [plan.referenceAsset] : []),
    };
  }

  async function regenerateTask(task) {
    if (isGuest) {
      showToast("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (task?.type === "package" || task?.packageId) {
      const overrides = buildPackageRegenerateOverrides(task);
      if (overrides.model) setModel(overrides.model);
      if (overrides.referenceAssets?.length) setReferenceAssets(overrides.referenceAssets);
      setForm((current) => ({
        ...current,
        ratio: overrides.ratio || current.ratio,
        quality: overrides.quality || current.quality,
        imageCount: overrides.imageCount || current.imageCount,
        contentType: overrides.contentType || current.contentType,
        visualStyle: overrides.visualStyle || current.visualStyle,
        layoutStyle: overrides.layoutStyle || current.layoutStyle,
      }));
      if (overrides.templateId) setSelectedStyleTemplateId(overrides.templateId);
      await submitGeneration(overrides);
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    setPreviewTask(null);
    try {
      const created = await articleApi.createTask({
        prompt:
          task.prompt ||
          buildArticlePrompt(form, draftCopy || buildDraftCopy(form)),
        model: task.modelKey || model || pickDefaultModel(options.models),
        ratio: task.ratio || form.ratio,
        quality: task.quality || form.quality,
        count: 1,
      });
      setCards((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ]);
      setSelectedTaskId(created.id);
      articleApi
        .refreshCredits()
        .then(applyCredits)
        .catch(() => {});
    } catch (error) {
      showToast(formatArticleError(error, "重新生成失败"));
      setIsSubmitting(false);
    }
  }

  async function performDeleteTask(id) {
    await articleApi.deleteTask(id);
    setCards((current) => current.filter((item) => item.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史图文？",
      message: "该图文生成记录会被移除，删除后无法恢复。",
    });

  const { requestRegenerate, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: regenerateTask,
    });

  async function toggleFavorite(id) {
    const updated = await articleApi.toggleFavorite(id);
    setCards((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
  }

  if (mode === "history") {
    return (
      <section className="article-view-root article-history-mode">
        <section className="article-history-section article-history-page">
          <div className="article-section-head">
            <h2>最近生成</h2>
          </div>
          <div className="article-history-grid">
            {historyCards.map((task) => {
              const taskImages = getArticleImages(task);
              const isCompleted = ["completed", "partial_completed"].includes(task.status) && taskImages.length > 0;
              const isFailed = task.status === "failed";
              const canUseCompletedActions = isCompleted;
              const canRetryOrDelete = isCompleted || isFailed;
              return (
                <article className={`article-history-card status-${task.status}`} key={task.id}>
                  <button className="article-history-preview" type="button" onClick={() => setPreviewTask(task)} disabled={!canUseCompletedActions}>
                    <span className={`article-history-status-badge status-${task.status}`}>
                      {formatHistoryStatus(task.status)}
                    </span>
                    {taskImages.length ? (
                      <span className={`article-history-image-stack count-${Math.min(taskImages.length, 4)}`}>
                        {taskImages.slice(0, 4).map((item, index) => (
                          <img src={item.image} alt={`爆款图文历史结果 ${index + 1}`} key={item.id} />
                        ))}
                      </span>
                    ) : task.status === "failed" ? (
                      <span className="article-history-failed">
                        <CircleAlert size={28} />
                        生成失败
                      </span>
                    ) : (
                      <span className="article-history-loading">
                        <Loader2 size={26} className="is-spinning" />
                        生成中
                      </span>
                    )}
                  </button>
                  <div className="article-history-meta">
                    <strong>{task.copy?.title || task.title || task.model || "爆款图文"}</strong>
                    <p>
                      {taskImages.length || task.count || 1} 张 · {task.ratio} · {task.quality} ·{" "}
                      {formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}
                    </p>
                    <div className="article-history-actions">
                      <button className={task.favorite ? "is-favorite" : ""} type="button" onClick={() => toggleFavorite(task.id)} aria-label="收藏" disabled={!canUseCompletedActions}>
                        <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
                      </button>
                      <button type="button" onClick={() => requestRegenerate(task)} aria-label="重新生成" disabled={!canRetryOrDelete}>
                        <RefreshCcw size={15} />
                      </button>
                      <button type="button" onClick={() => deleteTask(task.id)} aria-label="删除" disabled={!canRetryOrDelete}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!historyCards.length && (
              <div className="article-history-empty">
                <img src="/assets/article/empty/kong.png" alt="" />
                <span>暂无爆款图文生成记录</span>
              </div>
            )}
          </div>
        </section>
        <ArticlePreview
          task={previewTask}
          onClose={() => setPreviewTask(null)}
          authUser={authUser}
        />
        {deleteConfirmDialog}
        {regenerateConfirmDialog}
      </section>
    );
  }

  return (
    <section className="article-view-root article-popular-workbench">
      <div className="article-workspace">
        <aside className="article-form-panel">
          {step < 3 ? (
            <>
              <div className="article-form-panel__scroll">
                <div className="article-form-top">
                  <PopularStepper currentStep={step} hasDraftCopy={Boolean(draftCopy)} />
                  <div className="fm-popular-platform-tabs" aria-label="平台类型">
                  {platformTabs.map((item) => (
                    <button
                      className={
                        form.platform === item && !isMorePlatformActive
                          ? "is-active"
                          : ""
                      }
                      type="button"
                      key={item}
                      onClick={() => changePlatform(item)}
                    >
                      {item}
                    </button>
                  ))}
                  <span
                    className={`fm-popular-platform-more ${isMorePlatformOpen ? "is-open" : ""}`}
                    ref={morePlatformRef}
                  >
                    <button
                      className={isMorePlatformActive ? "is-active" : ""}
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isMorePlatformOpen}
                      onClick={() => setIsMorePlatformOpen((value) => !value)}
                    >
                      <span>{isMorePlatformActive ? form.platform : "更多"}</span>
                      <ChevronDown size={14} />
                    </button>
                    {isMorePlatformOpen && (
                      <div
                        className="fm-popular-platform-more-menu"
                        role="listbox"
                        aria-label="更多平台"
                      >
                        {morePlatformOptions.map((item) => (
                          <button
                            className={form.platform === item ? "is-selected" : ""}
                            type="button"
                            key={item}
                            role="option"
                            aria-selected={form.platform === item}
                            onClick={() => selectMorePlatform(item)}
                          >
                            <span>{item}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </span>
                </div>
              </div>
              <label className="fm-popular-template-select">
                <span>文案模板</span>
                <span
                  className={`fm-popular-template-wrap ${isTemplateOpen ? "is-open" : ""}`}
                  ref={templateSelectRef}
                >
                  <button
                    className="fm-popular-template-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isTemplateOpen}
                    onClick={() => setIsTemplateOpen((value) => !value)}
                  >
                    <Layers size={17} />
                    <span>
                      {form.copyTemplate || COPY_TEMPLATE_PLACEHOLDER}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {isTemplateOpen && (
                    <div
                      className="fm-popular-template-menu"
                      role="listbox"
                      aria-label="文案模板"
                    >
                      {copyTemplates.map((item) => (
                        <button
                          className={
                            form.copyTemplate === item ? "is-selected" : ""
                          }
                          type="button"
                          key={item}
                          role="option"
                          aria-selected={form.copyTemplate === item}
                          onClick={() => {
                            updateForm({ copyTemplate: item });
                            setIsTemplateOpen(false);
                          }}
                        >
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </label>
              <label className="article-field article-topic-field">
                <span>创作主题</span>
                <em>{form.topic.length}/500</em>
                <div className="article-topic-box">
                    <textarea
                      value={form.topic}
                      onChange={(event) =>
                        updateForm({ topic: event.target.value.slice(0, 500) })
                      }
                      placeholder="描述你想发的内容，或 上传参考图 让 AI 帮你想"
                    />
                  <div className={`article-reference-upload${referenceAssets.length ? " has-asset" : ""}`}>
                    <input
                      ref={referenceInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(event) => addReferenceAssets(event.target.files)}
                    />
                    <button
                      className="article-reference-upload__pick"
                      type="button"
                      disabled={isReferenceUploading || referenceAssets.length >= MAX_ARTICLE_REFERENCE_ASSETS}
                      onClick={() => referenceInputRef.current?.click()}
                    >
                      {isReferenceUploading ? <Loader2 size={16} className="is-spinning" /> : <ImagePlus size={16} />}
                      <span>{isReferenceUploading ? "上传中..." : "上传参考图"}</span>
                    </button>
                    <div className="article-reference-upload__text">
                      <strong>{referenceAssets.length ? `已添加 ${referenceAssets.length} 张参考素材` : "上传参考图"}</strong>
                      <span>
                        {isReferenceUploading
                          ? "正在上传素材..."
                          : referenceAssets.length
                            ? null
                            : "商品实拍、场景截图都可以，AI 帮你提炼创作主题"}
                      </span>
                    </div>
                    {!!referenceAssets.length && (
                      <div className="article-reference-upload__thumbs">
                        {referenceAssets.map((asset) => (
                          <figure className="article-reference-upload__thumb" key={asset.id || asset.referenceImageUrl}>
                            {asset.previewUrl || asset.referenceImageUrl ? (
                              <img src={asset.previewUrl || asset.referenceImageUrl} alt="" />
                            ) : (
                              <ImagePlus size={14} />
                            )}
                            <button
                              type="button"
                              onClick={() => removeReferenceAsset(asset.id || asset.referenceImageUrl)}
                              aria-label="移除参考素材"
                            >
                              <X size={12} />
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </label>
              <section className="article-quick-section is-inline">
                <header>
                  <div>
                    <strong>快捷图文模版</strong>
                  </div>
                </header>
                <div className="article-quick-rail">
                  {quickTemplates.map((item) => (
                    <button
                      className="article-quick-card__thumb"
                      type="button"
                      key={item.id}
                      aria-label={item.title}
                      onClick={() => setPreviewQuickTemplate(item)}
                    >
                      <img src={item.image} alt="" />
                    </button>
                  ))}
                </div>
              </section>
              <CopyParamsPanel
                form={form}
                wordCounts={wordCounts}
                copyTones={copyTones}
                onUpdateForm={updateForm}
              />
              </div>
              <div className="article-generate-fab-wrap">
                <button
                  className="article-generate-fab"
                  type="button"
                  onClick={generateDraft}
                  disabled={isDraftSubmitting || isReferenceUploading}
                >
                  {isDraftSubmitting ? (
                    <Loader2 size={17} className="is-spinning" />
                  ) : (
                    <ArrowUp size={17} />
                  )}
                  {isDraftSubmitting ? "生成中" : "生成标题&正文"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="article-form-panel__scroll">
                <div className="article-form-top">
                  <PopularStepper currentStep={step} hasDraftCopy={Boolean(draftCopy)} />
                </div>
                <ArticleImageConfigPanel
              form={form}
              ratios={ratios}
              imageCounts={imageCounts}
              visualStyles={visualStyles}
              onUpdateForm={updateForm}
              RatioIcon={RatioIcon}
              VisualOptionGroup={ArticleVisualOptionGroup}
              isModelOpen={isModelOpen}
              setIsModelOpen={setIsModelOpen}
              modelSelectRef={modelSelectRef}
              selectedModelOption={selectedModelOption}
              modelOptions={modelOptions}
              model={model}
              setModel={setModel}
              isGenerating={isGenerating}
              onBackStep={() => setStep(2)}
              onSubmitGeneration={submitGeneration}
            />
              </div>
            </>
          )}
          {submitError && <div className="article-error">{submitError}</div>}
        </aside>

        <main className="article-result-card">
          <header>
            <strong>{showStyleTemplatePreview ? "模板预览" : "生成结果"}</strong>
            <span>
              {showStyleTemplatePreview
                ? `${activeVisualStyleLabel}风格 · 2 款示意 · ${form.imageCount}图 · ${form.ratio}`
                : `${form.platform} · ${form.ratio}`}
            </span>
          </header>
          {isDraftSubmitting ? (
            <div className="article-result-empty">
              <Loader2 size={58} className="is-spinning" />
              <h2>正在生成标题正文</h2>
              <p>DeepSeek 正在根据场景、模板、字数和卖点整理文案草案</p>
            </div>
          ) : isGenerating ? (
            <div className="article-result-empty">
              <Loader2 size={58} className="is-spinning" />
              <h2>正在生成配图</h2>
              <p>请稍等片刻，生成完成后会自动展示结果</p>
            </div>
          ) : step < 3 && !draftCopy ? (
            <div className="article-result-empty">
              <Sparkles size={92} />
              <h2>尚未生成图文</h2>
              <p>
                按步骤选择场景与模板，先生成标题正文，再配置配图生成完整图文
              </p>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    document.querySelector(".article-field textarea")?.focus()
                  }
                >
                  去输入主题
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate(quickTemplates[0])}
                >
                  选择快捷模板
                </button>
              </div>
            </div>
          ) : step < 3 ? (
            <div className="article-copy-result">
              <label>
                <span>标题</span>
                <input
                  value={draftCopy.title}
                  onChange={(event) =>
                    updateDraft({ title: event.target.value })
                  }
                />
              </label>
              <label>
                <span>正文</span>
                <textarea
                  value={draftCopy.body}
                  onChange={(event) =>
                    updateDraft({ body: event.target.value })
                  }
                />
              </label>
              <div className="article-tag-section">
                <span>标签</span>
                <div className="article-tag-editor">
                  {(draftCopy.tags || []).map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        updateDraft({
                          tags: draftCopy.tags.filter((item) => item !== tag),
                        })
                      }
                    >
                      #{tag} <X size={13} />
                    </button>
                  ))}
                  <input
                    placeholder="输入标签后回车，如：敏感肌"
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        event.currentTarget.value.trim()
                      ) {
                        event.preventDefault();
                        updateDraft({
                          tags: [
                            ...(draftCopy.tags || []),
                            event.currentTarget.value.trim(),
                          ],
                        });
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
              <div className="article-copy-actions">
                <button
                  className="article-confirm-copy"
                  type="button"
                  onClick={confirmDraft}
                >
                  确认文案无误，下一步配置配图
                </button>
              </div>
            </div>
          ) : showStyleTemplatePreview ? (
            <ArticleStyleTemplatePreview
              items={activeStyleTemplatePreviews}
              selectedId={selectedStyleTemplateId}
              imageCount={form.imageCount}
              ratio={form.ratio}
              onSelect={(id) => {
                setSelectedStyleTemplateId(id);
                setImagePromptPlan(null);
                setSubmitError("");
              }}
            />
          ) : (
            <>
              <ArticlePopularResultPanel
                hasFailedArticle={hasFailedArticle}
                hasCompletedArticle={hasCompletedArticle}
                resultViewMode={resultViewMode}
                onChangeResultViewMode={setResultViewMode}
                activePreviewIndex={activePreviewIndex}
                onActivePreviewIndexChange={setActivePreviewIndex}
                selectedTask={selectedTask}
                submitError={submitError}
                onRequestRegenerate={requestRegenerate}
                isRegenerating={isGenerating}
                formatArticleError={formatArticleError}
                previewImages={previewImages}
                draftCopy={draftCopy}
                resultCreatedAt={resultCreatedAt}
                onCopyArticleTitle={copyArticleTitle}
                onCopyArticleBody={copyArticleBody}
                onDownloadImagesAsZip={downloadImagesAsZip}
                authorName={authUser?.displayName || authUser?.username || "Facemini AI"}
                FullPreviewMedia={ArticleFullPreviewMedia}
              />
            </>
          )}
        </main>

      </div>
      <ArticlePreview
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        authUser={authUser}
      />
      {previewQuickTemplate && (
        <QuickTemplatePreviewDialog
          template={previewQuickTemplate}
          onClose={() => setPreviewQuickTemplate(null)}
          onApply={applyQuickTemplateFromPreview}
        />
      )}
      {pendingQuickTemplate && (
        <QuickTemplateConfirmDialog
          template={pendingQuickTemplate}
          onCancel={() => setPendingQuickTemplate(null)}
          onConfirm={confirmPendingQuickTemplate}
        />
      )}
      {regenerateConfirmDialog}
      {toastMessage && (
        <div className="article-floating-toast" role="alert">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
