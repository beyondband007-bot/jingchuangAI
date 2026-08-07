import React, { useEffect, useRef, useState } from "react";
import "./videoDubbing.css";
import { createPortal } from "react-dom";
import BillingPoints from "../../components/BillingPoints.jsx";
import {
  Download,
  Film,
  Loader2,
  Play,
  Star,
  Trash2,
  Video,
  Volume2,
  X
} from "lucide-react";
import { videoDubbingApi } from "./videoDubbingApi";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import { useToast } from "../../components/ToastProvider";

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
  const [previewUrl, setPreviewUrl] = useState("");
  const hasFile = Boolean(fileState?.fileName);
  const hasPreview = Boolean(previewUrl);
  const isInteractive = !isUploading;

  useEffect(() => {
    const file = fileState?.file;
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileState?.file]);

  function openFilePicker() {
    if (!isInteractive) return;
    inputRef.current?.click();
  }

  function pickFile(file) {
    if (file && isInteractive) onPick(file);
  }

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="video/mp4,video/webm,video/mov,video/avi,video/*"
      style={{ display: "none" }}
      disabled={!isInteractive}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        pickFile(file);
      }}
    />
  );

  const clearButton = hasFile && isInteractive ? (
    <span
      className="ui-upload-clear-button"
      role="button"
      tabIndex={0}
      aria-label="取消上传"
      onClick={clearFile}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") clearFile(event);
      }}
    >
      <X size={13} />
    </span>
  ) : null;

  if (hasPreview) {
    return (
      <div
        className={`marketing-composer__upload has-file has-preview video-dub-upload-slot ${isUploading ? "is-busy" : ""}`}
        aria-disabled={!isInteractive}
        onDragOver={(event) => {
          if (!isInteractive) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          pickFile(event.dataTransfer.files?.[0]);
        }}
      >
        {fileInput}
        <div
          className="video-dub-upload-preview"
          onClick={(event) => event.stopPropagation()}
        >
          <video
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            aria-label={fileState?.fileName || "上传视频预览"}
          />
        </div>
        {clearButton}
        {isUploading ? (
          <span className="video-dub-upload-busy">
            <Loader2 size={18} className="is-spinning" />
            上传中
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={`marketing-composer__upload video-dub-upload-slot ${hasFile ? "has-file" : ""}`}
      type="button"
      onClick={openFilePicker}
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
      {fileInput}
      {isUploading ? (
        <Loader2 size={20} className="is-spinning" />
      ) : (
        <span className="marketing-upload-icon" aria-hidden="true">
          <img src="/assets/marketing/upload.svg" alt="" />
        </span>
      )}
      <strong>上传视频文件</strong>
      <small>支持 mp4 / webm / mov / avi，建议 2GB 以内</small>
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
        {isProcessing && (
          <div className="video-dub-recent-overlay is-processing" role="status" aria-live="polite">
            <Loader2 size={28} className="is-spinning" />
            <span>{STAGE_LABELS[item.stage] || item.stage || "生成中"}</span>
          </div>
        )}
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
        {(isCompleted || isFailed) && (
          <button
            className="video-dub-recent-delete"
            type="button"
            onClick={() => onDelete(item.id)}
            title="删除"
            aria-label="删除"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
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
        </div>
      )}
    </article>
  );
}

export function VideoDubbingView({ authUser, onOpenFeature, resetSignal = 0 }) {
  const { showToast: showGlobalToast, dismissToast } = useToast();
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
  const currentTaskStatusRef = useRef("");
  const isGuest = Boolean(authUser?.isGuest);

  function showToast(type, message) {
    showGlobalToast(message, { type });
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
    dismissToast();
  }, [resetSignal]);

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

  function performDeleteTask(id) {
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

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除配音记录？",
      message: "该视频配音记录会被移除，删除后无法恢复。",
    });

  function toggleFavorite(id) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }
  const showRechargeAlert = isRechargeRequiredMessage(notice);

  function closeRechargeAlert() {
    setNotice("");
  }

  function goToRecharge() {
    closeRechargeAlert();
    onOpenFeature?.("billing");
  }

  return (
    <section className="video-dubbing-view-root">
      <FeatureViewTabs
        currentLabel="视频配音"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => setViewTab("recent")}
      />

      <div className={`marketing-canvas video-dub-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && (
          <MarketingToolPanel
            className="audio-tool-panel video-dub-home-panel"
            title="视频配音"
            subtitle="上传视频，自动分析内容并生成配音与背景音乐"
          >
            <div className="marketing-composer audio-tool-composer">
              <div className="video-dub-upload-grid">
                <VideoUploadSlot fileState={videoFile} isUploading={isUploading} onPick={pickVideoFile} onClear={clearVideoFile} />
              </div>

              <div className="marketing-composer__footer audio-tool-footer">
                <strong className="audio-credit-hint">
                  {videoFile ? (
                    <>
                      预计消耗 <em><BillingPoints feature="video-dub" payload={{ durationMs: videoFile?.durationMs || 0, bgmEnabled: true }} fallbackPoints={35} /></em> 积分
                    </>
                  ) : (
                    "请上传文件"
                  )}
                </strong>
                <div className="audio-tool-actions">
                  <button
                    className="ui-send-button voice-generate-button"
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
          </MarketingToolPanel>
        )}

        {viewTab === "recent" && (
          <div className={`video-dub-recent-panel ${tasks.length ? "has-items" : ""}`}>
            {tasks.length === 0 ? (
              <HistoryEmptyState title="暂无配音记录" />
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
      {showRechargeAlert && (
        <CreditAlertDialog
          title="这次没有完成配音"
          message={notice}
          icon={<Volume2 size={28} />}
          onClose={closeRechargeAlert}
          onRecharge={goToRecharge}
        />
      )}
      {deleteConfirmDialog}
    </section>
  );
}
