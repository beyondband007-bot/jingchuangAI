import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
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
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";

const ARTICLE_PROMPT_MARKER = "爆款图文设计";
const PENDING_GENERATION_SEED_KEY = "facemini:pending-generation-seed";

const platformTabs = [
  "小红书种草",
  "抖音封面",
  "视频号封面",
  "公众号头图",
  "更多",
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
const ratios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const imageCounts = [1, 2, 3, 4];
const fallbackModelOptions = [
  { value: "nano_banana2", label: "Nano Banana 2" },
  { value: "nano_banana_pro", label: "Nano Banana Pro" },
  { value: "gpt_image_2", label: "GPT Image 2" },
  { value: "seedream_45", label: "Seedream 4.5" },
];

const quickTemplates = [
  {
    id: "olive-list",
    title: "美妆种草 · 清新粉物合集",
    image: "/assets/article/cases/4d71c971-4df1-46ec-a9b2-98b7093b82e3.png",
    topic: "夏日清爽护肤好物推荐，敏感肌也能用的宝藏单品合集",
    keyword: "敏感肌,夏日护肤,好物",
    tone: "种草口语风",
  },
  {
    id: "phone-review",
    title: "数码测评 · 科技风",
    image: "/assets/article/cases/9ce3dbb3-7e70-440f-a9e7-35aee1272b2b.png",
    topic: "真实使用感受、优缺点对比，适合学生党的轻薄手机测评",
    keyword: "学生党,手机测评,轻薄",
    tone: "干货测评风",
  },
  {
    id: "mom-goodies",
    title: "母婴好物 · 治愈插画",
    image: "/assets/article/cases/f447afdb-cb73-47b6-bd56-e8ea68330c8b.png",
    topic: "新手妈妈必备清单，少踩坑的宝宝护理好物",
    keyword: "新手妈妈,宝宝护理,清单",
    tone: "温柔分享风",
  },
  {
    id: "food-store",
    title: "美食探店 · 氛围感",
    image: "/assets/article/cases/5d0ff241-1da3-45d9-a545-c635cbcb6687.png",
    topic: "周末小店打卡，真实体验和必点菜单推荐",
    keyword: "探店,周末,必点菜单",
    tone: "种草口语风",
  },
  {
    id: "travel-guide",
    title: "旅行攻略 · 治愈风",
    image: "/assets/article/cases/59aa7376-c8b3-4fa9-9fbc-697b69e56d3f.png",
    topic: "周末短途旅行路线亮点整理，适合拍照和放松",
    keyword: "旅行攻略,周末,路线",
    tone: "温柔分享风",
  },
  {
    id: "618-poster",
    title: "节日海报 · 国潮红金",
    image: "/assets/article/cases/df965abb-4354-43a1-94cc-b6d7a06d9b3c.png",
    topic: "618 活动主视觉，突出限时优惠和爆款福利",
    keyword: "618,优惠,爆款",
    tone: "简洁硬广风",
  },
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

function ArticlePreview({ task, onClose }) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);
  const prompt = task?.prompt || "暂无提示词";

  useEffect(() => {
    setCopied(false);
  }, [task?.id]);

  useEffect(() => {
    if (!task?.image) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, [onClose, task?.image]);

  async function copyPrompt() {
    try {
      await navigator.clipboard?.writeText(prompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
  }

  if (!task?.image) return null;

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
      <section className="fm-detail-modal article-detail-modal">
        <div className="fm-detail-media article-detail-media">
          <img src={task.image} alt={task.title || "爆款图文生成结果"} />
        </div>
        <aside className="fm-detail-info article-detail-info">
          <button
            className="fm-detail-close"
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={20} />
          </button>
          <p className="fm-detail-eyebrow">爆款图文</p>
          <h2>{task.title || prompt}</h2>
          <label>提示词</label>
          <p className="fm-detail-prompt article-detail-prompt">{prompt}</p>
          <button className="fm-detail-copy" type="button" onClick={copyPrompt}>
            <Copy size={15} />
            {copied ? "已复制" : "复制提示词"}
          </button>
          <dl>
            <div>
              <dt>比例</dt>
              <dd>{task.ratio || "3:4"}</dd>
            </div>
            <div>
              <dt>推荐模型</dt>
              <dd>{task.model || task.modelKey || "AI 图文"}</dd>
            </div>
            <div>
              <dt>素材</dt>
              <dd>{task.quality || "高清原图"}</dd>
            </div>
          </dl>
          <div className="fm-detail-actions article-detail-actions">
            <a href={task.image} download>
              <Download size={16} />
              下载图片
            </a>
          </div>
        </aside>
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
  const [step, setStep] = useState(2);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [previewTask, setPreviewTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
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
  const isGenerating =
    isSubmitting ||
    selectedTask?.status === "pending" ||
    selectedTask?.status === "processing";
  const historyCards = cards;
  const isCopyTemplatePlaceholder = !form.copyTemplate;
  const displayStep = isCopyTemplatePlaceholder && step < 3 ? 1 : step;
  const copyTemplates =
    copyTemplatesByPlatform[form.platform] || copyTemplatesByPlatform["更多"];
  const hasCompletedArticle =
    selectedTask?.status === "completed" && Boolean(selectedTask?.image);
  const hasFailedArticle = selectedTask?.status === "failed";
  const modelOptions = options.models.length
    ? options.models
    : fallbackModelOptions;
  const selectedModelOption =
    modelOptions.find((item) => item.value === model) || modelOptions[0];
  const previewImages = useMemo(() => {
    const completed = cards
      .filter((card) => card.status === "completed" && card.image)
      .slice(0, 4);
    return completed.length
      ? completed
      : quickTemplates.slice(0, 4).map((item, index) => ({
          id: `placeholder-${item.id}`,
          image: item.image,
          title: `配图 ${index + 1}`,
        }));
  }, [cards]);

  useEffect(() => {
    if (
      selectedTask &&
      (selectedTask.status === "completed" || selectedTask.status === "failed")
    ) {
      setIsSubmitting(false);
      if (selectedTask.status === "completed") setStep(4);
      articleApi
        .refreshCredits()
        .then(applyCredits)
        .catch(() => {});
    }
  }, [selectedTask]);

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
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

  function changePlatform(platform) {
    setForm((current) => ({ ...current, platform, copyTemplate: "" }));
    setDraftCopy(null);
    setStep(2);
    setSubmitError("");
    setIsTemplateOpen(false);
  }

  function applyQuickTemplate(template) {
    setForm((current) => ({
      ...current,
      platform: "小红书种草",
      copyTemplate: "完整图文模板",
      topic: template.topic,
      keyword: template.keyword,
      tone: template.tone || current.tone,
      ratio: "3:4",
    }));
    setDraftCopy(null);
    setStep(2);
    setSelectedTaskId(null);
    setPreviewTask(null);
    onModeChange?.("home");
  }

  function generateDraft() {
    if (!form.copyTemplate) {
      showToast("请先选择文案模板");
      return;
    }
    if (!form.topic.trim()) {
      showToast("请先输入创作主题");
      return;
    }
    const nextDraft = buildDraftCopy(form);
    setDraftCopy(nextDraft);
    setStep(2);
    setSubmitError("");
  }

  function updateDraft(patch) {
    setDraftCopy((current) => ({
      ...(current || buildDraftCopy(form)),
      ...patch,
    }));
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

    try {
      const task = await articleApi.createTask({
        prompt: buildArticlePrompt(form, nextDraft),
        model: selectedModel,
        ratio: form.ratio,
        quality: form.quality,
        count: form.imageCount,
      });
      setCards((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
      setSelectedTaskId(task.id);
      articleApi
        .refreshCredits()
        .then(applyCredits)
        .catch(() => {});
      if (task.status === "failed") setIsSubmitting(false);
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

  async function deleteTask(id) {
    await articleApi.deleteTask(id);
    setCards((current) => current.filter((item) => item.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

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
            <div>
              <span>历史图文</span>
              <h2>最近生成</h2>
            </div>
            {credits && (
              <span className="credits-chip">积分 {credits.balance}</span>
            )}
          </div>
          <div className="article-history-grid">
            {historyCards.map((task) => (
              <article
                className={`article-history-card status-${task.status}`}
                key={task.id}
              >
                <button type="button" onClick={() => setPreviewTask(task)}>
                  {task.image ? (
                    <img src={task.image} alt="爆款图文历史结果" />
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
                <div>
                  <strong>{task.model || "爆款图文"}</strong>
                  <p>
                    {task.ratio} · {task.quality} · {task.time}
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(task.id)}
                      aria-label="收藏"
                    >
                      <Star
                        size={15}
                        fill={task.favorite ? "#f8d545" : "none"}
                      />
                    </button>
                    {task.image && (
                      <a href={task.image} download aria-label="下载">
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => regenerateTask(task)}
                      aria-label="重新生成"
                    >
                      <RefreshCcw size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      aria-label="删除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
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
        />
      </section>
    );
  }

  return (
    <section className="article-view-root article-popular-workbench">
      <div className="fm-popular-stepper" aria-label="爆款图文生成步骤">
        {[
          ["1", "选择场景与模板"],
          ["2", "填写创作主题与文案参数"],
          ["3", "配置配图风格与规格"],
          ["4", "生成并预览最终图文"],
        ].map(([number, label], index) => {
          const currentStep = index + 1;
          const done = displayStep > currentStep;
          const active =
            displayStep === currentStep ||
            (displayStep === 2 && currentStep <= 2);
          return (
            <div
              className={`${done ? "is-done" : ""} ${active || done ? "is-active" : ""}`}
              key={label}
            >
              <span>{done ? <CheckCircle2 size={24} /> : number}</span>
              <p>{label}</p>
            </div>
          );
        })}
      </div>

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
                          {form.copyTemplate === item && <Check size={16} />}
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
              <div className="article-submit-row is-copy">
                <input
                  value={form.keyword}
                  onChange={(event) =>
                    updateForm({ keyword: event.target.value })
                  }
                  placeholder="填入商品/卖点关键词，逗号分隔"
                />
                <button type="button" onClick={generateDraft}>
                  <Sparkles size={17} />
                  生成标题 & 正文
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>
                <span>步骤 3 ·</span> 配图配置
              </h2>
              <div className="article-visual-config">
                <ArticleVisualOptionGroup
                  title="内容类型"
                  options={contentTypes}
                  value={form.contentType}
                  onChange={(contentType) => updateForm({ contentType })}
                />
                <ArticleVisualOptionGroup
                  title="视觉风格"
                  options={visualStyles}
                  value={form.visualStyle}
                  onChange={(visualStyle) => updateForm({ visualStyle })}
                />
                <ArticleVisualOptionGroup
                  title="布局方式"
                  options={layoutStyles}
                  value={form.layoutStyle}
                  onChange={(layoutStyle) => updateForm({ layoutStyle })}
                />
              </div>
              <div className="article-choice-row is-ratio">
                <strong>尺寸比例</strong>
                {ratios.map((item) => (
                  <button
                    className={form.ratio === item ? "is-selected" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateForm({ ratio: item })}
                  >
                    <RatioIcon ratio={item} />
                    {item}
                  </button>
                ))}
              </div>
              <div className="article-choice-row">
                <strong>配图数量</strong>
                {imageCounts.map((item) => (
                  <button
                    className={form.imageCount === item ? "is-selected" : ""}
                    type="button"
                    key={item}
                    onClick={() => updateForm({ imageCount: item })}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="article-model-select-row">
                <strong>模型选项</strong>
                <span
                  className={`fm-popular-template-wrap article-model-select ${isModelOpen ? "is-open" : ""}`}
                  ref={modelSelectRef}
                >
                  <button
                    className="fm-popular-template-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isModelOpen}
                    onClick={() => setIsModelOpen((value) => !value)}
                  >
                    <Layers size={17} />
                    <span>
                      {selectedModelOption?.label ||
                        selectedModelOption?.value ||
                        "请选择模型"}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {isModelOpen && (
                    <div
                      className="fm-popular-template-menu"
                      role="listbox"
                      aria-label="模型选项"
                    >
                      {modelOptions.map((item) => (
                        <button
                          className={model === item.value ? "is-selected" : ""}
                          type="button"
                          key={item.value}
                          role="option"
                          aria-selected={model === item.value}
                          onClick={() => {
                            setModel(item.value);
                            setIsModelOpen(false);
                          }}
                        >
                          <span>{item.label || item.value}</span>
                          {model === item.value && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </div>
              <div className="article-step-action-row">
                <p className="article-credit-hint">
                  预计消耗 <strong>{Math.max(30, form.imageCount * 30)}</strong>{" "}
                  积分
                </p>
                <div className="article-step-buttons">
                  <button
                    className="article-back-step"
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    上一步
                  </button>
                  <button
                    className="article-generate-full"
                    type="button"
                    onClick={submitGeneration}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 size={17} className="is-spinning" />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {isGenerating ? "生成中" : "生成完整图文"}
                  </button>
                </div>
              </div>
            </>
          )}
          {submitError && <div className="article-error">{submitError}</div>}
        </aside>

        <main className="article-result-card">
          <header>
            <strong>生成结果</strong>
            <span>
              {form.platform} · {form.ratio}
            </span>
          </header>
          {isGenerating ? (
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
              <button
                className="article-confirm-copy"
                type="button"
                onClick={confirmDraft}
              >
                确认文案无误，下一步配置配图
              </button>
            </div>
          ) : (
            <div className="article-image-result">
              <div className="article-copy-compact">
                <label>
                  <span>标题</span>
                  <input
                    value={draftCopy?.title || ""}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>正文</span>
                  <textarea
                    value={draftCopy?.body || ""}
                    onChange={(event) =>
                      updateDraft({ body: event.target.value })
                    }
                  />
                </label>
              </div>
              {hasFailedArticle && (
                <div className="article-generation-failed" role="alert">
                  <CircleAlert size={26} />
                  <div>
                    <strong>图片生成失败</strong>
                    <p>
                      {formatArticleError(
                        selectedTask?.error || submitError,
                        "本次生成没有成功，请调整模型、比例或稍后重试。",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => regenerateTask(selectedTask)}
                  >
                    <RefreshCcw size={15} />
                    重新生成
                  </button>
                </div>
              )}
              {hasCompletedArticle && (
                <>
                  <div className="article-preview-strip">
                    <strong>
                      配图预览{" "}
                      <small>（按顺序：封面图、细节图、场景图…）</small>
                    </strong>
                    <div>
                      {previewImages.map((item) => (
                        <figure key={item.id}>
                          <img
                            src={item.image}
                            alt={item.title || "配图预览"}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              selectedTask && regenerateTask(selectedTask)
                            }
                            disabled={!selectedTask}
                          >
                            重新生成
                          </button>
                        </figure>
                      ))}
                    </div>
                  </div>
                  <footer>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTask && setPreviewTask(selectedTask)
                      }
                    >
                      预览图文
                    </button>
                    <button type="button" disabled>
                      微调排版
                    </button>
                    <button type="button">保存</button>
                    <button type="button" className="is-primary">
                      <Sparkles size={16} />
                      生成数字人口播视频
                    </button>
                  </footer>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {step < 3 && (
        <section className="article-quick-section">
          <header>
            <div>
              <strong>快捷图文模板</strong>
              <p>成套图文模板，一键填充文案+预设配图风格</p>
            </div>
            <button type="button">查看更多</button>
          </header>
          <div className="article-quick-rail">
            {quickTemplates.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => applyQuickTemplate(item)}
              >
                <img src={item.image} alt="" />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <ArticlePreview task={previewTask} onClose={() => setPreviewTask(null)} />
      {toastMessage && (
        <div className="article-floating-toast" role="alert">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
