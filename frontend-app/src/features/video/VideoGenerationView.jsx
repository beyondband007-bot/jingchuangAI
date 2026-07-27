import { useEffect, useMemo, useRef, useState } from "react";
import "../generation/generationResults.css";
import "../generation/generationWorkbench.css";
import "../generation/generationComposer.css";
import "../generation/generationResponsive.css";
import "./videoImmersive.css";
import { videoApi } from "../../api/videoApi";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import { BackToTopButton } from "../../components/BackToTopButton";
import { useToast } from "../../components/ToastProvider";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import {
  IncrementalLoadMoreIndicator,
  useIncrementalItems,
} from "../inspiration/incrementalItems";
import {
  getInspirationFavoriteId,
  inspirationFavoritesChangedEvent,
  isInspirationFavorite,
  loadInspirationFavoriteIds,
  readInspirationFavoriteIds,
  takePendingGenerationSeed,
  toggleInspirationFavoriteId,
  writePendingGenerationSeed,
} from "../generation/generationState";
import { applyCreditsUpdate } from "../generation/creditsState";
import { isLoggedInUser } from "../invite/inviteUtils";
import {
  getFeatureScrollContainer,
  getFeatureScrollTop,
  scrollFeatureTo,
} from "../../utils/featureScroll";
import { useVideoGenStateMachine } from "./useVideoGenStateMachine";
import { VideoGenerationContent } from "./VideoGenerationContent";
import {
  emptyVideoOptions,
  sortVideoTasksByNewest,
} from "./videoUtils";

