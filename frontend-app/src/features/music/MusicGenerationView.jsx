import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Clock, Music, Sparkles } from "lucide-react";
import { AiMusicGenerationWorkbenchCard } from "../music-generation-ui/AiMusicGenerationWorkbenchCard";
import { MusicGeneratingPanel } from "./MusicGeneratingPanel";
import { MusicFullPagePlayer } from "./MusicFullPagePlayer";
import { MusicRecentGrid } from "./MusicRecentGrid";
import { musicApi } from "./musicApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { downloadMediaFile } from "../../api/mediaUrl.js";

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

function isInstrumentalFlag(value) {
  return value === true || value === 1 || value === "1";
}

function mapTaskFromApi(task, fallback = {}) {
  return {
    id: task.id,
    prompt: task.prompt || fallback.prompt || "",
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

function hasSuspiciousLyricsTimeline(task) {
  const timeline = task?.lyricsTimeline || [];
  if (!timeline.length) return false;
  const firstStart = Number(timeline[0]?.startMs || 0);
  const durationMs = Number(task?.durationMs || 0);
  if (firstStart > 15000) return true;
  if (durationMs > 0 && firstStart > durationMs * 0.35) return true;
  return false;
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

function generateCoverGradient(seed) {
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  ];
  const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

function randomMelodyDelayMs() {
  return 15000 + Math.floor(Math.random() * 15001);
}

export function MusicGenerationView({ resetSignal = 0 }) {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyricsOptimizer, setLyricsOptimizer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const [playerTask, setPlayerTask] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [syncingIds, setSyncingIds] = useState({});
  const toastTimerRef = useRef(null);
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
    setLyrics("");
    setIsInstrumental(false);
    setLyricsOptimizer(false);
    setIsGenerating(false);
    setNotice("");
    setToast(null);
    setViewTab("home");
    setPlayerTask(null);
    setShowPlayer(false);
    setSyncingIds({});
    resetGenerationFlow();
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [resetSignal]);

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
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  function showToast(type, message, { switchTab = false } = {}) {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
      if (switchTab) setViewTab("recent");
    }, 2000);
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
      const data = await musicApi.generate({
        prompt: fallback.prompt,
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

  function cancelGeneration() {
    pollTokenRef.current += 1;
    setIsGenerating(false);
    setShowPlayer(false);
    setPlayerTask(null);
    setNotice("");
    resetGenerationFlow();
  }

  async function syncLyricsInBackground(item, fallback = {}) {
    const context = { ...fallback, ...generationContextRef.current };
    const timelineIsSuspicious = hasSuspiciousLyricsTimeline(item);
    const needsSync = shouldSyncLyricsAfterGeneration(item, context)
      && (!hasSyncedLyrics(item) || timelineIsSuspicious);
    if (!needsSync) return;

    const taskId = item.id;
    setSyncingIds((current) => ({ ...current, [taskId]: true }));
    try {
      const synced = await syncLyricsAndGetTask(taskId, {
        force: timelineIsSuspicious,
      });
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
    if (!item?.audioUrl || item.status === "failed") return;
    const mapped = mapTaskFromApi(await musicApi.getTask(item.id).catch(() => item), item);
    setPlayerTask(mapped);
    setShowPlayer(true);
    resetGenerationFlow();
    setIsGenerating(false);
    setRecentResults((items) => updateRecentItem(items, item.id, mapped));

    if (!hasSyncedLyrics(mapped) || hasSuspiciousLyricsTimeline(mapped)) {
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

  const displayRecent = recentResults.slice(0, 4);
  const showGeneratingPanel = viewTab === "home" && generationStep >= 1 && generationStep <= 4;
  const showFullPagePlayer = showPlayer && playerTask?.audioUrl && !showGeneratingPanel;

  return (
    <section className="voice-conversion-view-root music-generation-view">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>历史记录</button>
      </div>

      <div className={`voice-conversion-canvas music-canvas ${viewTab === "recent" ? "is-recent is-history" : ""}${showFullPagePlayer ? " is-full-player" : ""}${showGeneratingPanel ? " is-generating" : ""}`}>
        {showFullPagePlayer ? (
          <MusicFullPagePlayer
            item={playerTask}
            items={recentResults}
            onBack={() => {
              setShowPlayer(false);
              setPlayerTask(null);
            }}
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
              generateCoverGradient={generateCoverGradient}
              onCancel={cancelGeneration}
              onViewAll={() => setViewTab("recent")}
              onSelectItem={openCompletedPlayer}
            />
          ) : (
            <div className="music-ref-layout">
              {/* Hero */}
              <div className="music-ref-hero">
                <h1><Music size={40} /> 创建你的音乐</h1>
                <p>输入歌词与风格，AI 为你创作独一无二的音乐作品 <Sparkles size={16} /></p>
              </div>

              {/* Form card */}
              <div className="music-ref-form">
                <AiMusicGenerationWorkbenchCard
                  prompt={prompt}
                  lyrics={lyrics}
                  isInstrumental={isInstrumental}
                  lyricsOptimizer={lyricsOptimizer}
                  model="music-2.6-free"
                  isGenerating={isGenerating}
                  canGenerate={canGenerate}
                  notice={notice}
                  currentResult={null}
                  onPromptChange={setPrompt}
                  onLyricsChange={setLyrics}
                  onToggleInstrumental={setIsInstrumental}
                  onToggleLyricsOptimizer={setLyricsOptimizer}
                  onGenerate={generate}
                  onUseStyleTag={appendPrompt}
                  onDownloadMp3={downloadMp3}
                  onDownloadLyrics={downloadLyrics}
                />
              </div>

              {/* Recent */}
              <div className="music-ref-recent">
                <div className="music-ref-section-head">
                  <h3><Clock size={18} /> 最近生成</h3>
                  <button type="button" className="music-ref-link" onClick={() => setViewTab("recent")}>
                    查看全部 <ChevronRight size={14} />
                  </button>
                </div>
                <MusicRecentGrid items={displayRecent} onSelectItem={openCompletedPlayer} />
              </div>
            </div>
          )
        ) : (
          <div className="music-ref-layout">
            <div className="music-ref-recent">
              <div className="music-ref-section-head">
                <h3><Clock size={18} /> 历史记录</h3>
              </div>
              <MusicRecentGrid items={recentResults} onSelectItem={openCompletedPlayer} />
            </div>
          </div>
        )}
      </div>

      {toast ? (
        <div className={`music-toast music-toast--${toast.type}`}>
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
