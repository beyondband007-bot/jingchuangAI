import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Play,
  Star,
  Trash2,
  Upload,
  Video,
  Volume2,
  X
} from "lucide-react";
import { videoDubbingApi } from "./videoDubbingApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { emitCreditsUpdated } from "../../api/creditsEvents";

const FAVORITES_KEY = "jingchuang.video-dub.favorites";
const videoDubRunningStatuses = new Set(["pending", "processing"]);

function readFavoriteIds() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function formatDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function readVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : 0;
      cleanup();
      resolve(durationMs);
    };
    video.onerror = () => {
      cleanup();
      resolve(0);
    };
    video.src = url;
  });
}

function makeDownloadName(prefix = "video-dub", ext = "mp4") {
  const stamp = formatBeijingStamp();
  return `${prefix}-${stamp}.${ext}`;
}

function VideoUploadSlot({ fileState, isUploading, onPick, onClear }) {
  const inputRef = useRef(null);
  const hasFile = Boolean(fileState?.fileName);
  function pickFile(file) {
    if (file && !isUploading) onPick(file);
  }

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <button
      className={`video-dub-upload-slot ${hasFile ? "has-file" : ""}`}
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pickFile(event.dataTransfer.files?.[0]);
      }}
      disabled={isUploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/mov,video/avi,video/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          pickFile(file);
        }}
      />
      {hasFile && !isUploading && (
        <span
          className="upload-clear-button"
          role="button"
          tabIndex={0}
          title="取消上传"
          aria-label="取消上传"
          onClick={clearFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") clearFile(event);
          }}
        >
          <X size={13} />
        </span>
      )}
      <span className="video-dub-upload-icon">
        {isUploading ? <Loader2 size={20} /> : <Upload size={20} />}
      </span>
      <strong>{hasFile ? fileState.fileName : <><span className="upload-plus">+</span>上传视频文件</>}</strong>
      <small>
        {hasFile
          ? `${formatDuration(fileState.durationMs) || "已选择"} · ${formatBytes(fileState.size)}`
          : "支持 mp4 / webm / mov / avi，建议 2GB 以内"}
      </small>
    </button>
  );
}

const STAGE_LABELS = {
  uploaded: "已上传",
  queued: "等待处理",
  extracting_frames: "抽帧中",
  analyzing_video: "分析视频",
  generating_script: "生成文案",
  generating_voice: "生成配音",
  generating_bgm: "生成BGM",
  composing_video: "合成视频",
  completed: "已完成",
  failed: "失败"
};

const STAGE_ORDER = [
  "queued",
  "extracting_frames",
  "analyzing_video",
  "generating_script",
  "generating_voice",
  "generating_bgm",
  "composing_video",
  "completed",
  "failed"
];

function ProgressStage({ currentStage }) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="video-dub-progress">
      {STAGE_ORDER.map((stage, i) => (
        <span
          key={stage}
          className={`video-dub-progress-step ${
            i < currentIndex ? "done" : i === currentIndex ? "active" : ""
          }`}
        >
          {i < currentIndex ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
          {STAGE_LABELS[stage] || stage}
        </span>
      ))}
    </div>
  );
}

