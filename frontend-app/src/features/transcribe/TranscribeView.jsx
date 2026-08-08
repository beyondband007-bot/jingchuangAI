import React, { useEffect, useRef, useState } from "react";
import "../audio-ui/audioResponsive.css";
import "../audio-ui/audioStateControls.css";
import "./transcribe.css";
import "../audio-ui/voiceWorkbench.css";
import "../audio-ui/voiceHistory.css";
import { CheckCircle2, Clipboard, Download, FileAudio, FileJson, Loader2, Trash2, X } from "lucide-react";
import { transcribeApi } from "./transcribeApi";
import BillingPoints from "../../components/BillingPoints.jsx";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { formatBeijingDateTime, formatBeijingStamp } from "../../utils/time";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import { useToast } from "../../components/ToastProvider";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { pauseOtherMedia } from "../../utils/exclusiveMediaPlayback";

const transcribeRecentStorageKey = "jingchuang.transcribe.recentResults";

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

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      cleanup();
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

function loadRecentResults() {
  try {
    return JSON.parse(window.localStorage.getItem(transcribeRecentStorageKey) || "[]");
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

function TranscribeUploadSlot({ fileState, isUploading, onPick, onClear }) {
  const inputRef = useRef(null);
  const hasFile = Boolean(fileState?.fileName);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!fileState?.file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(fileState.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileState?.file]);

  function pickFile(file) {
    if (file && !isUploading) onPick(file);
  }

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <div
      className={`marketing-composer__upload transcribe-upload-slot ${hasFile ? "has-file has-preview" : ""}`}
      role="button"
      tabIndex={isUploading ? -1 : 0}
      onClick={(event) => {
        if (event.target.closest(".transcribe-upload-preview, .ui-upload-clear-button")) return;
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !isUploading) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pickFile(event.dataTransfer.files?.[0]);
      }}
      aria-disabled={isUploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          pickFile(file);
        }}
      />
      {hasFile && !isUploading && (
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
      {hasFile && !isUploading && previewUrl ? (
        <div className="transcribe-upload-preview" onClick={(event) => event.stopPropagation()}>
          <audio src={previewUrl} controls preload="metadata" onPlay={(event) => pauseOtherMedia(event.currentTarget)} />
        </div>
      ) : isUploading ? (
        <Loader2 size={20} />
      ) : (
        <span className="marketing-upload-icon" aria-hidden="true">
          <img src="/assets/marketing/upload.svg" alt="" />
        </span>
      )}
      {!hasFile || isUploading ? <strong>{hasFile ? fileState.fileName : "上传音频文件"}</strong> : null}
      <small>{hasFile ? `${formatDuration(fileState.durationMs) || "已选择"} · ${formatBytes(fileState.size)}` : "支持 mp3 / wav / flac / m4a / webm，6 秒到 6 分钟"}</small>
    </div>
  );
}

function TranscribeResult({ result, onCopy, onDownloadText, onDownloadJson }) {
  if (!result) return null;

  return (
    <div className="marketing-result transcribe-result-panel">
      <div className="marketing-result__head transcribe-result-head">
        <span>
          <CheckCircle2 size={17} />
          转录结果
        </span>
        <div className="marketing-result__actions transcribe-result-actions">
          <button type="button" onClick={onCopy} data-tooltip="复制文本" aria-label="复制文本">
            <Clipboard size={15} />
          </button>
          <button type="button" onClick={onDownloadText} data-tooltip="下载 TXT" aria-label="下载 TXT">
            <Download size={15} />
          </button>
          <button type="button" onClick={onDownloadJson} data-tooltip="下载 JSON" aria-label="下载 JSON">
            <FileJson size={15} />
          </button>
        </div>
      </div>
      <textarea readOnly value={result.text || result.formattedText || ""} />
      <div className="transcribe-result-meta">
        <span>{formatDuration(result.durationMs)}</span>
        <span>{result.segments?.length ? `${result.segments.length} 段` : "纯文本"}</span>
        {result.traceId && <span>Trace {String(result.traceId).slice(0, 8)}</span>}
      </div>
    </div>
  );
}

