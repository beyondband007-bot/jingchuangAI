import React, { useEffect, useRef, useState } from "react";
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
import { PageTitle } from "../../components/PageTitle";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { formatBeijingDateTime } from "../../utils/time";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";

const replicateRecentStorageKey = "jingchuang.replicate.recentResults";

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

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function hasReplicateContent(task) {
  return Boolean(String(task?.prompt || "").trim() || String(task?.description || "").trim());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReplicateTask(taskId, { attempts = 80, intervalMs = 3000 } = {}) {
  let task = await replicateApi.getTask(taskId);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (task.status === "completed" && hasReplicateContent(task)) return task;
    if (task.status === "completed" && !hasReplicateContent(task)) {
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

function ReplicateUpload({ mode, fileState, onFile, onClear, isAnalyzing }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

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

  const slotClassName = [
    "marketing-composer__upload",
    "marketing-tool-upload",
    "replicate-upload-slot",
    dragOver && isInteractive ? "drag-over" : "",
    hasFile ? "has-file" : "",
    hasPreview ? "has-preview" : "",
    isAnalyzing ? "is-analyzing" : "",
  ].filter(Boolean).join(" ");

  const slotProps = {
    className: slotClassName,
    "aria-disabled": !isInteractive,
    "aria-busy": isAnalyzing,
    onDragOver: (event) => {
      if (!isInteractive) return;
      event.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => {
      if (!isInteractive) return;
      setDragOver(false);
    },
    onDrop: handleDrop,
  };

  const slotBody = (
    <>
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
            <img src={previewUrl} alt={fileState.name || "上传图片预览"} />
          ) : (
            <video src={previewUrl} muted playsInline preload="metadata" />
          )}
          {isAnalyzing && (
            <span className="replicate-upload-analyzing">
              <Loader2 size={22} className="is-spinning" />
              <strong>正在反推提示词...</strong>
            </span>
          )}
          {hasFile && isInteractive && (
            <span
              className="ui-upload-clear-button"
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
          <small>{`${isImage ? "图片" : "视频"} · ${formatBytes(fileState.size)}`}</small>
        </>
      ) : (
        <>
          <span className="replicate-upload-icon">
            <img src="/assets/marketing/upload.svg" alt="" />
          </span>
          <strong>{isImage ? "上传图片素材" : "上传视频素材"}</strong>
          <small>{hint}</small>
        </>
      )}
    </>
  );

  if (!isInteractive) {
    return <div {...slotProps}>{slotBody}</div>;
  }

  return (
    <button
      type="button"
      {...slotProps}
      onClick={() => inputRef.current?.click()}
    >
      {slotBody}
    </button>
  );
}

function buildPromptText(result) {
  return String(result?.prompt || result?.description || "").trim();
}

function ReplicatePageHeader() {
  return (
    <div className="marketing-panel-hero voice-hero-empty replicate-hero-empty">
      <PageTitle className="marketing-panel-hero__title">反推提示词</PageTitle>
      <p className="marketing-panel-hero__subtitle">上传参考图片或视频，自动理解主体、风格、镜头语言与画面细节，用于 AI 图片 / 视频生成</p>
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
        </div>
      </div>

      <footer className="marketing-result__footer">
        <p>已完成本次处理，可复制提示词或上传新素材继续</p>
        <div className="marketing-result__footer-actions">
          <div className="marketing-result__actions">
            <button type="button" onClick={onReset}>
              处理新素材
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
  const [mode, setMode] = useState("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState("");
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
    setIsAnalyzing(true);
    try {
      const data = mode === "image"
        ? await replicateApi.analyzeImage(selectedFile.file, selectedFile.name)
        : await replicateApi.analyzeVideo(selectedFile.file, selectedFile.name);
      setNotice("分析任务已提交，正在处理...");
      const pollOptions = mode === "video"
        ? { attempts: 120, intervalMs: 3000 }
        : { attempts: 80, intervalMs: 3000 };
      const completed = data.status === "completed" && hasReplicateContent(data)
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
        fileName: completed.fileName || selectedFile.name,
        createdAt: completed.createdAt || formatBeijingDateTime()
      };

      setCurrentResult(result);
      setRecentResults((items) => [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20));
      setNotice("");
    } catch (error) {
      setNotice(error.message || "分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setCurrentResult(null);
    setNotice("");
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
                <ReplicateUpload mode={mode} fileState={selectedFile} onFile={handleFile} onClear={clearSelectedFile} isAnalyzing={isAnalyzing} />
              </div>

              <div className="marketing-composer__footer marketing-tool-footer replicate-composer-footer">
                <span className="replicate-composer-hint">
                  {mode === "video"
                    ? "视频会分析镜头运动、节奏与动态变化，处理时间通常更长。"
                    : "图片用于反推画面风格和主体细节。"}
                </span>
                <strong>
                  {selectedFile ? (
                    <>
                      预计消耗 <BillingPoints feature="replicate" payload={{ kind: mode }} fallbackPoints={mode === "video" ? 10 : 5} /> 积分
                    </>
                  ) : (
                    "请上传文件"
                  )}
                </strong>
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
                <article className="replicate-recent-card" key={item.id}>
                  <div className="replicate-card-icon">
                    {item.source === "video" ? <FileVideo size={22} /> : <FileImage size={22} />}
                  </div>
                  <div className="replicate-card-info">
                    <strong>{item.description?.slice(0, 64) || item.prompt?.slice(0, 64) || "分析结果"}</strong>
                    <span>{item.source === "video" ? "视频" : "图片"} · {item.createdAt}</span>
                  </div>
                  <div className="replicate-card-actions">
                    <button type="button" onClick={() => copyPrompt(item)} title="复制" aria-label="复制">
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadText(`replicate-${item.id || Date.now()}.txt`, item.prompt || item.description || "")}
                      title="下载"
                      aria-label="下载"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
