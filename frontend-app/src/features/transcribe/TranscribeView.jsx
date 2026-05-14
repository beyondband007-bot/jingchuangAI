import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clipboard, Download, FileAudio, FileJson, Loader2, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { transcribeApi } from "./transcribeApi";

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
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
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
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <button className={`voice-upload-slot transcribe-upload-slot ${hasFile ? "has-file" : ""}`} type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.m4a,.wav,.flac,.webm,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm,video/webm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
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
      <span className="voice-upload-icon">{isUploading ? <Loader2 size={18} /> : <Plus size={18} />}</span>
      <strong>{hasFile ? fileState.fileName : "+ 上传音频文件"}</strong>
      <small>{hasFile ? `${formatDuration(fileState.durationMs) || "已选择"} · ${formatBytes(fileState.size)}` : "支持 mp3 / wav / flac / m4a / webm，6秒到6分钟"}</small>
    </button>
  );
}

function TranscribeResult({ result, onCopy, onDownloadText, onDownloadJson }) {
  if (!result) return null;

  return (
    <div className="transcribe-result-panel">
      <div className="transcribe-result-head">
        <span>
          <CheckCircle2 size={17} />
          转录结果
        </span>
        <div className="transcribe-result-actions">
          <button type="button" onClick={onCopy} title="复制文本" aria-label="复制文本">
            <Clipboard size={15} />
          </button>
          <button type="button" onClick={onDownloadText} title="下载 TXT" aria-label="下载 TXT">
            <Download size={15} />
          </button>
          <button type="button" onClick={onDownloadJson} title="下载 JSON" aria-label="下载 JSON">
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

export function TranscribeView() {
  const [audioFile, setAudioFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);

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

  async function pickAudioFile(file) {
    setNotice("");
    setResult(null);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("音频文件需小于 50MB");
      const durationMs = await readAudioDuration(file);
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
      setNotice(error.message || "音频选择失败");
    }
  }

  function clearAudioFile() {
    setAudioFile(null);
    setNotice("");
  }

  async function submitTranscribe() {
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
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
      };
      setResult(nextResult);
      setRecentResults((items) => [nextResult, ...items].slice(0, 20));
      setNotice("转录完成");
    } catch (error) {
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

  function deleteRecentResult(id) {
    setRecentResults((items) => items.filter((item) => item.id !== id));
    setResult((current) => (current?.id === id ? null : current));
  }

  return (
    <section className="voice-conversion-view-root transcribe-view-root">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>最近生成</button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas transcribe-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" && !result && (
          <div className="voice-hero-empty transcribe-hero-empty">
            <span className="voice-hero-icon">
              <FileAudio size={42} />
            </span>
            <h1>语音转文字</h1>
            <p>上传音频文件，自动提取文字内容，适合短音频转录和歌词草稿整理</p>
          </div>
        )}

        {viewTab === "home" && result && (
          <TranscribeResult
            result={result}
            onCopy={() => copyResultText(result)}
            onDownloadText={() => downloadText(result)}
            onDownloadJson={() => downloadJson(result)}
          />
        )}

        {viewTab === "recent" && (
          <div className={`voice-recent-panel transcribe-recent-panel ${recentResults.length ? "has-items" : ""}`}>
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <FileAudio size={28} />
                <strong>暂无转录记录</strong>
                <p>完成后的转录文本会显示在这里，可直接复制或下载。</p>
              </div>
            ) : (
              recentResults.map((item) => (
                <article className="voice-recent-card transcribe-recent-card" key={item.id}>
                  <div className="voice-recent-art">
                    <FileAudio size={34} />
                  </div>
                  <div className="voice-recent-info">
                    <strong>{item.title}</strong>
                    <span>{formatDuration(item.durationMs)} · {item.createdAt}</span>
                  </div>
                  <p>{item.text || item.formattedText || "暂无文本"}</p>
                  <div className="voice-recent-actions">
                    <button className="voice-recent-icon-button" type="button" onClick={() => copyResultText(item)} title="复制文本" aria-label="复制文本">
                      <Clipboard size={15} />
                    </button>
                    <button className="voice-recent-icon-button" type="button" onClick={() => downloadText(item)} title="下载 TXT" aria-label="下载 TXT">
                      <Download size={15} />
                    </button>
                    <button className="voice-recent-icon-button is-danger" type="button" onClick={() => deleteRecentResult(item.id)} title="删除" aria-label="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {viewTab === "home" && (
          <div className="voice-floating-composer transcribe-floating-composer">
            <div className="voice-composer-title">
              <Sparkles size={16} />
              转录工作台
            </div>
            <div className="voice-upload-grid">
              <TranscribeUploadSlot fileState={audioFile} isUploading={isTranscribing} onPick={pickAudioFile} onClear={clearAudioFile} />
            </div>
            <div className="voice-composer-footer">
              <span>{notice || "MVP 使用 MiniMax 音频预处理能力，建议上传 6 秒到 6 分钟的清晰音频。"}</span>
              <div className="voice-actions">
                {result && (
                  <button className="voice-download" type="button" onClick={() => downloadText(result)}>
                    <Download size={15} />
                  </button>
                )}
                <button className="voice-generate-button" type="button" onClick={submitTranscribe} disabled={isTranscribing || !audioFile}>
                  {isTranscribing ? <Loader2 size={16} /> : <FileAudio size={16} />}
                  开始转录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