export function TranscribeView({ authUser, onOpenFeature, resetSignal = 0 }) {
  const { showToast: showGlobalToast, dismissToast } = useToast();
  const [audioFile, setAudioFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);
  const isGuest = Boolean(authUser?.isGuest);

  function showToast(type, message) {
    showGlobalToast(message, { type });
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(transcribeRecentStorageKey, JSON.stringify(recentResults));
    } catch {
      // Recent transcription history is optional.
    }
  }, [recentResults]);

  useEffect(() => {
    let mounted = true;
    transcribeApi.getTasks().then((items) => {
      if (mounted) setRecentResults(items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!resetSignal) return;
    setAudioFile(null);
    setNotice("");
    setIsTranscribing(false);
    setResult(null);
    setViewTab("home");
    dismissToast();
  }, [resetSignal]);

  async function pickAudioFile(file) {
    setNotice("");
    setResult(null);
    try {
      if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|flac|webm)$/i.test(file.name)) {
        throw new Error("请上传音频文件，视频文件请使用视频配音功能。");
      }
      if (file.size > 50 * 1024 * 1024) throw new Error("音频文件需小于 50MB");
      const durationMs = await readAudioDuration(file);
      if (!durationMs) throw new Error("无法读取音频时长，请检查文件是否完整。");
      if (durationMs && (durationMs < 6000 || durationMs > 6 * 60 * 1000)) {
        throw new Error("音频时长需在 6 秒到 6 分钟之间");
      }
      setAudioFile({
        file,
        fileName: file.name,
        size: file.size,
        durationMs
      });
      setNotice("音频已选择，可以开始转录");
    } catch (error) {
      const message = error.message || "音频选择失败";
      setNotice(message);
      showToast("error", message);
    }
  }

  function clearAudioFile() {
    setAudioFile(null);
    setNotice("");
  }

  async function submitTranscribe() {
    if (isGuest) {
      setNotice("积分不够，请充值");
      return;
    }

    if (!audioFile?.file) {
      setNotice("请先上传音频文件");
      return;
    }

    setNotice("");
    setIsTranscribing(true);
    try {
      const data = await transcribeApi.transcribe(audioFile.file, audioFile.durationMs);
      const nextResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: audioFile.fileName.replace(/\.[^.]+$/, "") || "转录结果",
        fileName: audioFile.fileName,
        text: data.text || "",
        formattedText: data.formattedText || data.formatted_lyrics || "",
        segments: data.segments || [],
        durationMs: data.durationMs || audioFile.durationMs || 0,
        traceId: data.traceId || "",
        createdAt: formatBeijingDateTime()
      };
      setResult(nextResult);
      // A completed result is its own state. Clear the selected upload so it
      // cannot remain visible or be submitted again beneath the result.
      setAudioFile(null);
      setRecentResults((items) => [nextResult, ...items].slice(0, 20));
      showToast("success", "转录成功");
      setNotice("转录完成");
    } catch (error) {
      showToast("error", "转录失败，请稍后重试");
      setNotice(error.message || "转录失败");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function copyResultText(item = result) {
    if (!item) return;
    await navigator.clipboard.writeText(item.text || item.formattedText || "");
    setNotice("文本已复制");
  }

  function downloadText(item = result) {
    if (!item) return;
    downloadBlob({
      content: item.text || item.formattedText || "",
      fileName: makeFileName("transcribe", "txt"),
      type: "text/plain;charset=utf-8"
    });
  }

  function downloadJson(item = result) {
    if (!item) return;
    downloadBlob({
      content: JSON.stringify(item, null, 2),
      fileName: makeFileName("transcribe", "json"),
      type: "application/json;charset=utf-8"
    });
  }

  function performDeleteRecentResult(id) {
    setRecentResults((items) => items.filter((item) => item.id !== id));
    setResult((current) => (current?.id === id ? null : current));
  }

  const { requestDelete: deleteRecentResult, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteRecentResult,
      title: "删除转录记录？",
      message: "该转录文本会被移除，删除后无法恢复。",
    });
  const showRechargeAlert = isRechargeRequiredMessage(notice);

  function closeRechargeAlert() {
    setNotice("");
  }

  function goToRecharge() {
    closeRechargeAlert();
    onOpenFeature?.("billing");
  }

  return (
    <section className="transcribe-view-root">
      <FeatureViewTabs
        currentLabel="语音转文字"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => setViewTab("recent")}
      />

      <div className={`marketing-canvas transcribe-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && (
          <MarketingToolPanel
            className="audio-tool-panel transcribe-home-panel"
            title="语音转文字"
            subtitle="上传音频文件，自动提取文字内容，适合短音频转录和歌词草稿整理。"
          >
            {result && (
              <TranscribeResult
                result={result}
                onCopy={() => copyResultText(result)}
                onDownloadText={() => downloadText(result)}
                onDownloadJson={() => downloadJson(result)}
              />
            )}

            {!result && (
              <div className="marketing-composer audio-tool-composer">
                <div className="voice-upload-grid">
                  <TranscribeUploadSlot fileState={audioFile} isUploading={isTranscribing} onPick={pickAudioFile} onClear={clearAudioFile} />
                </div>
                <div className="marketing-composer__footer audio-tool-footer">
                  <strong className="audio-credit-hint">
                    {audioFile ? (
                      <>
                        预计消耗 <em><BillingPoints feature="transcribe" payload={{ durationMs: audioFile?.durationMs || 0 }} fallbackPoints={1} /></em> 积分
                      </>
                    ) : (
                      "请上传文件"
                    )}
                  </strong>
                  <div className="audio-tool-actions">
                    <button className="ui-send-button voice-generate-button" type="button" onClick={submitTranscribe} disabled={isTranscribing || !audioFile}>
                      {isTranscribing ? <Loader2 size={16} /> : <FileAudio size={16} />}
                      开始转录
                    </button>
                  </div>
                </div>
              </div>
            )}
          </MarketingToolPanel>
        )}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel transcribe-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <HistoryEmptyState title="暂无转录记录" />
            ) : (
              recentResults.map((item) => (
                <article className="voice-recent-card transcribe-recent-card" key={item.id}>
                  <div className="voice-recent-art">
                    <FileAudio size={22} />
                  </div>
                  <div className="voice-recent-info">
                    <strong>{item.title}</strong>
                    <span>{formatDuration(item.durationMs)} · {item.createdAt}</span>
                  </div>
                  <p>{item.text || item.formattedText || "暂无文本"}</p>
                  <div className="voice-recent-actions">
                    <button className="voice-recent-icon-button" type="button" onClick={() => copyResultText(item)} data-tooltip="复制文本" aria-label="复制文本">
                      <Clipboard size={16} />
                    </button>
                    <button className="voice-recent-icon-button" type="button" onClick={() => downloadText(item)} data-tooltip="下载 TXT" aria-label="下载 TXT">
                      <Download size={16} />
                    </button>
                    <button className="voice-recent-icon-button is-danger" type="button" onClick={() => deleteRecentResult(item.id)} data-tooltip="删除" aria-label="删除">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

      </div>
      {showRechargeAlert && (
        <CreditAlertDialog
          title="这次没有转录成功"
          message={notice}
          icon={<FileAudio size={28} />}
          onClose={closeRechargeAlert}
          onRecharge={goToRecharge}
        />
      )}
      {deleteConfirmDialog}
    </section>
  );
}
