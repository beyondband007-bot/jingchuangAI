import React, { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../audio-ui/audioStateControls.css";
import "./replicateExperience.css";
import {
  ArrowUp,
  Copy,
  Download,
  Film,
  FileImage,
  FileVideo,
  Image,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { replicateApi } from "./replicateApi";
import BillingPoints from "../../components/BillingPoints.jsx";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { MarketingPreviewLightbox, MarketingToolComposer, MarketingToolUploadSlot } from "../marketing-tool-ui";
import { MarketingHistoryDetailModal } from "../marketing-tool-ui";
import { formatBeijingDateTime } from "../../utils/time";
import { resolveMediaUrl } from "../../api/mediaUrl.js";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";

const replicateRecentStorageKey = "jingchuang.replicate.recentResults";
const maxImageBytes = 20 * 1024 * 1024;
const maxVideoBytes = 100 * 1024 * 1024;

function loadRecentResults() {
  try {
    return JSON.parse(window.localStorage.getItem(replicateRecentStorageKey) || "[]");
  } catch {
    return [];
  }
}

function downloadText(fileName, text) {
  const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function hasReplicateContent(task) {
  return Boolean(String(task?.prompt || "").trim() || String(task?.description || "").trim());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const replicateStageLabels = {
  queued: "任务已提交，正在排队...",
  validating: "正在校验视频...",
  preparing_media: "正在读取视频内容...",
  analyzing_primary: "正在理解动作与镜头...",
  analyzing_fallback: "正在进行关键帧增强分析...",
  synthesizing: "正在整理视频提示词...",
  saving: "正在保存分析结果..."
};

function getReplicateStageLabel(task) {
  return replicateStageLabels[task?.stage] || "正在反推提示词...";
}

function isReplicateProcessing(item) {
  return item?.status === "processing" || String(item?.id || "").startsWith("pending-");
}

function isReplicateFailed(item) {
  return item?.status === "failed";
}

function buildHistoryTaskFromApi(task, fallback = {}) {
  return {
    id: task.id || fallback.id,
    prompt: task.prompt || "",
    description: task.description || "",
    tags: task.tags || [],
    source: task.source || fallback.source || "image",
    sourceUrl: task.sourceUrl || fallback.sourceUrl || "",
    sourceThumbnailUrl: task.sourceThumbnailUrl || fallback.sourceThumbnailUrl || "",
    localPreviewUrl: fallback.localPreviewUrl || "",
    fileName: task.fileName || fallback.fileName || "",
    createdAt: task.createdAt || fallback.createdAt || formatBeijingDateTime(),
    model: task.model || "",
    provider: task.provider || "",
    analysisMode: task.analysisMode || "",
    qualityWarning: task.qualityWarning || "",
    analysis: task.analysis || null,
    stage: task.stage || fallback.stage || "",
    status: task.status || fallback.status || "processing",
    error: task.error || "",
  };
}

function upsertRecentResult(items, nextItem) {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)].slice(0, 20);
}

async function waitForReplicateTask(taskId, {
  attempts = 80,
  intervalMs = 3000,
  onProgress
} = {}) {
  let task = await replicateApi.getTask(taskId);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    onProgress?.(task);
    if (["completed", "completed_with_warning"].includes(task.status) && hasReplicateContent(task)) return task;
    if (["completed", "completed_with_warning"].includes(task.status) && !hasReplicateContent(task)) {
      throw new Error("分析完成但没有生成提示词，请重试");
    }
    if (task.status === "failed") {
      throw new Error(task.error || "分析失败，请稍后重试");
    }
    await sleep(intervalMs);
    task = await replicateApi.getTask(taskId);
  }
  throw new Error("分析仍在处理中，请稍后查看历史记录");
}

function ReplicateMediaLightbox({ url, title, kind = "image", onClose }) {
  return <MarketingPreviewLightbox url={url} title={title} video={kind === "video"} onClose={onClose} />;
}

const ReplicateUpload = forwardRef(function ReplicateUpload(
  { mode, fileState, onFile, onClear, isAnalyzing, stageLabel },
  ref,
) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isImage = mode === "image";
  const hasFile = Boolean(fileState?.name);
  const hasPreview = Boolean(fileState?.file && previewUrl);
  const isInteractive = !isAnalyzing;
  const accept = isImage ? ".jpg,.jpeg,.png,.gif,.webp,image/*" : ".mp4,.mov,.avi,.webm,video/*";
  const hint = isImage ? "支持 jpg / png / gif / webp，最大 20MB" : "支持 mp4 / mov / webm / avi，最大 100MB";

  useEffect(() => {
    const file = fileState?.file;
    if (!file) {
      setPreviewUrl("");
      setLightboxOpen(false);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileState?.file]);

  return (
    <>
      <MarketingToolUploadSlot
        ref={ref}
        className={`replicate-upload-slot${isAnalyzing ? " is-analyzing" : ""}`}
        dragDrop
        accept={accept}
        disabled={!isInteractive}
        ariaBusy={isAnalyzing}
        hasPreview={hasPreview}
        hasFile={hasFile}
        previewUrl={previewUrl}
        isVideo={!isImage}
        emptyTitle={isImage ? "上传图片素材" : "上传视频素材"}
        emptyHint={hint}
        onSelect={onFile}
        onClear={onClear}
        overlay={isAnalyzing ? (
          <span className="replicate-upload-analyzing" role="status" aria-live="polite">
            <Loader2 size={28} className="is-spinning" />
            <strong>{stageLabel || "正在反推提示词..."}</strong>
          </span>
        ) : null}
        renderPreview={({ previewUrl: url, isVideo }) => (
          isVideo ? (
            <div className="marketing-tool-upload__video-preview">
              <video src={url} muted playsInline preload="metadata" controls />
            </div>
          ) : (
            <button
              type="button"
              className="marketing-tool-upload__preview-trigger"
              onClick={() => setLightboxOpen(true)}
              aria-label="放大预览图片"
            >
              <img src={url} alt={fileState?.name || "上传图片预览"} />
            </button>
          )
        )}
      />
      {lightboxOpen && isImage ? (
        <ReplicateMediaLightbox
          url={previewUrl}
          title={fileState?.name || "上传图片预览"}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
});

function buildPromptText(result) {
  return String(result?.prompt || result?.description || "").trim();
}

function ReplicatePromptTooltip({ text, open, anchorRef, tooltipRef }) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current || !text) {
      setStyle(null);
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const maxWidth = Math.min(360, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - maxWidth - 12,
      );
      const preferBelow = rect.bottom + 12;
      const estimatedHeight = Math.min(220, Math.ceil(String(text).length / 22) * 18 + 24);
      const top =
        preferBelow + estimatedHeight > window.innerHeight - 12
          ? Math.max(12, rect.top - estimatedHeight - 8)
          : preferBelow;

      setStyle({
        top: `${top}px`,
        left: `${left}px`,
        maxWidth: `${maxWidth}px`,
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef, open, text]);

  if (!open || !text || !style) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="replicate-card-title-tooltip is-portal"
      role="tooltip"
      style={style}
    >
      {text}
    </div>,
    document.body,
  );
}

function ReplicateRecentCard({ item, onCopy, onDownload, onOpen }) {
  const promptText = buildPromptText(item);
  const isProcessing = isReplicateProcessing(item);
  const isFailed = isReplicateFailed(item);
  const titleText = isProcessing
    ? (item.fileName || "正在反推提示词")
    : (promptText || item.fileName || "分析结果");
  const metaLabel = `${item.source === "video" ? "视频" : "图片"} · ${
    isProcessing
      ? getReplicateStageLabel(item)
      : isFailed
        ? (item.error || "分析失败")
        : item.createdAt
  }`;
  const isVideo = item.source === "video";
  const mediaUrl = item.localPreviewUrl || resolveMediaUrl(item.sourceUrl);
  const thumbnailUrl = resolveMediaUrl(item.sourceThumbnailUrl);
  const titleRef = useRef(null);
  const tooltipRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const canTogglePrompt = Boolean(promptText) && !isProcessing;

  useEffect(() => {
    if (!tooltipOpen) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (titleRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }
      setTooltipOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setTooltipOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [tooltipOpen]);

  return (
    <article className={`replicate-recent-card ${tooltipOpen ? "is-tooltip-open" : ""} ${isProcessing ? "is-processing" : ""} ${isFailed ? "is-failed" : ""}`} role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(item); } }}>
      <div className={`replicate-card-media ${isVideo ? "is-video" : "is-image"}`}>
        {(isVideo ? thumbnailUrl : mediaUrl) && !mediaFailed ? (
          isVideo ? (
            <div className="replicate-card-video">
              <img
                src={thumbnailUrl}
                alt={item.fileName || "视频封面"}
                onError={() => setMediaFailed(true)}
                aria-label={item.fileName || "上传视频预览"}
              />
              <span className="replicate-card-video-icon" aria-hidden="true"><Film size={28} /></span>
            </div>
          ) : (
            <button
              type="button"
              className="replicate-card-image-trigger"
              onClick={(event) => { event.stopPropagation(); onOpen(item); }}
              aria-label="放大预览图片"
              disabled={isProcessing}
            >
              <img src={mediaUrl} alt={item.fileName || "上传图片预览"} onError={() => setMediaFailed(true)} />
            </button>
          )
        ) : (
          <span className="replicate-card-media-fallback" aria-hidden="true">
            {isVideo ? <FileVideo size={28} /> : <FileImage size={28} />}
          </span>
        )}
        {isProcessing ? (
          <div className="replicate-card-overlay is-processing" role="status" aria-live="polite">
            <Loader2 size={28} className="is-spinning" />
            <span>{getReplicateStageLabel(item)}</span>
          </div>
        ) : null}
        {isFailed ? (
          <div className="replicate-card-overlay is-failed">
            <span>失败</span>
          </div>
        ) : null}
      </div>
      <div className="replicate-card-body">
        <button
          type="button"
          ref={titleRef}
          className={`replicate-card-title${canTogglePrompt ? " has-tooltip" : ""}`}
          aria-expanded={canTogglePrompt ? tooltipOpen : undefined}
          disabled={!canTogglePrompt}
          onClick={() => {
            if (!canTogglePrompt) return;
            setTooltipOpen((open) => !open);
          }}
        >
          <span className="replicate-card-title-text">{titleText}</span>
        </button>
        <div className="replicate-card-meta-row">
          <span className="replicate-card-meta">{metaLabel}</span>
          {!isProcessing && !isFailed ? (
            <div className="replicate-card-actions">
              <button type="button" onClick={(event) => { event.stopPropagation(); onCopy(item); }} title="复制" aria-label="复制">
                <Copy size={14} />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onDownload(item); }}
                title="下载"
                aria-label="下载"
              >
                <Download size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ReplicatePromptTooltip
        text={promptText}
        open={tooltipOpen}
        anchorRef={titleRef}
        tooltipRef={tooltipRef}
      />
      {lightboxOpen && !isVideo ? (
        <ReplicateMediaLightbox
          url={mediaUrl}
          title={item.fileName || "上传图片预览"}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </article>
  );
}

function ReplicateResult({
  result,
  mode,
  fileState,
  onCopy,
  onReset,
  onOpenGeneration,
  copied,
}) {
  const [previewUrl, setPreviewUrl] = useState("");

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

  if (!result) return null;

  const isVideo = (result.source || mode) === "video";
  const promptText = buildPromptText(result);

  return (
    <div className="marketing-result replicate-result-composer">
      <div className="marketing-result__body replicate-result-body">
        <figure className="replicate-result-source">
          {previewUrl ? (
            isVideo ? (
              <video src={previewUrl} controls playsInline preload="metadata" />
            ) : (
              <img src={previewUrl} alt={fileState?.name || "参考图片"} />
            )
          ) : (
            <span>{isVideo ? <FileVideo size={28} /> : <FileImage size={28} />}</span>
          )}
        </figure>

        <div className="replicate-result-prompt">
          <textarea id="replicate-result-prompt" readOnly value={promptText} aria-label="反推提示词" />
          {isVideo && result.qualityWarning ? (
            <div className="replicate-result-diagnostics has-warning">
              <p>{result.qualityWarning}</p>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="marketing-result__footer">
        <p>已完成本次处理，可复制提示词或上传新素材继续</p>
        <div className="marketing-result__footer-actions">
          <div className="marketing-result__actions">
            <button type="button" onClick={onReset}>
              重新生成
            </button>
            <button type="button" onClick={onCopy}>
              {copied ? "已复制" : "复制提示词"}
            </button>
            <button
              type="button"
              className="is-primary replicate-goto-generation-btn"
              onClick={() => onOpenGeneration?.(promptText, isVideo ? "video" : "image")}
              disabled={!promptText}
            >
              <ArrowUp size={14} />
              {isVideo ? "去生成视频" : "去生成图片"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ReplicateView({ authUser, onOpenFeature }) {
  const uploadRef = useRef(null);
  const isAnalyzingRef = useRef(false);
  const [mode, setMode] = useState("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [analysisStageLabel, setAnalysisStageLabel] = useState("");
  const [currentResult, setCurrentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState("home");
  const [detailTask, setDetailTask] = useState(null);
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const isGuest = Boolean(authUser?.isGuest);
  const processingTaskIds = recentResults
    .filter((item) => isReplicateProcessing(item) && !String(item.id).startsWith("pending-"))
    .map((item) => item.id)
    .join(",");

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  useEffect(() => {
    const serializable = recentResults.map(({ localPreviewUrl, ...rest }) => rest);
    window.localStorage.setItem(replicateRecentStorageKey, JSON.stringify(serializable));
  }, [recentResults]);

  useEffect(() => {
    let mounted = true;
    replicateApi.getTasks().then((items) => {
      if (!mounted) return;
      setRecentResults((current) => {
        const serverItems = (items || []).map((task) => buildHistoryTaskFromApi(task));
        const serverIds = new Set(serverItems.map((item) => item.id));
        const localPending = current.filter((item) => (
          String(item.id).startsWith("pending-")
          || (isReplicateProcessing(item) && !serverIds.has(item.id))
        ));
        return [...localPending, ...serverItems].slice(0, 20);
      });
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!processingTaskIds || isAnalyzingRef.current) return undefined;
    const ids = processingTaskIds.split(",").filter(Boolean);
    if (!ids.length) return undefined;

    let cancelled = false;

    async function refreshProcessingTasks() {
      const updates = await Promise.all(ids.map(async (id) => {
        try {
          return await replicateApi.getTask(id);
        } catch {
          return null;
        }
      }));
      if (cancelled) return;

      setRecentResults((items) => {
        let next = items;
        for (const task of updates) {
          if (!task) continue;
          next = next.map((item) => {
            if (item.id !== task.id) return item;
            if (["completed", "completed_with_warning"].includes(task.status) && hasReplicateContent(task)) {
              return buildHistoryTaskFromApi(task, item);
            }
            if (task.status === "failed") {
              return buildHistoryTaskFromApi(task, item);
            }
            return {
              ...item,
              status: task.status || item.status,
              stage: task.stage || item.stage,
              sourceUrl: task.sourceUrl || item.sourceUrl,
              fileName: task.fileName || item.fileName,
              error: task.error || item.error,
            };
          });
        }
        return next;
      });
    }

    refreshProcessingTasks();
    const timer = window.setInterval(refreshProcessingTasks, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [processingTaskIds]);

  function handleFile(file) {
    setNotice("");
    setAnalysisStageLabel("");
    if (!file) return;
    const expectedType = mode === "image" ? "image/" : "video/";
    if (!String(file.type || "").startsWith(expectedType)) {
      setSelectedFile(null);
      setCurrentResult(null);
      return;
    }
    const maxBytes = mode === "image" ? maxImageBytes : maxVideoBytes;
    if (file.size > maxBytes) {
      setSelectedFile(null);
      setCurrentResult(null);
      setNotice(mode === "image" ? "图片文件需小于 20MB" : "视频文件需小于 100MB");
      return;
    }
    setSelectedFile({ file, name: file.name, size: file.size, type: file.type });
    setCurrentResult(null);
  }

  async function startReplicate() {
    if (isGuest) {
      setNotice("积分不够，请充值");
      return;
    }
    if (!selectedFile?.file) {
      setNotice("请先上传素材");
      return;
    }

    setCurrentResult(null);
    setNotice("");
    setAnalysisStageLabel("正在上传并校验素材...");
    setIsAnalyzing(true);

    const pendingId = `pending-${Date.now()}`;
    const localPreviewUrl = URL.createObjectURL(selectedFile.file);
    let activeTaskId = pendingId;

    setRecentResults((items) => upsertRecentResult(items, {
      id: pendingId,
      status: "processing",
      stage: "queued",
      source: mode,
      fileName: selectedFile.name,
      sourceUrl: "",
      localPreviewUrl,
      createdAt: formatBeijingDateTime(),
      prompt: "",
      description: "",
      error: "",
    }));

    try {
      const data = mode === "image"
        ? await replicateApi.analyzeImage(selectedFile.file, selectedFile.name)
        : await replicateApi.analyzeVideo(selectedFile.file, selectedFile.name);

      activeTaskId = data.id || pendingId;
      setAnalysisStageLabel(getReplicateStageLabel(data));
      setRecentResults((items) => {
        const withoutPending = items.filter((item) => item.id !== pendingId && item.id !== activeTaskId);
        return upsertRecentResult(withoutPending, buildHistoryTaskFromApi(data, {
          id: activeTaskId,
          source: mode,
          fileName: selectedFile.name,
          localPreviewUrl,
          status: "processing",
          stage: data.stage || "queued",
        }));
      });

      const pollOptions = mode === "video"
        ? {
            attempts: 120,
            intervalMs: 3000,
            onProgress: (task) => {
              setAnalysisStageLabel(getReplicateStageLabel(task));
              setRecentResults((items) => items.map((item) => (
                item.id === task.id
                  ? {
                      ...item,
                      status: task.status || item.status,
                      stage: task.stage || item.stage,
                      sourceUrl: task.sourceUrl || item.sourceUrl,
                      fileName: task.fileName || item.fileName,
                      error: task.error || item.error,
                    }
                  : item
              )));
            },
          }
        : {
            attempts: 80,
            intervalMs: 3000,
            onProgress: (task) => {
              setAnalysisStageLabel(getReplicateStageLabel(task));
              setRecentResults((items) => items.map((item) => (
                item.id === task.id
                  ? {
                      ...item,
                      status: task.status || item.status,
                      stage: task.stage || item.stage,
                      sourceUrl: task.sourceUrl || item.sourceUrl,
                      fileName: task.fileName || item.fileName,
                      error: task.error || item.error,
                    }
                  : item
              )));
            },
          };
      const completed = ["completed", "completed_with_warning"].includes(data.status) && hasReplicateContent(data)
        ? data
        : await waitForReplicateTask(data.id, pollOptions);
      if (completed.status === "failed") {
        throw new Error(completed.error || "分析失败，请稍后重试");
      }
      if (!hasReplicateContent(completed)) {
        throw new Error("分析完成但没有生成提示词，请重试");
      }

      const result = buildHistoryTaskFromApi(completed, {
        source: mode,
        fileName: selectedFile.name,
        localPreviewUrl: "",
      });

      setCurrentResult(result);
      setRecentResults((items) => upsertRecentResult(
        items.filter((item) => item.id !== pendingId),
        result,
      ));
      setNotice("");
      setAnalysisStageLabel("");
      URL.revokeObjectURL(localPreviewUrl);
    } catch (error) {
      setNotice(error.message || "分析失败");
      setAnalysisStageLabel("");
      setRecentResults((items) => items.map((item) => (
        item.id === activeTaskId || item.id === pendingId
          ? {
              ...item,
              id: activeTaskId,
              status: "failed",
              error: error.message || "分析失败",
              localPreviewUrl: item.localPreviewUrl || localPreviewUrl,
            }
          : item
      )));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setCurrentResult(null);
    setNotice("");
    setAnalysisStageLabel("");
  }

  function copyPrompt(result = currentResult) {
    const text = buildPromptText(result);
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setNotice("提示词已复制");
    }).catch(() => {
      setNotice("复制失败");
    });
  }

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function resetForNewMaterial() {
    setCurrentResult(null);
    setSelectedFile(null);
    setNotice("");
    setAnalysisStageLabel("");
  }

  function openGeneration(prompt, target = "image") {
    const text = String(prompt || "").trim();
    if (!text) return;
    onOpenFeature?.(target, {
      prompt: text,
      notice: "已填入反推提示词",
    });
  }

  function closeRechargeAlert() {
    setNotice("");
  }

  function goToRecharge() {
    closeRechargeAlert();
    onOpenFeature?.("billing");
  }

  const showRechargeAlert = isRechargeRequiredMessage(notice);

  return (
    <section className="marketing-tool-root marketing-tool--prompt-reverse replicate-view">
      <FeatureViewTabs
        currentLabel="反推提示词"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => setViewTab("recent")}
      />

      <div className={`marketing-canvas replicate-canvas ${viewTab === "recent" ? "is-recent" : ""} ${viewTab === "recent" && recentResults.length === 0 ? "is-empty" : ""}`}>
        {viewTab === "home" ? (
          <MarketingToolPanel
            title="反推提示词"
            subtitle="上传图片或视频，自动理解主体、风格与镜头语言，生成可用于创作的提示词"
            className="replicate-home-panel"
          >
            {currentResult && (
              <ReplicateResult
                result={currentResult}
                mode={mode}
                fileState={selectedFile}
                onCopy={() => copyPrompt()}
                onReset={resetForNewMaterial}
                onOpenGeneration={openGeneration}
                copied={copied}
              />
            )}

            {!currentResult && (
            <>
            <MarketingToolComposer
              ariaLabel="反推提示词上传面板"
              className="replicate-composer"
              tabs={[
                { id: "image", label: "图片反推", icon: <Image size={15} /> },
                { id: "video", label: "视频反推", icon: <Film size={15} /> },
              ]}
              activeTabId={mode}
              onTabChange={(nextMode) => {
                if (isAnalyzing) return;
                setMode(nextMode);
                setSelectedFile(null);
              }}
              tabsDisabled={isAnalyzing}
              upload={(
                <ReplicateUpload
                  ref={uploadRef}
                  mode={mode}
                  fileState={selectedFile}
                  onFile={handleFile}
                  onClear={clearSelectedFile}
                  isAnalyzing={isAnalyzing}
                  stageLabel={analysisStageLabel}
                />
              )}
              footerStatus={selectedFile ? (
                <>
                  预计消耗 <BillingPoints feature="replicate" payload={{ kind: mode }} fallbackPoints={mode === "video" ? 50 : 5} /> 积分
                </>
              ) : (
                "请上传文件"
              )}
              footerExtra={selectedFile ? (
                <button
                  type="button"
                  className="marketing-tool-composer__secondary-action"
                  onClick={() => uploadRef.current?.openFilePicker()}
                  disabled={isAnalyzing}
                >
                  <Upload size={15} />
                  重新上传文件
                </button>
              ) : null}
              actionIcon={<Sparkles size={16} />}
              actionLabel="开始反推"
              onAction={startReplicate}
              actionDisabled={isAnalyzing || !selectedFile}
              actionLoading={isAnalyzing}
            />
            {notice && !showRechargeAlert && (
              <p className={`replicate-composer-notice ${/失败|错误|无法|超时|需小于/.test(notice) ? "is-error" : ""}`}>
                {notice}
              </p>
            )}
            {showRechargeAlert && (
              <CreditAlertDialog
                title="这次没有反推成功"
                message={notice}
                icon={<Copy size={28} />}
                onClose={closeRechargeAlert}
                onRecharge={goToRecharge}
              />
            )}
            </>
            )}
          </MarketingToolPanel>
        ) : (
          <div className="replicate-recent-list">
            {recentResults.length === 0 ? (
              <HistoryEmptyState title="暂无历史记录" />
            ) : (
              recentResults.map((item) => (
                <ReplicateRecentCard
                  key={item.id}
                  item={item}
                  onCopy={copyPrompt}
                  onOpen={setDetailTask}
                  onDownload={(entry) =>
                    downloadText(
                      `replicate-${entry.id || Date.now()}.txt`,
                      entry.prompt || entry.description || ""
                    )
                  }
                />
              ))
            )}
          </div>
        )}
      </div>
      <MarketingHistoryDetailModal task={detailTask} tool="replicate" onClose={() => setDetailTask(null)} />
    </section>
  );
}
