import React, { useEffect, useRef, useState } from "react";
import "./musicStyles.css";
import { Music } from "lucide-react";
import { MusicCoverCropModal } from "../music-generation-ui/MusicCoverCropModal";
import { MusicRenameDialog } from "./MusicRenameDialog";
import { MusicGeneratingPanel } from "./MusicGeneratingPanel";
import { MusicFullPagePlayer } from "./MusicFullPagePlayer";
import { MusicHistoryList, MusicReferenceComposer } from "./MusicReferenceLayouts";
import { musicApi } from "./musicApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { downloadMediaFile } from "../../api/mediaUrl.js";
import { needsLyricTimelineRepair } from "./musicPlayerUtils";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";

const musicRecentStorageKey = "jingchuang.music.recentResults";

function loadRecentResults() {
  try {
    return JSON.parse(window.localStorage.getItem(musicRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

function makeFileName(prefix, ext) {
  const stamp = formatBeijingStamp();
  return `${prefix}-${stamp}.${ext}`;
}

function downloadBlob({ content, fileName, type }) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("封面图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function isInstrumentalFlag(value) {
  return value === true || value === 1 || value === "1";
}

function mapTaskFromApi(task, fallback = {}) {
  return {
    id: task.id,
    prompt: task.prompt || fallback.prompt || "",
    title: task.title || fallback.title || "",
    coverUrl: task.coverUrl || fallback.coverUrl || "",
    lyrics: task.lyrics || fallback.lyrics || "",
    model: task.model || fallback.model || "music-2.6-free",
    isInstrumental: isInstrumentalFlag(task.isInstrumental ?? fallback.isInstrumental),
    audioUrl: task.audioUrl || "",
    durationMs: task.durationMs || 0,
    musicSize: task.musicSize || 0,
    traceId: task.traceId || "",
    lyricsTimeline: Array.isArray(task.lyricsTimeline) ? task.lyricsTimeline : [],
    lyricsSyncStatus: task.lyricsSyncStatus || "none",
    lyricsSyncError: task.lyricsSyncError || "",
    status: task.status || (task.audioUrl ? "completed" : "processing"),
    error: task.error || "",
    createdAt: task.createdAt || formatBeijingDateTime()
  };
}

function updateRecentItem(items, id, patch) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

async function waitForMusicTask(taskId, { attempts = 80, intervalMs = 3000 } = {}) {
  let task = await musicApi.getTask(taskId);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (task.status === "completed" || task.status === "failed") return task;
    await sleep(intervalMs);
    task = await musicApi.getTask(taskId);
  }
  throw new Error("音乐仍在生成中，请稍后到历史记录里查看。");
}

async function waitForLyricsSync(taskId, { attempts = 80, intervalMs = 3000 } = {}) {
  let task = await musicApi.getTask(taskId);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const hasTimeline = Array.isArray(task.lyricsTimeline) && task.lyricsTimeline.length > 0;
    if (task.lyricsSyncStatus === "completed" && hasTimeline) return task;
    if (task.lyricsSyncStatus === "failed") return task;
    if (task.status === "failed") return task;
    await sleep(intervalMs);
    task = await musicApi.getTask(taskId);
  }
  return task;
}

function hasSyncedLyrics(task) {
  return task.lyricsSyncStatus === "completed"
    && Array.isArray(task.lyricsTimeline)
    && task.lyricsTimeline.length > 0;
}

function shouldSyncLyricsAfterGeneration(mapped, fallback = {}) {
  const instrumental = isInstrumentalFlag(mapped.isInstrumental) || isInstrumentalFlag(fallback.isInstrumental);
  const lyricsText = String(mapped.lyrics || fallback.lyrics || "").trim();
  return !instrumental && lyricsText.length > 0;
}

async function syncLyricsAndGetTask(taskId, { force = false } = {}) {
  const initial = await musicApi.getTask(taskId);
  if (hasSyncedLyrics(initial) && !force) return initial;

  const shouldForceInitialSync = force || initial.lyricsSyncStatus === "failed";
  await musicApi.syncLyrics(taskId, { force: shouldForceInitialSync });

  let task = await waitForLyricsSync(taskId);
  if (hasSyncedLyrics(task)) return task;

  if (task.lyricsSyncStatus === "failed" || task.lyricsSyncStatus === "completed") {
    await musicApi.syncLyrics(taskId, { force: true });
    task = await waitForLyricsSync(taskId, { attempts: 40 });
  }

  return task;
}

function randomMelodyDelayMs() {
  return 15000 + Math.floor(Math.random() * 15001);
}

export function MusicGenerationView({ onOpenFeature, resetSignal = 0 }) {
  const { showToast: showGlobalToast, dismissToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyricsOptimizer, setLyricsOptimizer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playerTask, setPlayerTask] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [syncingIds, setSyncingIds] = useState({});
  const [coverEditItem, setCoverEditItem] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const delayedNavigationTimerRef = useRef(null);
  const pollTokenRef = useRef(0);
  const melodyTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const step2DeadlineRef = useRef(0);
  const step2DurationRef = useRef(0);
  const generationContextRef = useRef({ lyrics: "", isInstrumental: false });

  const canGenerate = isInstrumental
    ? prompt.trim().length > 0
    : prompt.trim().length > 0 && lyrics.trim().length > 0;

  useEffect(() => {
    let mounted = true;
    musicApi.getTasks().then((items) => {
      if (mounted) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(musicRecentStorageKey, JSON.stringify(recentResults));
    } catch {
      // Recent history is optional.
    }
  }, [recentResults]);

  useEffect(() => {
    if (!resetSignal) return;
    pollTokenRef.current += 1;
    setPrompt("");
    setTitle("");
    setCoverFile(null);
    setCoverPreview("");
    setLyrics("");
    setIsInstrumental(false);
    setLyricsOptimizer(false);
    setIsGenerating(false);
    setNotice("");
    setViewTab("home");
    setPlayerTask(null);
    setShowPlayer(false);
    setSyncingIds({});
    setCoverEditItem(null);
    setRenameItem(null);
    resetGenerationFlow();
    dismissToast();
    if (delayedNavigationTimerRef.current) {
      window.clearTimeout(delayedNavigationTimerRef.current);
      delayedNavigationTimerRef.current = null;
    }
  }, [resetSignal]);

  function closePlayerAndGoHome() {
    setShowPlayer(false);
    setPlayerTask(null);
    setViewTab("home");
  }

  useEffect(() => {
    function handleMusicHome() {
      closePlayerAndGoHome();
    }

    window.addEventListener("facemini:music-home", handleMusicHome);
    return () => window.removeEventListener("facemini:music-home", handleMusicHome);
  }, []);

  function clearGenerationTimers() {
    if (melodyTimerRef.current) {
      window.clearTimeout(melodyTimerRef.current);
      melodyTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function resetGenerationFlow() {
    clearGenerationTimers();
    setGenerationStep(0);
    setProgressPercent(0);
    setEtaSeconds(0);
    step2DeadlineRef.current = 0;
    step2DurationRef.current = 0;
  }

  function beginMelodyStep() {
    const delay = randomMelodyDelayMs();
    step2DurationRef.current = delay;
    step2DeadlineRef.current = Date.now() + delay;
    setGenerationStep(2);
    setEtaSeconds(Math.ceil(delay / 1000));
    melodyTimerRef.current = window.setTimeout(() => {
      setGenerationStep(3);
      setEtaSeconds(0);
      melodyTimerRef.current = null;
    }, delay);
  }

  function finishGenerationFlow() {
    clearGenerationTimers();
    setGenerationStep(0);
    setProgressPercent(100);
    setEtaSeconds(0);
    setIsGenerating(false);
    setShowPlayer(true);
  }

  useEffect(() => {
    if (generationStep < 1 || generationStep > 4) return undefined;

    progressTimerRef.current = window.setInterval(() => {
      if (generationStep === 1) {
        setProgressPercent((current) => Math.min(14, current + 1));
        return;
      }

      if (generationStep === 2 && step2DeadlineRef.current > 0) {
        const remaining = Math.max(0, step2DeadlineRef.current - Date.now());
        const elapsed = step2DurationRef.current - remaining;
        const ratio = step2DurationRef.current > 0 ? elapsed / step2DurationRef.current : 0;
        setProgressPercent(15 + Math.round(ratio * 25));
        setEtaSeconds(Math.max(0, Math.ceil(remaining / 1000)));
        return;
      }

      if (generationStep === 3) {
        setProgressPercent((current) => Math.min(88, current + 1));
        return;
      }

      if (generationStep === 4) {
        setProgressPercent((current) => Math.min(99, current + 1));
      }
    }, 500);

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [generationStep]);

  useEffect(() => () => {
    clearGenerationTimers();
    if (delayedNavigationTimerRef.current) window.clearTimeout(delayedNavigationTimerRef.current);
  }, []);

  function showToast(type, message, { switchTab = false } = {}) {
    showGlobalToast(message, { type });
    if (delayedNavigationTimerRef.current) window.clearTimeout(delayedNavigationTimerRef.current);
    if (switchTab) {
      delayedNavigationTimerRef.current = window.setTimeout(() => {
        delayedNavigationTimerRef.current = null;
        setViewTab("recent");
      }, 2000);
    }
  }

  function applyTaskUpdate(taskId, apiTask, fallback = {}) {
    const mapped = mapTaskFromApi(apiTask, fallback);
    setPlayerTask((current) => (current?.id === taskId ? mapped : current));
    setRecentResults((items) => updateRecentItem(items, taskId, mapped));
    return mapped;
  }

  async function pollGenerationResult(taskId, fallback, pollToken) {
    const token = pollToken ?? pollTokenRef.current;
    try {
      const completed = await waitForMusicTask(taskId);
      if (token !== pollTokenRef.current) return;

      if (completed.status === "failed") {
        throw new Error(completed.error || "音乐生成失败，请稍后重试。");
      }
      if (!completed.audioUrl) {
        throw new Error("音乐已完成，但未返回音频文件。");
      }

      let mapped = applyTaskUpdate(taskId, completed, fallback);
      const shouldSyncLyrics = shouldSyncLyricsAfterGeneration(
        mapped,
        { ...fallback, ...generationContextRef.current }
      );

      if (shouldSyncLyrics) {
        setGenerationStep(4);
        setProgressPercent(90);
        setNotice("音乐生成完成，正在同步歌词...");
        setSyncingIds((current) => ({ ...current, [taskId]: true }));
        const synced = await syncLyricsAndGetTask(taskId);
        if (token !== pollTokenRef.current) return;
        mapped = applyTaskUpdate(taskId, synced, fallback);
        setSyncingIds((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });

        if (!hasSyncedLyrics(mapped)) {
          showToast("error", mapped.lyricsSyncError || "歌词同步失败，不影响音乐播放。");
        }
      }

      if (token !== pollTokenRef.current) return;
      setNotice("");
      finishGenerationFlow();
      showToast("success", shouldSyncLyrics && hasSyncedLyrics(mapped)
        ? "音乐生成成功，歌词已同步"
        : "音乐生成成功");
    } catch (error) {
      if (token !== pollTokenRef.current) return;
      const failedTask = await musicApi.getTask(taskId).catch(() => null);
      if (failedTask) {
        applyTaskUpdate(taskId, failedTask, fallback);
      } else {
        setPlayerTask((current) => (current?.id === taskId
          ? { ...current, status: "failed", error: error.message }
          : current));
        setRecentResults((items) => updateRecentItem(items, taskId, {
          status: "failed",
          error: error.message || "音乐生成失败"
        }));
      }
      setNotice(error.message || "生成失败");
      showToast("error", "音乐生成失败，请稍后重试");
      resetGenerationFlow();
    }
  }

  async function generate() {
    if (!prompt.trim()) {
      setNotice("请输入风格描述。");
      return;
    }
    if (!isInstrumental && !lyrics.trim() && !lyricsOptimizer) {
      setNotice("请输入歌词，或开启自动优化歌词。");
      return;
    }

    const fallback = {
      prompt: prompt.trim(),
      title: title.trim(),
      coverUrl: "",
      lyrics: isInstrumental ? "" : lyrics.trim(),
      model: "music-2.6-free",
      isInstrumental
    };

    generationContextRef.current = {
      lyrics: fallback.lyrics,
      isInstrumental: fallback.isInstrumental
    };

    pollTokenRef.current += 1;
    const pollToken = pollTokenRef.current;

    setNotice("");
    setIsGenerating(true);
    clearGenerationTimers();
    setGenerationStep(1);
    setProgressPercent(6);
    setEtaSeconds(0);
    setShowPlayer(false);

    try {
      const cover = coverFile ? await readFileAsDataUrl(coverFile) : "";
      const data = await musicApi.generate({
        prompt: fallback.prompt,
        title: fallback.title,
        cover,
        lyrics: fallback.lyrics,
        model: fallback.model,
        isInstrumental,
        lyricsOptimizer: isInstrumental ? false : lyricsOptimizer
      });

      const pendingTask = mapTaskFromApi({
        ...data,
        status: data.status || "processing",
        audioUrl: data.audioUrl || ""
      }, fallback);

      setPlayerTask(pendingTask);
      setRecentResults((items) => [pendingTask, ...items.filter((item) => item.id !== pendingTask.id)].slice(0, 20));
      setNotice("音乐任务已提交，正在生成中...");
      beginMelodyStep();

      pollGenerationResult(pendingTask.id, fallback, pollToken);
    } catch (error) {
      setNotice(error.message || "生成失败");
      showToast("error", "音乐生成失败，请稍后重试");
      setIsGenerating(false);
      resetGenerationFlow();
    }
  }

  async function downloadMp3() {
    if (!playerTask?.audioUrl) return;
    try {
      await downloadMediaFile(playerTask.audioUrl, makeFileName("ai-music", "mp3"));
      setNotice("音乐已下载。");
    } catch (error) {
      setNotice(error.message || "音乐下载失败");
    }
  }

  function downloadLyrics() {
    if (!playerTask?.lyrics) return;
    downloadBlob({
      content: playerTask.lyrics,
      fileName: makeFileName("ai-music-lyrics", "txt"),
      type: "text/plain;charset=utf-8"
    });
  }

  function appendPrompt(textToAppend) {
    setPrompt((current) => [current.trim(), textToAppend].filter(Boolean).join("，").slice(0, 200));
  }

  function handleCoverChange(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片格式的封面文件。");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("封面图片大小不能超过 5MB。");
      return;
    }
    setNotice("");
    setCoverFile(file);
    setCoverPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function handleCoverRemove() {
    setCoverFile(null);
    setCoverPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  }

  useEffect(() => () => {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  function cancelGeneration() {
    pollTokenRef.current += 1;
    setIsGenerating(false);
    setShowPlayer(false);
    setPlayerTask(null);
    setNotice("");
    resetGenerationFlow();
  }

  function retryFailedItem(item) {
    setPrompt(item?.prompt || "");
    setTitle(item?.title || "");
    setLyrics(item?.lyrics || "");
    setIsInstrumental(Boolean(item?.isInstrumental));
    setLyricsOptimizer(false);
    setShowPlayer(false);
    setPlayerTask(null);
    setViewTab("home");
    setNotice("已恢复失败任务的创作参数，请确认后重新生成。");
  }

  async function syncLyricsInBackground(item, fallback = {}) {
    const context = { ...fallback, ...generationContextRef.current };
    const needsTimelineRepair = needsLyricTimelineRepair(item?.lyricsTimeline, item?.durationMs);
    const needsSync = shouldSyncLyricsAfterGeneration(item, context)
      && (!hasSyncedLyrics(item) || needsTimelineRepair);
    if (!needsSync) return;

    const taskId = item.id;
    setSyncingIds((current) => ({ ...current, [taskId]: true }));
    try {
      const synced = await syncLyricsAndGetTask(taskId, { force: needsTimelineRepair });
      const mapped = mapTaskFromApi(synced, { ...item, ...context });
      setRecentResults((items) => updateRecentItem(items, taskId, mapped));
      setPlayerTask((current) => (current?.id === taskId ? mapped : current));
    } catch {
      const latest = await musicApi.getTask(taskId).catch(() => null);
      if (!latest) return;
      const mapped = mapTaskFromApi(latest, { ...item, ...context });
      setRecentResults((items) => updateRecentItem(items, taskId, mapped));
      setPlayerTask((current) => (current?.id === taskId ? mapped : current));
    } finally {
      setSyncingIds((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
    }
  }

  async function openCompletedPlayer(item) {
    if (!item?.id || item.status === "failed") return;
    const mapped = mapTaskFromApi(await musicApi.getTask(item.id).catch(() => item), item);
    if (!mapped.audioUrl || mapped.status === "failed") return;
    setPlayerTask(mapped);
    setShowPlayer(true);
    resetGenerationFlow();
    setIsGenerating(false);
    setRecentResults((items) => updateRecentItem(items, item.id, mapped));

    if (!hasSyncedLyrics(mapped) || needsLyricTimelineRepair(mapped.lyricsTimeline, mapped.durationMs)) {
      setNotice("歌词时间轴同步中，完成后将自动逐字高亮。");
      void syncLyricsInBackground(mapped, item).finally(() => {
        setNotice((current) => (
          current === "歌词时间轴同步中，完成后将自动逐字高亮。" ? "" : current
        ));
      });
    }
  }

  function selectPlayerTrack(item) {
    if (!item?.audioUrl || item.status === "failed") return;
    const mapped = mapTaskFromApi(item, item);
    setPlayerTask(mapped);
    setRecentResults((items) => updateRecentItem(items, item.id, mapped));
    void syncLyricsInBackground(mapped, item);
  }

  async function downloadRecentItem(item) {
    if (!item?.audioUrl) {
      showToast("error", "音频尚未生成完成，暂时无法下载。");
      return;
    }
    try {
      const safeName = String(item.title || item.prompt || "ai-music").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
      await downloadMediaFile(item.audioUrl, `${safeName}-${formatBeijingStamp()}.mp3`);
      showToast("success", "音乐已下载。");
    } catch (error) {
      showToast("error", error.message || "音乐下载失败。");
    }
  }

  function requestEditCoverItem(item) {
    if (!item?.id || item.status === "processing") return;
    setCoverEditItem(item);
  }

  async function handleCoverEditConfirm(file) {
    if (!coverEditItem?.id || !file) return;

    const taskId = coverEditItem.id;
    try {
      const cover = await readFileAsDataUrl(file);
      const updated = await musicApi.updateTaskCover(taskId, cover);
      const coverUrl = updated.coverUrl
        ? `${updated.coverUrl}${updated.coverUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
        : "";
      applyTaskUpdate(taskId, { ...updated, coverUrl });
      showToast("success", "封面已更新。");
    } catch (error) {
      showToast("error", error.message || "封面更新失败，请稍后重试");
    } finally {
      setCoverEditItem(null);
    }
  }

  function requestRenameItem(item) {
    if (!item?.id || item.status === "processing") return;
    setRenameItem(item);
  }

  async function handleRenameConfirm(nextTitle) {
    if (!renameItem?.id) return;

    const taskId = renameItem.id;
    const updated = await musicApi.updateTaskTitle(taskId, nextTitle);
    applyTaskUpdate(taskId, updated, renameItem);
    setRenameItem(null);
    showToast("success", "歌曲名称已修改。");
  }

  async function performDeleteMusicTask(id) {
    await musicApi.deleteTask(id);
    if (playerTask?.id === id) {
      setShowPlayer(false);
      setPlayerTask(null);
    }
    setRecentResults((items) => items.filter((item) => item.id !== id));
    showToast("success", "已删除音乐记录。");
  }

  const { requestDelete: requestDeleteMusicTask, deleteConfirmDialog } = useDeleteConfirmation({
    onConfirm: async (id) => {
      try {
        await performDeleteMusicTask(id);
      } catch (error) {
        showToast("error", error.message || "删除失败，请稍后重试。");
        throw error;
      }
    },
    title: "删除音乐记录？",
    message: "删除后将无法恢复，请确认是否继续。",
  });

  function requestDeleteRecentItem(item) {
    requestDeleteMusicTask(item.id, {
      targetName: item.title || item.prompt || "AI 音乐",
    });
  }

  const displayRecent = recentResults.slice(0, 4);
  const showGeneratingPanel = viewTab === "home" && generationStep >= 1 && generationStep <= 4;
  const showFullPagePlayer = showPlayer && playerTask?.audioUrl && !showGeneratingPanel;
  const showRechargeAlert = isRechargeRequiredMessage(notice);

  function closeRechargeAlert() {
    setNotice("");
  }

  function goToRecharge() {
    closeRechargeAlert();
    onOpenFeature?.("billing");
  }

  return (
    <section className="voice-conversion-view-root music-generation-view">
      <FeatureViewTabs
        currentLabel="AI音乐"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={closePlayerAndGoHome}
        onHistory={() => setViewTab("recent")}
      />

      <div className={`voice-conversion-canvas music-canvas ${viewTab === "recent" ? "is-recent is-history" : ""}${showFullPagePlayer ? " is-full-player" : ""}${showGeneratingPanel ? " is-generating" : ""}`}>
        {showFullPagePlayer ? (
          <MusicFullPagePlayer
            item={playerTask}
            items={recentResults}
            onBack={closePlayerAndGoHome}
            onSelectItem={selectPlayerTrack}
          />
        ) : viewTab === "home" ? (
          showGeneratingPanel ? (
            <MusicGeneratingPanel
              activeStep={generationStep}
              progressPercent={progressPercent}
              etaSeconds={etaSeconds}
              recentItems={displayRecent}
              generatingId={playerTask?.id || ""}
              onCancel={cancelGeneration}
              onViewAll={() => setViewTab("recent")}
              onSelectItem={openCompletedPlayer}
              onDownloadItem={downloadRecentItem}
              onEditCoverItem={requestEditCoverItem}
              onRenameItem={requestRenameItem}
              onDeleteItem={requestDeleteRecentItem}
              onRetryItem={retryFailedItem}
            />
          ) : (
            <MusicReferenceComposer
              composerProps={{
                prompt,
                title,
                coverPreview,
                lyrics,
                isInstrumental,
                lyricsOptimizer,
                model: "music-2.6-free",
                isGenerating,
                canGenerate,
                notice,
                currentResult: null,
                onPromptChange: setPrompt,
                onTitleChange: setTitle,
                onCoverChange: handleCoverChange,
                onCoverRemove: handleCoverRemove,
                onLyricsChange: setLyrics,
                onToggleInstrumental: setIsInstrumental,
                onToggleLyricsOptimizer: setLyricsOptimizer,
                onGenerate: generate,
                onUseStyleTag: appendPrompt,
                onDownloadMp3: downloadMp3,
                onDownloadLyrics: downloadLyrics,
              }}
              recentItems={displayRecent}
              onViewAll={() => setViewTab("recent")}
              onSelectItem={openCompletedPlayer}
              onDownloadItem={downloadRecentItem}
              onEditCoverItem={requestEditCoverItem}
              onRenameItem={requestRenameItem}
              onDeleteItem={requestDeleteRecentItem}
              onRetryItem={retryFailedItem}
            />
          )
        ) : (
          <MusicHistoryList
            items={recentResults}
            onSelectItem={openCompletedPlayer}
            onDownloadItem={downloadRecentItem}
            onEditCoverItem={requestEditCoverItem}
            onRenameItem={requestRenameItem}
            onDeleteItem={requestDeleteRecentItem}
            onRetryItem={retryFailedItem}
          />
        )}
      </div>

      {showRechargeAlert && (
        <CreditAlertDialog
          title="这次没有生成音乐"
          message={notice}
          icon={<Music size={28} />}
          onClose={closeRechargeAlert}
          onRecharge={goToRecharge}
        />
      )}
      {deleteConfirmDialog}
      <MusicCoverCropModal
        open={Boolean(coverEditItem)}
        initialPreview={coverEditItem?.coverUrl || ""}
        onClose={() => setCoverEditItem(null)}
        onConfirm={handleCoverEditConfirm}
      />
      <MusicRenameDialog
        item={renameItem}
        onClose={() => setRenameItem(null)}
        onConfirm={handleRenameConfirm}
      />
    </section>
  );
}
