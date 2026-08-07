import React, { useEffect, useMemo, useRef, useState } from "react";
import "./articleStyles.scss";
import { articleApi } from "./articleApi";
import { ArticleHistoryPreviewDialog } from "./ArticleHistoryPreviewDialog";
import { ArticleHistoryGrid } from "./ArticleHistoryGrid";
import { ArticleResultStage } from "./ArticleResultStage";
import { ArticleFormPanel } from "./ArticleFormPanel";
import {
  LegacyArticlePreview,
  QuickTemplateConfirmDialog,
  QuickTemplatePreviewDialog,
} from "./ArticleTemplateDialogs";
import {
  buildArticleBodyCopy,
  copyTextToClipboard,
  getArticleImages,
} from "./articlePreviewUtils";
import {
  pickRandomStyleTemplates,
  visualStyles,
} from "./articleStyleTemplateAssets";
import {
  copyTemplatesByPlatform,
  copyTones,
  contentTypes,
  defaultForm,
  fallbackModelOptions,
  imageCounts,
  layoutStyles,
  morePlatformOptions,
  platformTabs,
  popularSteps,
  quickTemplates,
  ratios,
  wordCounts,
} from "./articleWorkspaceConfig";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { formatBeijingDateTime } from "../../utils/time";
import { useToast } from "../../components/ToastProvider";
import { getFileSizeLimitError, UPLOAD_SIZE_LIMITS } from "../../utils/uploadLimits";

const ARTICLE_PROMPT_MARKER = "爆款图文设计";
const PENDING_GENERATION_SEED_KEY = "facemini:pending-generation-seed";
const MAX_ARTICLE_REFERENCE_ASSETS = 6;

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

export function ArticleGenerationView({
  authUser,
  onOpenAuth,
  mode = "home",
  onModeChange,
  isActive = true,
}) {
  const { showToast } = useToast();
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
      const sizeError = getFileSizeLimitError(
        file,
        UPLOAD_SIZE_LIMITS.imageReference,
        "参考图",
      );
      if (sizeError) {
        showToast(sizeError);
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
      const { downloadArticleImagesZip } = await import("./articleImageZip");
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
        <ArticleHistoryGrid
          cards={historyCards}
          onPreview={setPreviewTask}
          onToggleFavorite={toggleFavorite}
          onRegenerate={requestRegenerate}
          onDelete={deleteTask}
        />
        <ArticleHistoryPreviewDialog
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
        <ArticleFormPanel
          step={step}
          draftCopy={draftCopy}
          popularSteps={popularSteps}
          platformTabs={platformTabs}
          form={form}
          isMorePlatformActive={isMorePlatformActive}
          isMorePlatformOpen={isMorePlatformOpen}
          morePlatformRef={morePlatformRef}
          onToggleMorePlatform={() => setIsMorePlatformOpen((value) => !value)}
          morePlatformOptions={morePlatformOptions}
          onSelectMorePlatform={selectMorePlatform}
          onChangePlatform={changePlatform}
          copyTemplates={copyTemplates}
          isTemplateOpen={isTemplateOpen}
          templateSelectRef={templateSelectRef}
          onToggleTemplate={() => setIsTemplateOpen((value) => !value)}
          onSelectCopyTemplate={(copyTemplate) => {
            updateForm({ copyTemplate });
            setIsTemplateOpen(false);
          }}
          onUpdateForm={updateForm}
          referenceInputRef={referenceInputRef}
          onAddReferenceAssets={addReferenceAssets}
          isReferenceUploading={isReferenceUploading}
          referenceAssets={referenceAssets}
          maxReferenceAssets={MAX_ARTICLE_REFERENCE_ASSETS}
          onRemoveReferenceAsset={removeReferenceAsset}
          quickTemplates={quickTemplates}
          onPreviewQuickTemplate={setPreviewQuickTemplate}
          wordCounts={wordCounts}
          copyTones={copyTones}
          onGenerateDraft={generateDraft}
          isDraftSubmitting={isDraftSubmitting}
          ratios={ratios}
          imageCounts={imageCounts}
          visualStyles={visualStyles}
          RatioIcon={RatioIcon}
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
          submitError={submitError}
        />
        <ArticleResultStage
          showStyleTemplatePreview={showStyleTemplatePreview}
          activeVisualStyleLabel={activeVisualStyleLabel}
          form={form}
          isDraftSubmitting={isDraftSubmitting}
          isGenerating={isGenerating}
          step={step}
          draftCopy={draftCopy}
          onFocusTopic={() => document.querySelector(".article-field textarea")?.focus()}
          onChooseQuickTemplate={() => applyQuickTemplate(quickTemplates[0])}
          onUpdateDraft={updateDraft}
          onConfirmDraft={confirmDraft}
          activeStyleTemplatePreviews={activeStyleTemplatePreviews}
          selectedStyleTemplateId={selectedStyleTemplateId}
          onSelectStyleTemplate={(id) => {
            setSelectedStyleTemplateId(id);
            setImagePromptPlan(null);
            setSubmitError("");
          }}
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
          resultCreatedAt={resultCreatedAt}
          onCopyArticleTitle={copyArticleTitle}
          onCopyArticleBody={copyArticleBody}
          onDownloadImagesAsZip={downloadImagesAsZip}
          authorName={authUser?.displayName || authUser?.username || "Facemini AI"}
        />

      </div>
      <ArticleHistoryPreviewDialog
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
    </section>
  );
}
