import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./imageGenerationStyles.css";
import { imageApi } from "../../api/imageApi";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import { BackToTopButton } from "../../components/BackToTopButton";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { PageTitle } from "../../components/PageTitle";
import { useToast } from "../../components/ToastProvider";
import {
  getFeatureScrollContainer,
  getFeatureScrollTop,
  scrollFeatureTo,
} from "../../utils/featureScroll";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import {
  ComposerBar,
  ComposerBarPlaceholder,
} from "./ImageComposerBar";
import {
  ImageCompletedNotice,
  ImageGeneratingSpinner,
  ImagePreviewLightbox,
} from "./ImageCanvasViews";
import { ImageGenerationWorkbench } from "./ImageGenerationWorkbench";
import { ImageGenerationTabs } from "./ImageGenerationTabs";
import { ImageGalleryContent } from "./ImageGalleryContent";
import { ResultCard, writeClipboardText } from "./imageSharedUi";
import {
  IncrementalLoadMoreIndicator,
  useIncrementalItems,
} from "../inspiration/incrementalItems";
import { arrangeInspirationCardsByBatch } from "../inspiration/inspirationCards";
import { WaterfallGrid } from "../waterfall/WaterfallGrid";
import {
  buildImageComposerSeedFromPending,
  clearPendingGenerationSeed,
  hasPendingGenerationSeed,
  inspirationFavoritesChangedEvent,
  isInspirationFavorite,
  loadInspirationFavoriteIds,
  peekPendingGenerationSeed,
  readInspirationFavoriteIds,
  toggleInspirationFavoriteId,
} from "../generation/generationState";
import { applyCreditsUpdate } from "../generation/creditsState";
import { isLoggedInUser } from "../invite/inviteUtils";
import { isArticleImageTask } from "../assets/assetMappers";
import {
  exampleImages,
  imageInspirationCategoryTabs,
} from "../../data/faceminiData";
import {
  buildImageHistoryThreads,
  clearImageGenerationSession,
  createImageThreadId,
  emptyOptions,
  getTaskThreadId,
  normalizeImageOptions,
  normalizeTaskList,
  readImageGenerationSession,
  resolveImageThreadIds,
  resolveThreadIdFromTaskIds,
  writeImageGenerationSession,
  writeImageGenerationThread,
} from "./imageGenerationSession";

const imageInspirationShuffleSeedStorageKey =
  "jingchuang:image-inspiration-shuffle-seed";