function VideoCard({ item, isFavorite, onPlay, onDownload, onDelete, onToggleFavorite }) {
  const isCompleted = item.status === "completed";
  const isFailed = item.status === "failed";
  const isProcessing = !isCompleted && !isFailed;

  return (
    <article className={`video-dub-recent-card ${item.status ? `status-${item.status}` : ""}`}>
      <div className="video-dub-recent-art">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.sourceFileName} />
        ) : (
          <Film size={34} />
        )}
        {isProcessing && <div className="video-dub-recent-overlay"><Loader2 size={18} /></div>}
        {isFailed && <div className="video-dub-recent-overlay is-failed"><span>失败</span></div>}
        {isCompleted && item.result?.videoUrl && (
          <button
            className="video-dub-recent-play"
            type="button"
            onClick={() => onPlay(item)}
            aria-label="播放"
          >
            <Play size={16} fill="currentColor" />
          </button>
        )}
      </div>
      {isProcessing && item.stage && (
        <div className="video-dub-recent-stage">
          <span>{STAGE_LABELS[item.stage] || item.stage}</span>
          {typeof item.progress === "number" && (
            <div className="video-dub-progress-bar">
              <div className="video-dub-progress-fill" style={{ width: `${item.progress}%` }} />
            </div>
          )}
        </div>
      )}
      <div className="video-dub-recent-info">
        <strong>{item.sourceFileName || "视频配音"}</strong>
        <span>
          {item.createdAt
            ? formatBeijingDateTime(item.createdAt)
            : ""}
          {item.error ? ` · ${item.error}` : ""}
        </span>
      </div>
      {isCompleted && item.result?.videoUrl && (
        <div className="video-dub-recent-actions">
            <button
              className={`video-dub-favorite-button ${isFavorite ? "is-favorite" : ""}`}
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              title={isFavorite ? "取消收藏" : "收藏"}
              aria-label={isFavorite ? "取消收藏" : "收藏"}
            >
              <Star size={15} fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "已收藏" : "收藏"}
            </button>
            <button
              className="video-dub-recent-icon-button"
              type="button"
              onClick={() => onDownload(item)}
              title="下载视频"
              aria-label="下载视频"
            >
              <Download size={15} />
            </button>
            <button
              className="video-dub-recent-icon-button is-danger"
              type="button"
              onClick={() => onDelete(item.id)}
              title="删除"
              aria-label="删除"
            >
              <Trash2 size={15} />
            </button>
        </div>
      )}
      {isFailed && (
        <div className="video-dub-recent-actions">
          <button
            className="video-dub-recent-icon-button is-danger"
            type="button"
            onClick={() => onDelete(item.id)}
            title="删除"
            aria-label="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </article>
  );
}

