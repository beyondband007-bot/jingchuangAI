import React, { useEffect, useRef, useState } from "react";
import { Copy, Download, FileImage, FileVideo, Loader2, Sparkles, Star, Upload } from "lucide-react";
import { replicateApi } from "./replicateApi";

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

function ReplicateUpload({ mode, onFile, isAnalyzing }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const isImage = mode === "image";
  const accept = isImage ? ".jpg,.jpeg,.png,.gif,.webp,image/*" : ".mp4,.mov,.avi,.webm,video/*";
  const hint = isImage ? "支持 jpg / png / gif / webp，最大 20MB" : "支持 mp4 / mov / webm / avi，最大 100MB";

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    if (isAnalyzing) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <button
      type="button"
      className={`replicate-upload-slot ${dragOver ? "drag-over" : ""}`}
      onClick={() => !isAnalyzing && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      disabled={isAnalyzing}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <span className="replicate-upload-icon">
        {isAnalyzing ? <Loader2 size={22} /> : isImage ? <FileImage size={22} /> : <FileVideo size={22} />}
      </span>
      <strong>{isAnalyzing ? "正在反推提示词..." : isImage ? "+ 上传图片素材" : "+ 上传视频素材"}</strong>
      <small>{hint}</small>
    </button>
  );
}

function ReplicateResult({ result, onCopy }) {
  if (!result) return null;

  return (
    <div className="replicate-result-panel">
      <div className="replicate-result-head">
        <span>
          {result.source === "video" ? <FileVideo size={17} /> : <FileImage size={17} />}
          {result.source === "video" ? "视频提示词" : "图片提示词"}
        </span>
        <div className="replicate-result-actions">
          <button type="button" onClick={onCopy} title="复制提示词" aria-label="复制提示词">
            <Copy size={15} />
          </button>
          <button
            type="button"
            onClick={() => downloadText(`replicate-${result.id || Date.now()}.txt`, result.prompt || result.description || "")}
            title="下载提示词"
            aria-label="下载提示词"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      <div className="replicate-prompt-box">
        <label>AI 生成提示词</label>
        <textarea readOnly value={result.prompt || ""} />
      </div>

      {result.description && (
        <div className="replicate-description">
          <label>内容描述</label>
          <p>{result.description}</p>
        </div>
      )}

      {result.tags?.length > 0 && (
        <div className="replicate-tags">
          {result.tags.map((tag) => (
            <span key={tag} className="replicate-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="replicate-result-meta">
        <span>{result.fileName || (result.source === "video" ? "视频素材" : "图片素材")}</span>
        {result.createdAt && <span>{result.createdAt}</span>}
      </div>
    </div>
  );
}

export function ReplicateView() {
  const [mode, setMode] = useState("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentResult, setCurrentResult] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [recentResults, setRecentResults] = useState(loadRecentResults);

  useEffect(() => {
    window.localStorage.setItem(replicateRecentStorageKey, JSON.stringify(recentResults));
  }, [recentResults]);

  async function handleFile(file) {
    setNotice("");
    setIsAnalyzing(true);
    try {
      const data = mode === "image"
        ? await replicateApi.analyzeImage(file, file.name)
        : await replicateApi.analyzeVideo(file, file.name);

      const result = {
        id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: data.prompt || "",
        description: data.description || "",
        tags: data.tags || [],
        source: data.source || mode,
        fileName: data.fileName || file.name,
        createdAt: data.createdAt || new Date().toLocaleString("zh-CN", { hour12: false })
      };

      setCurrentResult(result);
      setRecentResults((items) => [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20));
      setNotice("反推完成");
    } catch (error) {
      setNotice(error.message || "分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function copyPrompt(result = currentResult) {
    const text = result?.prompt || result?.description || "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setNotice("提示词已复制");
    }).catch(() => {
      setNotice("复制失败");
    });
  }

  return (
    <section className="voice-conversion-view-root replicate-view">
      <div className="image-filter-tabs voice-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>
          主页
        </button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => setViewTab("recent")}>
          最近分析
          {recentResults.length > 0 && <span className="tab-badge">{recentResults.length}</span>}
        </button>
        <button type="button" disabled>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
      </div>

      <div className={`voice-conversion-canvas replicate-canvas ${viewTab === "recent" ? "is-recent" : ""}`}>
        {viewTab === "home" ? (
          <>
            {!currentResult && (
              <div className="voice-hero-empty replicate-hero-empty">
                <span className="voice-hero-icon replicate-hero-icon">
                  <Sparkles size={42} />
                </span>
                <h1>AI 复刻</h1>
                <p>上传参考图片或视频，自动理解画面主体、风格、镜头语言与细节特征，反推出可再次生成的高质量提示词。</p>
              </div>
            )}

            {currentResult && (
              <div className="replicate-result-wrap">
                <ReplicateResult result={currentResult} onCopy={() => copyPrompt()} />
                <button
                  type="button"
                  className="replicate-reset-btn"
                  onClick={() => {
                    setCurrentResult(null);
                    setNotice("");
                  }}
                >
                  继续分析
                </button>
                {notice && <div className="replicate-notice">{notice}</div>}
              </div>
            )}

            <div className="replicate-floating-composer">
              <div className="replicate-mode-toggle" aria-label="选择复刻类型">
                <button
                  type="button"
                  className={mode === "image" ? "active" : ""}
                  onClick={() => !isAnalyzing && setMode("image")}
                  disabled={isAnalyzing}
                >
                  <FileImage size={16} />
                  图片复刻
                </button>
                <button
                  type="button"
                  className={mode === "video" ? "active" : ""}
                  onClick={() => !isAnalyzing && setMode("video")}
                  disabled={isAnalyzing}
                >
                  <FileVideo size={16} />
                  视频复刻
                </button>
              </div>

              <div className="replicate-upload-area">
                <ReplicateUpload mode={mode} onFile={handleFile} isAnalyzing={isAnalyzing} />
              </div>

              <div className="replicate-composer-footer">
                <span>{notice || "图片用于反推画面风格和主体细节；视频会额外分析镜头运动、节奏与动态变化。"}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="replicate-recent-list">
            {recentResults.length === 0 ? (
              <div className="voice-recent-empty">
                <Upload size={28} />
                <strong>暂无分析记录</strong>
                <p>回到主页上传图片或视频开始复刻。</p>
              </div>
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
            {notice && <div className="replicate-notice">{notice}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