function createImageInspirationShuffleSeed() {
  try {
    const storedSeed = window.sessionStorage.getItem(
      imageInspirationShuffleSeedStorageKey,
    );
    if (storedSeed) return storedSeed;

    const seed = `${Date.now()}-${Math.random()}`;
    window.sessionStorage.setItem(imageInspirationShuffleSeedStorageKey, seed);
    return seed;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function seedToNumber(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function createSeededRandom(seed) {
  let value = seedToNumber(seed);
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(items, seed) {
  const shuffled = [...items];
  const random = createSeededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function getImageInspirationIdentity(item, index) {
  if (item.id) return item.id;
  return [
    item.categoryId || "all",
    item.file || item.hdSrc || item.src || `item-${index}`,
  ].join(":");
}

function buildBalancedImageInspirationOrder(items, seed) {
  const seenIds = new Set();
  const categoryBuckets = new Map();

  items.forEach((item, index) => {
    const identity = getImageInspirationIdentity(item, index);
    if (seenIds.has(identity)) return;
    seenIds.add(identity);

    const categoryId = item.categoryId || "other";
    const bucket = categoryBuckets.get(categoryId) || [];
    bucket.push(item);
    categoryBuckets.set(categoryId, bucket);
  });

  const buckets = [...categoryBuckets.entries()].map(([categoryId, bucket]) => ({
    categoryId,
    items: shuffleWithSeed(bucket, `${seed}:${categoryId}`),
  }));
  const mixed = [];
  let hasRemainingItems = true;

  while (hasRemainingItems) {
    hasRemainingItems = false;
    buckets.forEach((bucket) => {
      const item = bucket.items.shift();
      if (!item) return;
      mixed.push(item);
      hasRemainingItems = true;
    });
  }

  return mixed;
}

export function ImageGenerationView({
  authUser,
  onOpenAuth,
  isActive = true,
  resetSignal = 0,
  launchSeed = null,
  onLaunchSeedConsumed,
}) {
  const { showToast: showImagePageToast } = useToast();
  const cachedSessionRef = useRef(null);
  if (!cachedSessionRef.current) {
    cachedSessionRef.current = readImageGenerationSession();
  }
  const cachedSession = cachedSessionRef.current;
  const initialPendingImageSeed = peekPendingGenerationSeed("image");
  const [filter, setFilter] = useState(() =>
    initialPendingImageSeed ? "recent" : "inspiration",
  );
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(
    cachedSession.selectedTaskId || null,
  );
  const [submittedTaskId, setSubmittedTaskId] = useState(
    cachedSession.submittedTaskId || null,
  );
  const [activePrompt, setActivePrompt] = useState(
    cachedSession.activePrompt || "",
  );
  const [contextTaskIds, setContextTaskIds] = useState(
    Array.isArray(cachedSession.contextTaskIds)
      ? cachedSession.contextTaskIds
      : cachedSession.selectedTaskId
        ? [cachedSession.selectedTaskId]
        : [],
  );
  const [activeThreadId, setActiveThreadId] = useState(
    cachedSession.activeThreadId || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(
    Boolean(cachedSession.isSubmitting),
  );
  const [submitError, setSubmitError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);
  const [composerSeed, setComposerSeed] = useState(() =>
    buildImageComposerSeedFromPending(initialPendingImageSeed),
  );
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(
    () => getFeatureScrollTop() > 240,
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isInspirationGalleryReady, setIsInspirationGalleryReady] =
    useState(false);
  const [imageInspirationCategory, setImageInspirationCategory] =
    useState("all");
  const [favoriteInspirationIds, setFavoriteInspirationIds] = useState(() =>
    readInspirationFavoriteIds(),
  );
  const imageComposerRef = useRef(null);
  const imageInspirationShuffleSeedRef = useRef(null);
  if (!imageInspirationShuffleSeedRef.current) {
    imageInspirationShuffleSeedRef.current = createImageInspirationShuffleSeed();
  }
  const wasActiveRef = useRef(isActive);
  const taskStatusSignatureRef = useRef("");

  const applyComposerSeedApplied = useCallback(() => {
    clearPendingGenerationSeed("image");
    onLaunchSeedConsumed?.();
  }, [onLaunchSeedConsumed]);

  const applyImageComposerSeed = useCallback((rawSeed) => {
    const nextSeed = rawSeed?.id
      ? rawSeed
      : buildImageComposerSeedFromPending(rawSeed);
    if (!nextSeed?.prompt && !nextSeed?.referenceImage?.url) return;
    setPreviewTask(null);
    setSelectedTaskId(null);
    setSubmittedTaskId(null);
    setContextTaskIds([]);
    setActiveThreadId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
    setFilter("recent");
    clearImageGenerationSession();
    setComposerSeed(nextSeed);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (launchSeed) {
      applyImageComposerSeed({
        id: `launch-image-${launchSeed.createdAt || Date.now()}`,
        prompt: launchSeed.prompt || "",
        referenceImage: launchSeed.referenceImage || null,
        model: launchSeed.model || null,
        ratio: launchSeed.ratio || null,
        quality: launchSeed.quality || null,
        notice: launchSeed.notice || "",
      });
      return;
    }
    const pendingSeed = peekPendingGenerationSeed("image");
    if (pendingSeed) applyImageComposerSeed(pendingSeed);
  }, [applyImageComposerSeed, isActive, launchSeed]);

  // 常驻挂载：切换侧栏其它模块时不卸载，避免生成中状态与列表缓存丢失
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value, runningValue = value) {
      if (!mounted) return;
      const tasks = normalizeTaskList(value);
      const runningTasks = normalizeTaskList(runningValue);
      const visibleTasks = tasks.filter((task) => !isArticleImageTask(task));
      const nextSignature = taskStatusSignature(visibleTasks);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      imageApi.setHasRunningTasks(hasRunningTasks(runningTasks));
      setCards(visibleTasks);
      if (didStatusChange) {
        imageApi
          .refreshCredits()
          .then(
            (creditsValue) =>
              mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    imageApi
      .getModels()
      .then((value) => mounted && setOptions(normalizeImageOptions(value)))
      .catch(() => mounted && setOptions(emptyOptions));
    imageApi
      .getCredits()
      .then((value) => mounted && applyCreditsUpdate(setCredits, value));
    async function refreshTasks() {
      const [taskData, runningTaskData] =
        filter === "all"
          ? [await imageApi.getTasks({ filter }), null]
          : await Promise.all([
              imageApi.getTasks({ filter }),
              imageApi.getTasks({ filter: "all" }),
            ]);
      applyTaskList(taskData, runningTaskData || taskData);
    }
    refreshTasks();

    const unsubscribe = imageApi.subscribe(() => {
      refreshTasks();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [filter]);

  useEffect(() => {
    const scrollContainer = getFeatureScrollContainer();
    function syncComposerThreshold() {
      const scrollTop = getFeatureScrollTop();
      const next =
        filter === "inspiration" &&
        (isComposerPastThreshold ? scrollTop > 300 : scrollTop > 360);
      setIsComposerPastThreshold(next);
      if (next) {
        setIsComposerFocused(false);
      }
    }

    syncComposerThreshold();
    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener("scroll", syncComposerThreshold, {
      passive: true,
    });
    return () =>
      scrollTarget.removeEventListener("scroll", syncComposerThreshold);
  }, [filter, isComposerPastThreshold]);

  useEffect(() => {
    if (filter !== "inspiration") return;
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    window.requestAnimationFrame(() => {
      scrollFeatureTo(0);
    });
  }, [filter]);

  useEffect(() => {
    setIsComposerFocused(false);
  }, [filter]);

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      const composer = imageComposerRef.current;
      if (!composer || composer.contains(event.target)) return;
      setIsComposerFocused(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
  }, []);

  const previousImageResetSignalRef = useRef(resetSignal);
  useEffect(() => {
    if (isActive && !wasActiveRef.current && filter === "recent") {
      if (
        !hasPendingGenerationSeed("image") &&
        !launchSeed?.prompt &&
        !launchSeed?.referenceImage?.url &&
        !composerSeed?.prompt &&
        !composerSeed?.referenceImage?.url
      ) {
        startNewImageContext();
      }
    }
    wasActiveRef.current = isActive;
  }, [composerSeed, filter, isActive, launchSeed]);

  useEffect(() => {
    if (previousImageResetSignalRef.current === resetSignal) return;
    previousImageResetSignalRef.current = resetSignal;
    if (hasPendingGenerationSeed("image")) return;
    if (filter === "recent") {
      startNewImageContext();
      return;
    }
    setComposerSeed({
      id: `reset-${resetSignal}-${Date.now()}`,
      prompt: "",
      referenceImage: null,
      notice: "",
    });
  }, [filter, resetSignal]);

  const selectedTask = useMemo(
    () => cards.find((card) => card.id === selectedTaskId) || null,
    [cards, selectedTaskId],
  );
  const submittedTask = useMemo(
    () => cards.find((card) => card.id === submittedTaskId) || null,
    [cards, submittedTaskId],
  );
  const activeGenerationTask = submittedTask || selectedTask;
  const hasActiveGeneration = Boolean(
    isSubmitting ||
    activeGenerationTask?.status === "pending" ||
    activeGenerationTask?.status === "processing",
  );
  const hasCompletedNotice = false;
  const contextTasks = useMemo(() => {
    const taskMap = new Map(cards.map((card) => [card.id, card]));
    return contextTaskIds.map((id) => taskMap.get(id)).filter(Boolean);
  }, [cards, contextTaskIds]);
  const historyThreads = useMemo(
    () => buildImageHistoryThreads(cards),
    [cards, contextTaskIds],
  );
  const balancedAllExampleImages = useMemo(
    () =>
      buildBalancedImageInspirationOrder(
        exampleImages,
        imageInspirationShuffleSeedRef.current,
      ),
    [],
  );
  const filteredExampleImages = useMemo(() => {
    if (imageInspirationCategory === "all") return balancedAllExampleImages;
    return exampleImages.filter(
      (item) => item.categoryId === imageInspirationCategory,
    );
  }, [balancedAllExampleImages, imageInspirationCategory]);
  const imageExampleCards = useMemo(
    () =>
      filteredExampleImages.map((item, index) => {
        const id = `image-gen-${item.categoryId || "all"}-${item.file || index}`;
        return {
          id,
          status: "completed",
          model: item.model,
          ratio: item.ratio,
          width: item.width,
          height: item.height,
          resolution: item.resolution,
          quality: item.quality,
          count: 1,
          time: "示例",
          price: item.price,
          title: item.label,
          prompt: item.prompt,
          description: item.description,
          style: item.style,
          mood: item.mood,
          tags: item.tags,
          image: item.src,
          src: item.src,
          fallbackSrc: item.fallbackSrc,
          hdSrc: item.hdSrc,
          hdFallbackSrc: item.hdFallbackSrc,
          aspect: item.aspect,
          favorite: favoriteInspirationIds.has(id),
        };
      }),
    [favoriteInspirationIds, filteredExampleImages],
  );
  const favoriteImageExampleCards = useMemo(
    () =>
      exampleImages
        .map((item, index) => {
          const id = `image-gen-${item.categoryId || "all"}-${item.file || index}`;
          return {
            id,
            status: "completed",
            model: item.model,
            ratio: item.ratio,
            width: item.width,
            height: item.height,
            resolution: item.resolution,
            quality: item.quality,
            count: 1,
            time: "收藏灵感",
            price: item.price,
            title: item.label,
            prompt: item.prompt,
            description: item.description,
            style: item.style,
            mood: item.mood,
            tags: item.tags,
            image: item.src,
            src: item.src,
            fallbackSrc: item.fallbackSrc,
            hdSrc: item.hdSrc,
            hdFallbackSrc: item.hdFallbackSrc,
            aspect: item.aspect,
            favorite: true,
          };
        })
        .filter((card) => favoriteInspirationIds.has(card.id)),
    [favoriteInspirationIds],
  );
  const visibleImageExampleCards = useIncrementalItems(
    imageExampleCards,
    `image-${imageInspirationCategory}-${imageExampleCards.length}`,
    { enabled: filter === "inspiration" },
  );
  const arrangedImageExampleCards = useMemo(
    () => arrangeInspirationCardsByBatch(visibleImageExampleCards.items, 6),
    [visibleImageExampleCards.items],
  );
  const galleryItems = useMemo(() => {
    if (filter === "inspiration") {
      return arrangedImageExampleCards.map((card) => ({
        card,
        isExample: true,
      }));
    }

    if (filter === "favorite") {
      return [
        ...favoriteImageExampleCards.map((card) => ({ card, isExample: true })),
        ...cards.map((card) => ({ card, isExample: false })),
      ];
    }

    const shouldShowExamples =
      filter === "all" &&
      cards.length === 0 &&
      !submittedTaskId &&
      !selectedTaskId &&
      !isSubmitting;
    if (shouldShowExamples) {
      return [
        ...arrangedImageExampleCards.map((card) => ({ card, isExample: true })),
      ];
    }
    return cards.map((card) => ({ card, isExample: false }));
  }, [
    arrangedImageExampleCards,
    cards,
    favoriteImageExampleCards,
    filter,
    isSubmitting,
    selectedTaskId,
    submittedTaskId,
  ]);

  useEffect(() => {
    if (
      submittedTask &&
      (submittedTask.status === "completed" ||
        submittedTask.status === "failed")
    ) {
      setSelectedTaskId(submittedTask.id);
      setContextTaskIds((ids) =>
        writeImageGenerationThread(
          ids.includes(submittedTask.id) ? ids : [...ids, submittedTask.id],
        ),
      );
      setIsSubmitting(false);
    }
  }, [submittedTask]);

  useEffect(() => {
    if (!submittedTaskId || !submittedTask) return;
    setSelectedTaskId(submittedTask.id);
  }, [submittedTask, submittedTaskId]);

  useEffect(() => {
    if (
      !submittedTaskId &&
      !selectedTaskId &&
      !activePrompt &&
      !isSubmitting &&
      contextTaskIds.length === 0
    ) {
      clearImageGenerationSession();
      return;
    }

    writeImageGenerationSession({
      submittedTaskId,
      selectedTaskId,
      contextTaskIds,
      activeThreadId,
      activePrompt,
      isSubmitting,
      updatedAt: Date.now(),
    });
  }, [
    activePrompt,
    activeThreadId,
    contextTaskIds,
    isSubmitting,
    selectedTaskId,
    submittedTaskId,
  ]);

  useEffect(() => {
    function syncFavoriteIds() {
      setFavoriteInspirationIds(readInspirationFavoriteIds());
    }
    window.addEventListener(inspirationFavoritesChangedEvent, syncFavoriteIds);
    return () =>
      window.removeEventListener(
        inspirationFavoritesChangedEvent,
        syncFavoriteIds,
      );
  }, []);

  useEffect(() => {
    if (!isLoggedInUser(authUser)) return;
    loadInspirationFavoriteIds().then(setFavoriteInspirationIds).catch(() => {});
  }, [authUser?.id]);

  const canvasStatus = useMemo(() => {
    if (submitError) return "failed";
    if (isSubmitting) return "generating";
    if (
      selectedTask?.status === "pending" ||
      selectedTask?.status === "processing"
    )
      return "generating";
    if (selectedTask?.status === "failed") return "failed";
    if (selectedTask?.status === "completed" && selectedTask.image)
      return "completed";
    return "idle_examples";
  }, [isSubmitting, selectedTask, submitError]);
  const showHistory = Boolean(
    submittedTaskId || selectedTaskId || isSubmitting,
  );
  const isGuest = Boolean(authUser?.isGuest);
  const showComposer =
    Array.isArray(options.models) &&
    options.models.length > 0 &&
    filter === "inspiration";
  const isComposerSticky =
    filter === "recent" ||
    (filter === "inspiration" && isComposerPastThreshold);
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;
  const composerPlacement = isComposerSticky ? "sticky" : "inline";
  const canRenderImageGallery =
    filter !== "inspiration" || isInspirationGalleryReady;

  useEffect(() => {
    if (filter !== "inspiration") {
      setIsInspirationGalleryReady(true);
      return undefined;
    }

    setIsInspirationGalleryReady(false);
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsInspirationGalleryReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [filter]);

  function requestLoginForGeneration() {
    setSubmitError("");
    showImagePageToast("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  function selectImageThread(id) {
    const resolvedIds = resolveImageThreadIds(id, cards);
    const nextIds = writeImageGenerationThread(
      resolvedIds.length ? resolvedIds : [id],
    );
    const nextThreadId =
      resolveThreadIdFromTaskIds(nextIds, cards) ||
      getTaskThreadId(cards.find((card) => card.id === id));
    setSelectedTaskId(id);
    setContextTaskIds(nextIds);
    setActiveThreadId(nextThreadId || null);
    setSubmittedTaskId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
  }

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    const shouldStartNewThread = filter === "inspiration";
    const baseThreadIds = shouldStartNewThread
      ? []
      : contextTaskIds.length > 0
        ? contextTaskIds
        : selectedTaskId
          ? resolveImageThreadIds(selectedTaskId, cards)
          : [];
    const nextThreadId = shouldStartNewThread
      ? createImageThreadId()
      : activeThreadId ||
        resolveThreadIdFromTaskIds(baseThreadIds, cards) ||
        createImageThreadId();
    const pendingSelectedTaskId = shouldStartNewThread ? null : selectedTaskId;
    setActivePrompt(payload.prompt);
    setSubmitError("");
    setIsSubmitting(true);
    setActiveThreadId(nextThreadId);
    if (shouldStartNewThread) {
      setSelectedTaskId(null);
      setSubmittedTaskId(null);
      setContextTaskIds([]);
    }
    setIsHistoryOpen(false);
    setPreviewTask(null);
    setFilter("recent");
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: pendingSelectedTaskId,
      contextTaskIds: baseThreadIds,
      activeThreadId: nextThreadId,
      activePrompt: payload.prompt,
      isSubmitting: true,
      updatedAt: Date.now(),
    });

    try {
      const task = await imageApi.createTask({
        ...payload,
        threadId: nextThreadId,
        contextTaskIds: baseThreadIds,
      });
      imageApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(task.id);
      setSelectedTaskId(task.id);
      const persistedThreadId = task.threadId || nextThreadId;
      const nextThreadIds = writeImageGenerationThread([
        ...baseThreadIds,
        task.id,
      ]);
      setActiveThreadId(persistedThreadId);
      setContextTaskIds(nextThreadIds);
      writeImageGenerationSession({
        submittedTaskId: task.id,
        selectedTaskId: task.id,
        contextTaskIds: nextThreadIds,
        activeThreadId: persistedThreadId,
        activePrompt: task.prompt || payload.prompt,
        isSubmitting: task.status === "pending" || task.status === "processing",
        updatedAt: Date.now(),
      });
      if (task.status === "failed") {
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError("");
      showImagePageToast(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  async function performDeleteTask(id) {
    await imageApi.deleteTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setContextTaskIds((ids) => ids.filter((taskId) => taskId !== id));
    }
    if (submittedTaskId === id) {
      setSubmittedTaskId(null);
      setActivePrompt("");
      setContextTaskIds((ids) => ids.filter((taskId) => taskId !== id));
      clearImageGenerationSession();
    }
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该生成记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    await imageApi.toggleFavorite(id);
  }

  async function togglePreviewFavorite(task) {
    const id = String(task?.id || "");
    if (id.startsWith("image-gen-")) {
      if (!isLoggedInUser(authUser)) {
        requestLoginForGeneration();
        throw new Error("请先登录");
      }
      const nextValue = await toggleInspirationFavoriteId(id);
      const nextIds = readInspirationFavoriteIds();
      setFavoriteInspirationIds(nextIds);
      setPreviewTask((current) =>
        current && current.id === task.id
          ? { ...current, favorite: nextValue }
          : current,
      );
      return nextValue;
    }

    await toggleFavorite(task.id);
    const nextValue = !task.favorite;
    setPreviewTask((current) =>
      current && current.id === task.id
        ? { ...current, favorite: nextValue }
        : current,
    );
    return nextValue;
  }

  async function regenerateTask(id) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    const source = cards.find((card) => card.id === id);
    const baseThreadIds = contextTaskIds.includes(id)
      ? contextTaskIds
      : resolveImageThreadIds(id, cards);
    const nextThreadId =
      activeThreadId ||
      resolveThreadIdFromTaskIds(baseThreadIds, cards) ||
      createImageThreadId();
    if (source) {
      setActivePrompt(source.prompt);
    }
    setSubmitError("");
    setIsSubmitting(true);
    setActiveThreadId(nextThreadId);
    setIsHistoryOpen(false);
    setPreviewTask(null);
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: id,
      contextTaskIds: baseThreadIds,
      activeThreadId: nextThreadId,
      activePrompt: source?.prompt || activePrompt,
      isSubmitting: true,
      updatedAt: Date.now(),
    });

    try {
      const created = await imageApi.regenerateTask(id, {
        threadId: nextThreadId,
        contextTaskIds: baseThreadIds,
      });
      imageApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(created.id);
      setSelectedTaskId(created.id);
      const persistedThreadId = created.threadId || nextThreadId;
      const nextThreadIds = writeImageGenerationThread([
        ...baseThreadIds,
        created.id,
      ]);
      setActiveThreadId(persistedThreadId);
      setContextTaskIds(nextThreadIds);
      writeImageGenerationSession({
        submittedTaskId: created.id,
        selectedTaskId: created.id,
        contextTaskIds: nextThreadIds,
        activeThreadId: persistedThreadId,
        activePrompt: created.prompt || source?.prompt || activePrompt,
        isSubmitting:
          created.status === "pending" || created.status === "processing",
        updatedAt: Date.now(),
      });
    } catch (error) {
      setSubmitError("");
      showImagePageToast(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  const { requestRegenerate, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: regenerateTask,
    });

  async function copyTaskPrompt(task) {
    const copied = await writeClipboardText(task?.prompt);
    showImagePageToast(copied ? "提示词已复制" : "提示词复制失败，请重试");
  }

  function remixTask(task) {
    if (!task?.prompt) return;
    setPreviewTask(null);
    setSelectedTaskId(null);
    setSubmittedTaskId(null);
    setContextTaskIds([]);
    setActiveThreadId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
    setFilter("recent");
    clearImageGenerationSession();
    setComposerSeed({
      id: `remix-${task.id}-${Date.now()}`,
      prompt: task.prompt,
      model: task.modelKey || null,
      ratio: task.ratio,
      quality: task.quality,
      referenceImage: null,
      notice: "",
    });
  }

  function revealGeneratedTask(task) {
    if (!task?.image) return;
    setFilter("recent");
    setSelectedTaskId(task.id);
    setContextTaskIds([task.id]);
    setActiveThreadId(task.threadId || null);
    setPreviewTask(task);
    setSubmittedTaskId(null);
    setActivePrompt("");
    clearImageGenerationSession();
  }

  function startNewImageContext() {
    setSelectedTaskId(null);
    setSubmittedTaskId(null);
    setContextTaskIds([]);
    setActiveThreadId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
    setPreviewTask(null);
    setComposerSeed({
      id: `empty-${Date.now()}`,
      prompt: "",
      referenceImage: null,
      notice: "",
    });
    clearImageGenerationSession();
  }

  function openImageGenerationWorkbench() {
    startNewImageContext();
    setFilter("recent");
  }

  function referenceTask(task) {
    if (!task?.image) return;
    const isPersistedTask = cards.some((card) => card.id === task.id);
    setPreviewTask(null);
    if (!isPersistedTask) {
      setSelectedTaskId(null);
      setSubmittedTaskId(null);
      setContextTaskIds([]);
      setActiveThreadId(null);
      setActivePrompt("");
      setIsSubmitting(false);
      setSubmitError("");
      clearImageGenerationSession();
    }
    const nextThreadId =
      task.threadId || activeThreadId || createImageThreadId();
    setFilter("recent");
    if (isPersistedTask) {
      setSelectedTaskId(task.id);
      setActiveThreadId(nextThreadId);
      setContextTaskIds((ids) =>
        writeImageGenerationThread(
          ids.includes(task.id) ? ids : [...ids, task.id],
        ),
      );
    }
    setComposerSeed({
      id: `reference-${task.id}-${Date.now()}`,
      prompt: "",
      referenceImage: {
        url: task.imageUrl || task.image,
        originalName: "引用结果图",
        size: 0,
        mimeType: "image/png",
      },
      notice: "",
    });
  }

  return (
    <section
      className={`image-gen-view ${filter === "recent" ? "is-generation-workbench image-gen-view--responsive-workbench" : ""} ${hasCompletedNotice ? "has-completed-notice" : ""}`}
    >
      <ImageGenerationTabs
        filter={filter}
        credits={credits}
        onShowInspiration={() => setFilter("inspiration")}
        onShowWorkbench={openImageGenerationWorkbench}
        onShowFavorites={() => setFilter("favorite")}
      />
      {hasCompletedNotice && filter !== "recent" && (
        <ImageCompletedNotice
          task={submittedTask}
          onReveal={revealGeneratedTask}
        />
      )}
      {filter === "recent" ? (
        <ImageGenerationWorkbench
          tasks={cards}
          historyThreads={historyThreads}
          selectedTask={selectedTask}
          contextTasks={contextTasks}
          activeTask={activeGenerationTask}
          activePrompt={activePrompt}
          submitError={submitError}
          isSubmitting={isSubmitting}
          options={options}
          composerSeed={composerSeed}
          ComposerBarComponent={ComposerBar}
          ComposerBarPlaceholderComponent={ComposerBarPlaceholder}
          BackToTopButtonComponent={BackToTopButton}
          ImageGeneratingSpinnerComponent={ImageGeneratingSpinner}
          onSubmit={createTask}
          resetSignal={resetSignal}
          onSeedApplied={applyComposerSeedApplied}
          onSelect={selectImageThread}
          onNewContext={startNewImageContext}
          onPreview={setPreviewTask}
          onReference={referenceTask}
          onRegenerate={requestRegenerate}
        />
      ) : (
        <ImageGalleryContent
          filter={filter}
          isComposerSticky={isComposerSticky}
          showComposer={showComposer}
          composerPlacement={composerPlacement}
          isComposerCollapsed={isComposerCollapsed}
          imageComposerRef={imageComposerRef}
          options={options}
          onSubmit={createTask}
          resetSignal={resetSignal}
          composerSeed={composerSeed}
          onSeedApplied={applyComposerSeedApplied}
          onComposerFocus={() => setIsComposerFocused(true)}
          tabs={imageInspirationCategoryTabs}
          activeCategory={imageInspirationCategory}
          onCategoryChange={setImageInspirationCategory}
          canRenderGallery={canRenderImageGallery}
          galleryItems={galleryItems}
          hasCompletedNotice={hasCompletedNotice}
          selectedTaskId={selectedTaskId}
          onPreview={setPreviewTask}
          onDelete={deleteTask}
          onFavorite={toggleFavorite}
          onRegenerate={requestRegenerate}
          incrementalState={visibleImageExampleCards}
          hasActiveGeneration={hasActiveGeneration}
        />
      )}

      <ImagePreviewLightbox
        task={previewTask}
        getInitialFavorite={isInspirationFavorite}
        onClose={() => setPreviewTask(null)}
        onCopyPrompt={copyTaskPrompt}
        onRemix={remixTask}
        onReference={referenceTask}
        onFavorite={togglePreviewFavorite}
      />
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
    </section>
  );
}