export function VideoDubbingView({ authUser, resetSignal = 0 }) {
  const [videoFile, setVideoFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState({});
  const [viewTab, setViewTab] = useState("home");
  const [previewTask, setPreviewTask] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => readFavoriteIds());
  const [currentStage, setCurrentStage] = useState("");
  const [toast, setToast] = useState(null);
  const currentTaskStatusRef = useRef("");
  const toastTimerRef = useRef(null);
  const isGuest = Boolean(authUser?.isGuest);

  function showToast(type, message) {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }

  function refreshCredits() {
    videoDubbingApi
      .getCredits()
      .then((credits) => emitCreditsUpdated(credits))
      .catch(() => {});
  }

  useEffect(() => {
    let mounted = true;
    videoDubbingApi.getConfig().then((data) => {
      if (mounted) setConfig(data);
    }).catch(() => {});
    loadTasks();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!resetSignal) return;
    setVideoFile(null);
    setNotice("");
    setIsUploading(false);
    setIsSubmitting(false);
    setViewTab("home");
    setPreviewTask(null);
    setCurrentStage("");
    setToast(null);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [resetSignal]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  // Poll current task stage/progress
  useEffect(() => {
    if (!currentTaskId) return undefined;
    const interval = setInterval(async () => {
      try {
        const task = await videoDubbingApi.getTask(currentTaskId);
        const nextStatus = task.status || "";
        if (
          currentTaskStatusRef.current &&
          currentTaskStatusRef.current !== nextStatus
        ) {
          refreshCredits();
        }
        currentTaskStatusRef.current = nextStatus;
        if (task.status === "completed" || task.status === "failed") {
          setCurrentTaskId(null);
          clearInterval(interval);
          if (task.status === "completed") {
            showToast("success", "视频配音生成成功");
          } else {
            showToast("error", "视频配音生成失败，请稍后重试");
          }
        }
        setCurrentStage(task.stage || task.status || "");
        setTasks((prev) => prev.map((t) => (t.id === currentTaskId ? { ...t, ...task } : t)));
      } catch {
        // ignore polling errors
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [currentTaskId]);

  async function loadTasks() {
    try {
      const data = await videoDubbingApi.getTasks();
      const items = data.tasks || data || [];
      setTasks(items);
      const runningTask = items.find((task) => videoDubRunningStatuses.has(task.status));
      if (runningTask) {
        setCurrentTaskId((current) => current || runningTask.id);
      }
    } catch {
      // ignore
    }
  }

  async function pickVideoFile(file) {
    setNotice("");
    try {
      if (file.size > 2 * 1024 * 1024 * 1024) {
        throw new Error("视频文件需小于 2GB");
      }
      const durationMs = await readVideoDuration(file);
      setVideoFile({ file, fileName: file.name, size: file.size, durationMs });
      setNotice("视频已选择，可以开始配音");
    } catch (error) {
      setNotice(error.message || "视频选择失败");
    }
  }

  function clearVideoFile() {
    setVideoFile(null);
    setNotice("");
  }

  async function submitDub() {
    if (isGuest) {
      setNotice("积分不够，请充值");
      return;
    }

    if (!videoFile?.file) {
      setNotice("请先上传视频文件");
      return;
    }

    setNotice("");
    setIsUploading(true);
    try {
      const uploadResult = await videoDubbingApi.uploadVideo(videoFile.file);
      setIsUploading(false);
      const sourceAssetId = uploadResult.sourceAssetId;

      setIsSubmitting(true);
      const taskResult = await videoDubbingApi.createTask({
        sourceAssetId,
        voiceId: config.defaultVoiceId || "male-qn-qingse",
        language: "zh",
        bgmEnabled: true,
        bgmVolume: 0.25,
        qwenMode: "auto"
      });
      const taskId = taskResult.taskId || taskResult.id;
      setCurrentTaskId(taskId);
      currentTaskStatusRef.current = taskResult.status || "pending";
      refreshCredits();
      setCurrentStage("queued");
      setNotice("任务已创建，正在处理中…");
      setIsSubmitting(false);
      setVideoFile(null);
      setViewTab("recent");
      // Refresh task list so the new task shows up in recent
      loadTasks();
    } catch (error) {
      setIsUploading(false);
      setIsSubmitting(false);
      setNotice(error.message || "任务创建失败");
    }
  }

  async function playVideo(item) {
    if (!item.result?.videoUrl) return;
    setPreviewTask(item);
  }

  async function downloadVideo(item) {
    const url = item.result?.videoUrl;
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("下载失败");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = makeDownloadName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      setNotice("下载失败");
    }
  }

  function deleteTask(id) {
    setTasks((items) => items.filter((t) => t.id !== id));
    setFavoriteIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
    if (currentTaskId === id) setCurrentTaskId(null);
  }

  function toggleFavorite(id) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <section className="voice-conversion-view-root video-dub-view-root">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>
          主页
        </button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>
          历史记录
        </button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas video-dub-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && (
          <div className="video-dub-hero-empty">
            <span className="video-dub-hero-icon">
              <Volume2 size={42} />
            </span>
            <h1>视频配音</h1>
            <p>上传视频，自动分析内容并生成配音与背景音乐</p>
          </div>
        )}

        {viewTab === "recent" && (
          <div className={`video-dub-recent-panel ${tasks.length ? "has-items" : ""}`}>
            {tasks.length === 0 ? (
              <div className="video-dub-recent-empty">
                <Film size={28} />
                <strong>暂无配音记录</strong>
                <p>完成后的配音视频会显示在这里，可直接播放和下载。</p>
              </div>
            ) : (
              tasks.map((item) => (
                <div key={item.id} className="video-dub-recent-item-wrapper">
                  <VideoCard
                    item={item}
                    isFavorite={favoriteIds.has(item.id)}
                    onPlay={playVideo}
                    onDownload={downloadVideo}
                    onDelete={deleteTask}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {viewTab === "home" && (
          <div className="voice-floating-composer video-dub-floating-composer">
            <div className="voice-composer-title">
              <Film size={16} />
              视频配音工作台
            </div>
            <div className="video-dub-upload-grid">
              <VideoUploadSlot fileState={videoFile} isUploading={isUploading} onPick={pickVideoFile} onClear={clearVideoFile} />
            </div>

            <div className="voice-composer-footer">
              <strong className="audio-credit-hint">本次生成预计消耗 <em>30</em> 积分</strong>
              <div className="voice-actions">
                <button
                  className="voice-generate-button"
                  type="button"
                  onClick={submitDub}
                  disabled={isUploading || isSubmitting || !videoFile}
                >
                  {isUploading || isSubmitting ? <Loader2 size={16} /> : <Play size={16} />}
                  开始配音
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {previewTask?.result?.videoUrl
        ? createPortal(
          <div
            className="video-dub-player-modal"
            role="dialog"
            aria-modal="true"
            aria-label="视频播放"
            onClick={() => setPreviewTask(null)}
          >
            <div className="video-dub-player-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="video-dub-player-head">
                <strong>{previewTask.sourceFileName || "视频配音"}</strong>
                <button type="button" onClick={() => setPreviewTask(null)} aria-label="关闭">
                  <X size={18} />
                </button>
              </div>
              <div className="video-dub-player-body">
                <video src={previewTask.result.videoUrl} controls autoPlay playsInline />
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
      {toast ? (
        <div className={`music-toast music-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
