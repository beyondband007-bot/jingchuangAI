import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
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
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { formatBeijingDateTime } from "../../utils/time";

const ARTICLE_PROMPT_MARKER = "爆款图文设计";
const PENDING_GENERATION_SEED_KEY = "facemini:pending-generation-seed";

const platformTabs = [
  "小红书种草",
  "抖音封面",
  "视频号封面",
  "公众号头图",
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

const quickTemplates = [
  {
    id: "single-product-review",
    title: "《单品测评种草》",
    image: "/assets/article/quick-templates/template-1.png",
    copyTemplate: "测评种草模板",
    topic: "平价单品真实实测分享，突出产品质地、使用感受、外观细节与性价比，适合早八人、学生党日常种草测评，输出小红书吸睛标题 + 闺蜜安利式短种草正文，附带实用避坑小贴士与垂直好物话题标签",
    keyword: "平价单品,真实实测,质地,使用感受,性价比",
    tone: "种草口语风"
  },
  {
    id: "mom-baby-review",
    title: "《母婴好物实测》",
    image: "/assets/article/quick-templates/template-2.png",
    copyTemplate: "测评种草模板",
    topic: "宝妈自用母婴好物真实测评，重点突出材质安全、带娃减负、使用便捷性，温柔真实分享风格，适配新手宝妈种草笔记，附带母婴选购避坑提醒与母婴垂直话题标签",
    keyword: "母婴好物,材质安全,带娃减负,使用便捷,新手宝妈",
    tone: "温柔分享风"
  },
  {
    id: "sensitive-skin-list",
    title: "《敏感肌护肤合集》",
    image: "/assets/article/quick-templates/template-3.jpg",
    copyTemplate: "清单攻略模板",
    topic: "换季敏感肌全套护肤好物合集，分别讲解每款护肤品补水、舒缓、修护屏障核心功效，干货清单式排版，分享长期维稳护肤心得，附带护肤叠加避坑指南与护肤赛道话题标签",
    keyword: "敏感肌,换季护肤,补水舒缓,修护屏障,护肤清单",
    tone: "干货测评风"
  },
  {
    id: "kitchen-appliance-list",
    title: "《厨房小家电合集》",
    image: "/assets/article/quick-templates/template-4.png",
    copyTemplate: "清单攻略模板",
    topic: "小户型租房党厨房小家电全套合集，突出机身小巧不占地、操作简单易清洗、三餐多场景适配，生活化接地气种草，附带家电保养清洁小贴士与家居好物话题标签",
    keyword: "厨房小家电,小户型,租房党,易清洗,家居好物",
    tone: "种草口语风"
  },
  {
    id: "digital-accessory-review",
    title: "《平价数码配件测评》",
    image: "/assets/article/quick-templates/template-5.png",
    copyTemplate: "测评种草模板",
    topic: "高性价比手机、电脑数码配件单品实测，突出续航、质感、实用功能，对比百元平替与大牌差异，学生党、打工人刚需，附带数码选购避坑提醒",
    keyword: "数码配件,高性价比,续航,质感,百元平替",
    tone: "干货测评风"
  },
  {
    id: "pet-care-list",
    title: "《猫狗宠物养护好物》",
    image: "/assets/article/quick-templates/template-6.png",
    copyTemplate: "清单攻略模板",
    topic: "新手养猫养狗全套养护好物清单，侧重安全无刺激、清洁省力，分喂食、洗护、玩具类单品讲解，真实养宠实测分享，附带宠物用品选购避坑贴士",
    keyword: "宠物养护,新手养宠,安全无刺激,清洁省力,宠物用品",
    tone: "温柔分享风"
  }
];

const visualStyles = [
  {
    id: "fresh",
    label: "清新",
    image: "/assets/article/template-thumbs/清新.png",
  },
  {
    id: "cute",
    label: "可爱",
    image: "/assets/article/template-thumbs/可爱.png",
  },
  {
    id: "minimal",
    label: "极简",
    image: "/assets/article/template-thumbs/极简.png",
  },
  {
    id: "bold",
    label: "大胆",
    image: "/assets/article/template-thumbs/大胆.png",
  },
  {
    id: "handdrawn",
    label: "手绘笔记",
    image: "/assets/article/template-thumbs/手绘.png",
  },
  {
    id: "retro",
    label: "复古",
    image: "/assets/article/template-thumbs/复古.png",
  },
  {
    id: "notion",
    label: "Notion 风",
    image: "/assets/article/template-thumbs/Notion.png",
  },
  {
    id: "blackboard",
    label: "黑板风",
    image: "/assets/article/template-thumbs/黑板.png",
  },
];

const freshStylePreviews = [
  {
    id: "book-share",
    label: "读书分享",
    image: "/assets/article/style-previews/fresh/book-share.png",
  },
  {
    id: "ootd",
    label: "穿搭 OOTD",
    image: "/assets/article/style-previews/fresh/ootd.png",
  },
  {
    id: "life-fragments",
    label: "生活碎片收集",
    image: "/assets/article/style-previews/fresh/life-fragments.png",
  },
  {
    id: "skincare",
    label: "护肤日常",
    image: "/assets/article/style-previews/fresh/skincare.png",
  },
];

const cuteStylePreviews = [
  {
    id: "life-fragments",
    label: "日常碎片收集",
    image: "/assets/article/style-previews/cute/life-fragments.png",
  },
  {
    id: "ootd",
    label: "穿搭 OOTD",
    image: "/assets/article/style-previews/cute/ootd.png",
  },
  {
    id: "skincare",
    label: "护肤日常",
    image: "/assets/article/style-previews/cute/skincare.png",
  },
  {
    id: "study-check-in",
    label: "学习打卡",
    image: "/assets/article/style-previews/cute/study-check-in.png",
  },
];

const minimalStylePreviews = [
  {
    id: "life-quote",
    label: "慢生活金句",
    image: "/assets/article/style-previews/minimal/life-quote.png",
  },
  {
    id: "ootd",
    label: "穿搭 OOTD",
    image: "/assets/article/style-previews/minimal/ootd.png",
  },
  {
    id: "weekend-explore",
    label: "周末探店",
    image: "/assets/article/style-previews/minimal/weekend-explore.png",
  },
  {
    id: "book-list",
    label: "书单分享",
    image: "/assets/article/style-previews/minimal/book-list.png",
  },
];

const boldStylePreviews = [
  {
    id: "bold-check-in",
    label: "大胆打卡",
    image: "/assets/article/style-previews/bold/bold-check-in.png",
  },
  {
    id: "bold-life-color",
    label: "活出色彩",
    image: "/assets/article/style-previews/bold/bold-life-color.png",
  },
  {
    id: "bold-jewel",
    label: "首饰宣言",
    image: "/assets/article/style-previews/bold/bold-jewel.png",
  },
  {
    id: "bold-night",
    label: "大胆美学夜",
    image: "/assets/article/style-previews/bold/bold-night.png",
  },
];

const styleTemplatePreviews = {
  fresh: freshStylePreviews,
  cute: cuteStylePreviews,
  minimal: minimalStylePreviews,
  bold: boldStylePreviews,
};

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
  keyword: "",
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
  const tags = (form.keyword || "种草,好物,分享")
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
            {template.keyword ? (
              <div className="article-quick-template-preview-keywords">
                {template.keyword.split(",").map((item) => (
                  <span key={item.trim()}>{item.trim()}</span>
                ))}
              </div>
            ) : null}
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
              <div className="article-history-full-copy-body-actions">
                <button type="button" onClick={copyArticleBody}>
                  <Copy size={15} />
                  {copiedField === "body" ? "已复制" : "复制正文"}
                </button>
              </div>
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
                <span>{createdAt}</span>
                <a href={activeImage.image} download>
                  <Download size={16} />
                  下载图片
                </a>
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
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [pendingQuickTemplate, setPendingQuickTemplate] = useState(null);
  const [previewQuickTemplate, setPreviewQuickTemplate] = useState(null);
  const templateSelectRef = useRef(null);
  const modelSelectRef = useRef(null);
  const toastTimerRef = useRef(null);
  const taskStatusSignatureRef = useRef("");
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
      keyword: pendingSeed.title || current.keyword,
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
  const activeStyleTemplatePreviews = styleTemplatePreviews[form.visualStyle] || null;
  const showStyleTemplatePreview =
    step >= 3 &&
    activeStyleTemplatePreviews &&
    !isGenerating &&
    !isDraftSubmitting &&
    !hasCompletedArticle;
  const activeVisualStyleLabel =
    visualStyles.find((item) => item.id === form.visualStyle)?.label || "清新";

  useEffect(() => {
    setActivePreviewIndex((current) => Math.min(current, Math.max(previewImages.length - 1, 0)));
  }, [previewImages.length]);

  useEffect(() => {
    if (selectedTask && (selectedTask.status === "completed" || selectedTask.status === "failed" || selectedTask.status === "partial_completed")) {
      setIsSubmitting(false);
      if (selectedTask.status === "completed" || selectedTask.status === "partial_completed") setStep(4);
      if (selectedTask.copy && !draftCopy) setDraftCopy(selectedTask.copy);
      if (selectedTask.imagePromptPlan && !imagePromptPlan) setImagePromptPlan(selectedTask.imagePromptPlan);
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
  }, [selectedTask, draftCopy, imagePromptPlan]);

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
      keyword: preserveDraftAndTopic ? current.keyword : template.keyword,
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
      const result = await articleApi.createCopyDraft({
        platform: form.platform,
        copyTemplate: form.copyTemplate,
        wordCount: form.wordCount,
        tone: form.tone,
        copyExpectation: form.tone,
        topic: form.topic,
        keyword: form.keyword,
        keywords: form.keyword,
        imageCount: form.imageCount,
        ratio: form.ratio,
        contentType: form.contentType,
        layoutStyle: form.layoutStyle,
        visualStyle: form.visualStyle
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

  async function submitGeneration() {
    if (isGuest) {
      showToast("请先登录");
      onOpenAuth?.("login");
      return;
    }

    const nextDraft = draftCopy || buildDraftCopy(form);
    const selectedModel = model || pickDefaultModel(options.models);
    if (!selectedModel) {
      showToast("暂无可用图片模型");
      return;
    }

    setDraftCopy(nextDraft);
    setSubmitError("");
    setIsSubmitting(true);
    setPreviewTask(null);
    setResultViewMode("full");
    setActivePreviewIndex(0);

    try {
      const item = await articleApi.createPackage({
        copy: nextDraft,
        imagePromptPlan,
        platform: form.platform,
        copyTemplate: form.copyTemplate,
        wordCount: form.wordCount,
        tone: form.tone,
        topic: form.topic,
        keyword: form.keyword,
        keywords: form.keyword,
        contentType: form.contentType,
        visualStyle: form.visualStyle,
        layoutStyle: form.layoutStyle,
        model: selectedModel,
        ratio: form.ratio,
        quality: form.quality,
        imageCount: form.imageCount
      });
      setCards((current) => [item, ...current.filter((card) => card.id !== item.id)]);
      setSelectedTaskId(item.id);
      setImagePromptPlan(item.imagePromptPlan || imagePromptPlan);
      articleApi.refreshCredits().then(applyCredits).catch(() => {});
      if (item.status === "failed") setIsSubmitting(false);
    } catch (error) {
      showToast(formatArticleError(error));
      setIsSubmitting(false);
    }
  }

  async function regenerateTask(task) {
    if (isGuest) {
      showToast("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (task?.type === "package" || task?.packageId) {
      if (task.copy) setDraftCopy(task.copy);
      if (task.imagePromptPlan) setImagePromptPlan(task.imagePromptPlan);
      await submitGeneration();
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
              <h2>
                <span>步骤 1 ·</span> 场景与模板
              </h2>
              <div className="fm-popular-platform-tabs" aria-label="平台类型">
                {platformTabs.map((item) => (
                  <button
                    className={form.platform === item ? "is-active" : ""}
                    type="button"
                    key={item}
                    onClick={() => changePlatform(item)}
                  >
                    {item}
                  </button>
                ))}
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
              <h2>
                <span>步骤 2 ·</span> 文案配置
              </h2>
              <label className="article-field">
                <span>创作主题</span>
                <em>{form.topic.length}/500</em>
                <textarea
                  value={form.topic}
                  onChange={(event) =>
                    updateForm({ topic: event.target.value.slice(0, 500) })
                  }
                  placeholder="电商爆款标题，突出核心卖点与优惠信息，吸引点击，适合直播带货场景"
                />
              </label>
              <div className="article-choice-row">
                <strong>期望字数</strong>
                {wordCounts.map((item) => (
                  <button
                    className={form.wordCount === item ? "is-selected" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateForm({ wordCount: item })}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="article-choice-row">
                <strong>文案语气</strong>
                {copyTones.map((item) => (
                  <button
                    className={form.tone === item ? "is-selected" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateForm({ tone: item })}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <section className="article-quick-section is-inline">
                <header>
                  <div>
                    <strong>快捷图文模板</strong>
                    <p>成套图文模板，一键填充文案+预设配图风格</p>
                  </div>
                </header>
                <div className="article-quick-rail">
                  {quickTemplates.map((item) => (
                    <button
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
              <div className="article-submit-row is-copy">
                <input
                  value={form.keyword}
                  onChange={(event) =>
                    updateForm({ keyword: event.target.value })
                  }
                  placeholder="填入商品/卖点关键词，逗号分隔"
                />
                <button type="button" onClick={generateDraft} disabled={isDraftSubmitting}>
                  {isDraftSubmitting ? <Loader2 size={17} className="is-spinning" /> : <Sparkles size={17} />}
                  {isDraftSubmitting ? "生成中" : "生成标题 & 正文"}
                </button>
              </div>
            </>
          ) : (
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
          )}
          {submitError && <div className="article-error">{submitError}</div>}
        </aside>

        <main className="article-result-card">
          <header>
            <strong>{showStyleTemplatePreview ? "模板预览" : "生成结果"}</strong>
            <span>
              {showStyleTemplatePreview
                ? `${activeVisualStyleLabel}风格 · 4 款示意`
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
            <ArticleStyleTemplatePreview items={activeStyleTemplatePreviews} />
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
