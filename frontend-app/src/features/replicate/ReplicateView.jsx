import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
  X,
} from "lucide-react";
import { replicateApi } from "./replicateApi";
import BillingPoints from "../../components/BillingPoints.jsx";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
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
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!url) return null;

  return createPortal(
    <div className="replicate-media-lightbox" role="dialog" aria-modal="true" aria-label={`预览${title}`}>
      <button type="button" className="replicate-media-lightbox__backdrop" aria-label="关闭预览" onClick={onClose} />
      <figure className="replicate-media-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="replicate-media-lightbox__close" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        {kind === "video" ? (
          <video src={url} controls autoPlay playsInline preload="metadata" />
        ) : (
          <img src={url} alt={title} />
        )}
      </figure>
    </div>,
    document.body,
  );
}

const ReplicateUpload = forwardRef(function ReplicateUpload(
  { mode, fileState, onFile, onClear, isAnalyzing, stageLabel },
  ref,
) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isImage = mode === "image";
  const hasFile = Boolean(fileState?.name);
  const hasPreview = Boolean(fileState?.file && previewUrl);
  const isInteractive = !isAnalyzing;
  const accept = isImage ? ".jpg,.jpeg,.png,.gif,.webp,image/*" : ".mp4,.mov,.avi,.webm,video/*";
  const hint = isImage ? "支持 jpg / png / gif / webp，最大 20MB" : "支持 mp4 / mov / webm / avi，最大 100MB";

  useImperativeHandle(ref, () => ({
    openFilePicker() {
      if (!isInteractive) return;
      inputRef.current?.click();
    },
  }), [isInteractive]);

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

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    if (!isInteractive) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function openFilePicker() {
    if (!isInteractive) return;
    inputRef.current?.click();
  }

  const slotClassName = [
    "marketing-composer__upload",
    "marketing-tool-upload",
    "replicate-upload-slot",
    dragOver && isInteractive ? "drag-over" : "",
    hasFile ? "has-file" : "",
    hasPreview ? "has-preview" : "",
    isAnalyzing ? "is-analyzing" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={slotClassName}
      aria-disabled={!isInteractive}
      aria-busy={isAnalyzing}
      onDragOver={(event) => {
        if (!isInteractive) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        if (!isInteractive) return;
        setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        disabled={!isInteractive}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {hasPreview ? (
        <>
          {isImage ? (
            <button
              type="button"
              className="replicate-upload-preview-trigger"
              onClick={() => setLightboxOpen(true)}
              aria-label="放大预览图片"
            >
              <img src={previewUrl} alt={fileState.name || "上传图片预览"} />
            </button>
          ) : (
            <div className="replicate-upload-video-preview">
              <video src={previewUrl} muted playsInline preload="metadata" controls />
            </div>
          )}
          {isAnalyzing && (
            <span className="replicate-upload-analyzing">
              <Loader2 size={22} className="is-spinning" />
              <strong>{stageLabel || "正在反推提示词..."}</strong>
            </span>
          )}
          {hasFile && isInteractive && (
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
          )}
        </>
      ) : (
        <button
          type="button"
          className="replicate-upload-empty"
          onClick={openFilePicker}
          disabled={!isInteractive}
        >
          <span className="replicate-upload-icon">
            <img src="/assets/marketing/upload.svg" alt="" />
          </span>
          <strong>{isImage ? "上传图片素材" : "上传视频素材"}</strong>
          <small>{hint}</small>
        </button>
      )}
      {lightboxOpen && isImage ? (
        <ReplicateMediaLightbox
          url={previewUrl}
          title={fileState?.name || "上传图片预览"}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
});

function buildPromptText(result) {
  return String(result?.prompt || result?.description || "").trim();
}

function ReplicatePromptHoverTooltip({ text, open, anchorRef }) {
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
    <div className="replicate-card-title-tooltip is-portal" role="tooltip" style={style}>
      {text}
    </div>,
    document.body,
  );
}

function ReplicateRecentCard({ item, onCopy, onDownload }) {
  const promptText = buildPromptText(item);
  const titleText = promptText || item.fileName || "分析结果";
  const metaLabel = `${item.source === "video" ? "视频" : "图片"} · ${item.createdAt}`;
  const isVideo = item.source === "video";
  const mediaUrl = resolveMediaUrl(item.sourceUrl);
  const videoRef = useRef(null);
  const titleRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  function ensureVideoPosterFrame(event) {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    if (video.currentTime > 0.05) return;
    try {
      video.currentTime = Math.min(0.1, video.duration * 0.01);
    } catch {
      // Some browsers reject seeking before enough data is buffered.
    }
  }

  return (
    <article className={`replicate-recent-card ${tooltipOpen ? "is-tooltip-open" : ""}`}>
      <div className={`replicate-card-media ${isVideo ? "is-video" : "is-image"}`}>
        {mediaUrl ? (
          isVideo ? (
            <div className="replicate-card-video">
              <video
                ref={videoRef}
                src={mediaUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={ensureVideoPosterFrame}
                aria-label={item.fileName || "上传视频预览"}
              />
            </div>
          ) : (
            <button
              type="button"
              className="replicate-card-image-trigger"
              onClick={() => setLightboxOpen(true)}
              aria-label="放大预览图片"
            >
              <img src={mediaUrl} alt={item.fileName || "上传图片预览"} />
            </button>
          )
        ) : (
          <span className="replicate-card-media-fallback" aria-hidden="true">
            {isVideo ? <FileVideo size={28} /> : <FileImage size={28} />}
          </span>
        )}
      </div>
      <div className="replicate-card-body">
        <strong
          ref={titleRef}
          className="replicate-card-title"
          tabIndex={0}
          onMouseEnter={() => setTooltipOpen(Boolean(promptText))}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(Boolean(promptText))}
          onBlur={() => setTooltipOpen(false)}
        >
          <span className="replicate-card-title-text">{titleText}</span>
        </strong>
        <div className="replicate-card-meta-row">
          <span className="replicate-card-meta">{metaLabel}</span>
          <div className="replicate-card-actions">
            <button type="button" onClick={() => onCopy(item)} title="复制" aria-label="复制">
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDownload(item)}
              title="下载"
              aria-label="下载"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>
      <ReplicatePromptHoverTooltip
        text={promptText}
        open={tooltipOpen}
        anchorRef={titleRef}
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

function ReplicatePageHeader() {
  return (
    <div className="marketing-panel-hero voice-hero-empty replicate-hero-empty">
      <p className="marketing-panel-hero__subtitle">
        上传图片或视频，自动理解主体、风格与镜头语言，生成可用于创作的提示词
      </p>
    </div>
  );
}

function ReplicateResult({
  result,
  mode,
  fileState,
  onCopy,
  onReset,
  onOpenGeneration,
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
          <label htmlFor="replicate-result-prompt">Prompt</label>
          <textarea id="replicate-result-prompt" readOnly value={promptText} />
          {isVideo && (
            <div className={`replicate-result-diagnostics ${result.qualityWarning ? "has-warning" : ""}`}>
              <span>
                {result.analysisMode === "scene_frames" ? "关键帧增强分析" : "原生视频理解"}
                {result.model ? ` · ${result.model}` : ""}
              </span>
              {result.qualityWarning && <p>{result.qualityWarning}</p>}
            </div>
          )}
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
              复制提示词
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
  const [mode, setMode] = useState("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [analysisStageLabel, setAnalysisStageLabel] = useState("");
  const [currentResult, setCurrentResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const isGuest = Boolean(authUser?.isGuest);

  useEffect(() => {
    window.localStorage.setItem(replicateRecentStorageKey, JSON.stringify(recentResults));
  }, [recentResults]);

  useEffect(() => {
    let mounted = true;
    replicateApi.getTasks().then((items) => {
      if (mounted) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  function handleFile(file) {
    setNotice("");
    setAnalysisStageLabel("");
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
    try {
      const data = mode === "image"
        ? await replicateApi.analyzeImage(selectedFile.file, selectedFile.name)
        : await replicateApi.analyzeVideo(selectedFile.file, selectedFile.name);
      setAnalysisStageLabel(getReplicateStageLabel(data));
      const pollOptions = mode === "video"
        ? {
            attempts: 120,
            intervalMs: 3000,
            onProgress: (task) => setAnalysisStageLabel(getReplicateStageLabel(task))
          }
        : { attempts: 80, intervalMs: 3000 };
      const completed = ["completed", "completed_with_warning"].includes(data.status) && hasReplicateContent(data)
        ? data
        : await waitForReplicateTask(data.id, pollOptions);
      if (completed.status === "failed") {
        throw new Error(completed.error || "分析失败，请稍后重试");
      }
      if (!hasReplicateContent(completed)) {
        throw new Error("分析完成但没有生成提示词，请重试");
      }

      const result = {
        id: completed.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: completed.prompt || "",
        description: completed.description || "",
        tags: completed.tags || [],
        source: completed.source || mode,
        sourceUrl: completed.sourceUrl || "",
        fileName: completed.fileName || selectedFile.name,
        createdAt: completed.createdAt || formatBeijingDateTime(),
        model: completed.model || "",
        provider: completed.provider || "",
        analysisMode: completed.analysisMode || "",
        qualityWarning: completed.qualityWarning || "",
        analysis: completed.analysis || null
      };

      setCurrentResult(result);
      setRecentResults((items) => [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20));
      setNotice("");
      setAnalysisStageLabel("");
    } catch (error) {
      setNotice(error.message || "分析失败");
      setAnalysisStageLabel("");
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
      setNotice("提示词已复制");
    }).catch(() => {
      setNotice("复制失败");
    });
  }

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
          <MarketingToolPanel className="replicate-home-stack">
            <ReplicatePageHeader />

            {currentResult && (
              <ReplicateResult
                result={currentResult}
                mode={mode}
                fileState={selectedFile}
                onCopy={() => copyPrompt()}
                onReset={resetForNewMaterial}
                onOpenGeneration={openGeneration}
              />
            )}

            {!currentResult && (
            <>
            <div className="marketing-composer marketing-composer--inline marketing-tool-card replicate-floating-composer">
              <div className="marketing-composer__tabs marketing-tool-tabs replicate-mode-toggle" aria-label="选择反推类型">
                <button
                  type="button"
                  className={mode === "image" ? "active" : ""}
                  onClick={() => {
                    if (isAnalyzing) return;
                    setMode("image");
                    setSelectedFile(null);
                  }}
                  disabled={isAnalyzing}
                >
                  <Image size={15} />
                  图片反推
                </button>
                <button
                  type="button"
                  className={mode === "video" ? "active" : ""}
                  onClick={() => {
                    if (isAnalyzing) return;
                    setMode("video");
                    setSelectedFile(null);
                  }}
                  disabled={isAnalyzing}
                >
                  <Film size={15} />
                  视频反推
                </button>
              </div>

              <div className="marketing-composer__upload-wrap replicate-upload-area">
                <ReplicateUpload
                  ref={uploadRef}
                  mode={mode}
                  fileState={selectedFile}
                  onFile={handleFile}
                  onClear={clearSelectedFile}
                  isAnalyzing={isAnalyzing}
                  stageLabel={analysisStageLabel}
                />
              </div>

              <div className="marketing-composer__footer marketing-tool-footer replicate-composer-footer">
                {selectedFile ? (
                  <strong className="replicate-composer-cost">
                    预计消耗 <BillingPoints feature="replicate" payload={{ kind: mode }} fallbackPoints={mode === "video" ? 50 : 5} /> 积分
                  </strong>
                ) : (
                  <span className="replicate-composer-status">请先上传文件</span>
                )}
                {selectedFile ? (
                  <button
                    type="button"
                    className="replicate-reupload-button"
                    onClick={() => uploadRef.current?.openFilePicker()}
                    disabled={isAnalyzing}
                  >
                    <Upload size={15} />
                    重新上传文件
                  </button>
                ) : null}
                <button
                  className="ui-send-button"
                  type="button"
                  onClick={startReplicate}
                  disabled={isAnalyzing || !selectedFile}
                  aria-label="开始反推"
                >
                  {isAnalyzing ? <Loader2 size={16} /> : <Sparkles size={16} />}
                </button>
              </div>
            </div>
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
    </section>
  );
}