export function VideoGenerationView({
  authUser,
  onOpenAuth,
  resetSignal = 0,
  isActive = true,
}) {
  const { showToast: showVideoPageToast } = useToast();
  const [filter, setFilter] = useState("inspiration");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyVideoOptions);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVideoHistoryLoading, setIsVideoHistoryLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [playingTask, setPlayingTask] = useState(null);
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState(null);
  const [favoriteInspirationIds, setFavoriteInspirationIds] = useState(() =>
    readInspirationFavoriteIds(),
  );
  const [videoInspirationCategory, setVideoInspirationCategory] =
    useState("all");
  const [videoInspirationCatalog, setVideoInspirationCatalog] = useState({
    items: [],
    tabs: [],
  });
  const [isVideoInspirationCatalogLoading, setIsVideoInspirationCatalogLoading] =
    useState(true);
  const [videoInspirationCatalogLoadError, setVideoInspirationCatalogLoadError] =
    useState(false);
  const [videoInspirationCatalogRetryKey, setVideoInspirationCatalogRetryKey] =
    useState(0);
  const [composerSeed, setComposerSeed] = useState(null);
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(
    () => getFeatureScrollTop() > 240,
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isVideoInspirationGridReady, setIsVideoInspirationGridReady] =
    useState(false);
  const videoComposerRef = useRef(null);
  const videoCardsRef = useRef([]);
  const taskStatusSignatureRef = useRef("");
  const previousVideoResetSignalRef = useRef(resetSignal);
  const isGuest = Boolean(authUser?.isGuest);

  const videoGen = useVideoGenStateMachine({
    onFailed: (message) => {
      showVideoPageToast(message || "视频生成失败");
      setIsSubmitting(false);
    },
    onReturnToList: (task) => {
      if (task?.video) {
        setPlayingTask(task);
      } else {
        setFilter("recent");
      }
      setIsSubmitting(false);
      scrollFeatureTo(0, { behavior: "smooth" });
    },
  });
  const isGenerationStageActive = Boolean(
    isActive && videoGen.isGenStageActive && videoGen.derivedState,
  );
  const isVideoImmersive = Boolean(isActive && playingTask?.video);

  useEffect(() => {
    let isMounted = true;
    setIsVideoInspirationCatalogLoading(true);
    setVideoInspirationCatalogLoadError(false);

    import("../../data/faceminiData")
      .then((module) => {
        if (!isMounted) return;
        setVideoInspirationCatalog({
          items: module.videoInspirationItems,
          tabs: module.videoInspirationCategoryTabs,
        });
      })
      .catch(() => {
        if (isMounted) setVideoInspirationCatalogLoadError(true);
      })
      .finally(() => {
        if (isMounted) setIsVideoInspirationCatalogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoInspirationCatalogRetryKey]);

  useEffect(() => {
    const shell = document.querySelector(".feature-page-shell");
    const featureMain = document.querySelector(
      ".app-shell__content.feature-main",
    );

    shell?.classList.toggle(
      "is-video-generation-stage",
      isGenerationStageActive,
    );
    featureMain?.classList.toggle(
      "is-video-generation-stage",
      isGenerationStageActive,
    );

    return () => {
      shell?.classList.remove("is-video-generation-stage");
      featureMain?.classList.remove("is-video-generation-stage");
    };
  }, [isGenerationStageActive]);

  useEffect(() => {
    const shell = document.querySelector(".feature-page-shell");
    const featureMain = document.querySelector(
      ".app-shell__content.feature-main",
    );

    shell?.classList.toggle("is-video-immersive", isVideoImmersive);
    featureMain?.classList.toggle("is-video-immersive", isVideoImmersive);

    return () => {
      shell?.classList.remove("is-video-immersive");
      featureMain?.classList.remove("is-video-immersive");
    };
  }, [isVideoImmersive]);

  useEffect(() => {
    if (previousVideoResetSignalRef.current === resetSignal) return;
    previousVideoResetSignalRef.current = resetSignal;
    setPlayingTask(null);
    setSelectedHistoryTask(null);
    setFilter("inspiration");
    setIsSubmitting(false);
    videoGen.resetToIdle();
  }, [resetSignal]);

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

  useEffect(() => {
    if (!isActive) return;
    const pendingSeed = takePendingGenerationSeed("video");
    if (!pendingSeed) return;
    setSelectedInspiration(null);
    setFilter("inspiration");
    setComposerSeed({
      id: `pending-video-${Date.now()}`,
      prompt: pendingSeed.prompt || "",
      referenceImage: pendingSeed.referenceImage || null,
      referenceVideo: pendingSeed.referenceVideo || null,
      notice: pendingSeed.notice || "",
    });
  }, [isActive]);

  function requestLoginForGeneration() {
    setSubmitError("");
    showVideoPageToast("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  // 模块由外层保活挂载，此处始终订阅任务列表
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value, runningValue = value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      videoApi.setHasRunningTasks(hasRunningTasks(runningValue));
      videoCardsRef.current = value;
      setCards(value);
      setSelectedHistoryTask((current) => {
        if (!current?.id) return current;
        const nextTask = value.find((item) => item.id === current.id);
        return nextTask || current;
      });
      if (didStatusChange) {
        videoApi
          .refreshCredits()
          .then(
            (creditsValue) =>
              mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    videoApi.getModels().then((value) => mounted && setOptions(value));
    videoApi
      .getCredits()
      .then((value) => mounted && applyCreditsUpdate(setCredits, value));
    async function refreshTasks() {
      const shouldShowHistoryLoading =
        filter !== "inspiration" && videoCardsRef.current.length === 0;
      if (shouldShowHistoryLoading) setIsVideoHistoryLoading(true);
      try {
        const [taskData, runningTaskData] =
          filter === "inspiration"
            ? [[], await videoApi.getTasks({ filter: "all" })]
            : await Promise.all([
                videoApi.getTasks({ filter }),
                videoApi.getTasks({ filter: "all" }),
              ]);
        applyTaskList(taskData, runningTaskData || taskData);
      } catch {
        // Keep the current history and polling state when a transient refresh fails.
      } finally {
        if (mounted && shouldShowHistoryLoading) {
          setIsVideoHistoryLoading(false);
        }
      }
    }
    refreshTasks();

    const unsubscribe = videoApi.subscribe(() => {
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
      if (next) setIsComposerFocused(false);
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
    function handleDocumentPointerDown(event) {
      const composer = videoComposerRef.current;
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

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    setPlayingTask(null);
    videoGen.startGeneration({
      prompt: payload.prompt,
      duration: payload.duration,
    });
    scrollFeatureTo(0, { behavior: "smooth" });

    try {
      const task = await videoApi.createTask(payload);
      videoGen.attachTaskId(task.id);
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      videoGen.failGeneration(error.message || "创建视频生成任务失败");
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
    }
  }

  async function performDeleteTask(id) {
    await videoApi.deleteTask(id);
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除视频记录？",
      message: "该视频生成记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    const updated = await videoApi.toggleFavorite(id);
    setCards((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
    setPlayingTask((current) => (current?.id === id ? updated : current));
    setSelectedHistoryTask((current) =>
      current?.id === id ? updated : current,
    );
    return Boolean(updated?.favorite);
  }

  async function toggleVideoInspirationFavorite(item) {
    if (!isLoggedInUser(authUser)) {
      requestLoginForGeneration();
      throw new Error("请先登录");
    }
    const nextValue = await toggleInspirationFavoriteId(
      getInspirationFavoriteId(item),
    );
    const nextIds = readInspirationFavoriteIds();
    setFavoriteInspirationIds(nextIds);
    setSelectedInspiration((current) =>
      current && getInspirationFavoriteId(current) === getInspirationFavoriteId(item)
        ? { ...current, favorite: nextValue }
        : current,
    );
    return nextValue;
  }

  function referenceVideoPoster(item, { onDone } = {}) {
    const referenceUrl =
      item?.poster ||
      item?.cover ||
      item?.thumbnail ||
      item?.referenceImageUrl ||
      item?.image ||
      "";
    if (!referenceUrl) {
      showVideoPageToast("该记录暂无可用参考图");
      return;
    }
    writePendingGenerationSeed({
      target: "image",
      referenceImage: {
        url: referenceUrl,
        originalName: `${item?.title || "视频封面"}.png`,
        size: 0,
        mimeType: "image/png",
      },
      notice: "已添加视频封面作为参考图",
    });
    onDone?.();
    window.history.pushState(null, "", "#/image");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function referenceVideoTask(task) {
    referenceVideoPoster(task, { onDone: () => setSelectedHistoryTask(null) });
  }

  function remixVideoTask(task) {
    if (!task) return;
    useVideoInspiration({
      id: task.id || `video-history-${Date.now()}`,
      prompt: task.prompt || "",
    });
    setSelectedHistoryTask(null);
  }

  async function regenerateTask(id) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    const sourceTask =
      playingTask?.id === id
        ? playingTask
        : cards.find((item) => item.id === id);
    setPlayingTask(null);
    videoGen.startGeneration({
      prompt: sourceTask?.prompt || "",
      duration: sourceTask?.duration || 5,
    });
    try {
      const task = await videoApi.regenerateTask(id);
      videoGen.attachTaskId(task.id);
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      videoGen.failGeneration(
        error.message || "创建视频生成任务失败",
      );
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
    }
  }

  const { requestRegenerate, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: regenerateTask,
    });

  const sortedCards = useMemo(() => sortVideoTasksByNewest(cards), [cards]);
  const filteredVideoInspirationItems = useMemo(
    () =>
      videoInspirationCategory === "all"
        ? videoInspirationCatalog.items
        : videoInspirationCatalog.items.filter(
            (item) => item.categoryId === videoInspirationCategory,
          ),
    [videoInspirationCatalog.items, videoInspirationCategory],
  );
  const visibleVideoInspirationItems = useIncrementalItems(
    filteredVideoInspirationItems,
    `video-${videoInspirationCategory}-${filteredVideoInspirationItems.length}`,
    { enabled: filter === "inspiration" },
  );
  const isComposerSticky = filter === "inspiration" && isComposerPastThreshold;
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;
  const showVideoComposer = options.models.length > 0 && filter === "inspiration";
  const canRenderVideoInspirationGrid =
    filter !== "inspiration" || isVideoInspirationGridReady;

  useEffect(() => {
    if (filter !== "inspiration") {
      setIsVideoInspirationGridReady(true);
      return undefined;
    }

    setIsVideoInspirationGridReady(false);
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsVideoInspirationGridReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [filter]);

  function openVideoInspiration() {
    setPlayingTask(null);
    setFilter("inspiration");
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    scrollFeatureTo(0, { behavior: "smooth" });
  }

  function selectVideoInspirationCategory(categoryId) {
    setVideoInspirationCategory(categoryId);
    setSelectedInspiration(null);
  }

  function retryVideoInspirationCatalogLoad() {
    setVideoInspirationCatalogRetryKey((value) => value + 1);
  }

  function useVideoInspiration(item) {
    setSelectedInspiration(null);
    setFilter("inspiration");
    setComposerSeed({
      id: `${item.id}-${Date.now()}`,
      prompt: item.prompt,
      notice: "已填入同款提示词",
    });
    window.requestAnimationFrame(() => {
      const scrollContainer = getFeatureScrollContainer();
      const containerTop = scrollContainer?.getBoundingClientRect().top || 0;
      const top =
        (videoComposerRef.current?.getBoundingClientRect().top || 0) +
        getFeatureScrollTop() -
        containerTop -
        92;
      scrollFeatureTo(Math.max(0, top), { behavior: "smooth" });
    });
  }

  return (
    <VideoGenerationContent
      videoGen={videoGen}
      playingTask={playingTask}
      filter={filter}
      setFilter={setFilter}
      credits={credits}
      isComposerSticky={isComposerSticky}
      isComposerCollapsed={isComposerCollapsed}
      showVideoComposer={showVideoComposer}
      options={options}
      createTask={createTask}
      resetSignal={resetSignal}
      composerSeed={composerSeed}
      videoComposerRef={videoComposerRef}
      setIsComposerFocused={setIsComposerFocused}
      canRenderVideoInspirationGrid={canRenderVideoInspirationGrid}
      isVideoInspirationCatalogLoading={isVideoInspirationCatalogLoading}
      videoInspirationCatalogLoadError={videoInspirationCatalogLoadError}
      retryVideoInspirationCatalogLoad={retryVideoInspirationCatalogLoad}
      videoInspirationCategoryTabs={videoInspirationCatalog.tabs}
      videoInspirationCategory={videoInspirationCategory}
      selectVideoInspirationCategory={selectVideoInspirationCategory}
      visibleVideoInspirationItems={visibleVideoInspirationItems}
      setSelectedInspiration={setSelectedInspiration}
      isVideoHistoryLoading={isVideoHistoryLoading}
      isSubmitting={isSubmitting}
      sortedCards={sortedCards}
      deleteTask={deleteTask}
      toggleFavorite={toggleFavorite}
      requestRegenerate={requestRegenerate}
      setSelectedHistoryTask={setSelectedHistoryTask}
      selectedInspiration={selectedInspiration}
      favoriteInspirationIds={favoriteInspirationIds}
      getInspirationFavoriteId={getInspirationFavoriteId}
      getInitialFavorite={isInspirationFavorite}
      useVideoInspiration={useVideoInspiration}
      toggleVideoInspirationFavorite={toggleVideoInspirationFavorite}
      referenceVideoPoster={referenceVideoPoster}
      selectedHistoryTask={selectedHistoryTask}
      remixVideoTask={remixVideoTask}
      referenceVideoTask={referenceVideoTask}
      deleteConfirmDialog={deleteConfirmDialog}
      regenerateConfirmDialog={regenerateConfirmDialog}
      BackToTopButtonComponent={BackToTopButton}
      IncrementalLoadMoreIndicatorComponent={IncrementalLoadMoreIndicator}
      openVideoInspiration={openVideoInspiration}
    />
  );
}
