import React, { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Video, X } from "lucide-react";
import "./VideoDubbingFaceSwapWorkbench.css";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

function UploadCard({ asset, previewUrl, isUploading, onSelect, onClear, children }) {
  const inputRef = useRef(null);

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <section className="face-swap-workbench__upload-card face-swap-workbench__upload-card--single">
      <div className="face-swap-workbench__card-header">
        <div className="face-swap-workbench__card-copy">
          <h2>上传视频文件</h2>
          <p>建议 2GB 以内</p>
        </div>
        <span className="face-swap-workbench__format-pill">MP4 / WEBM / MOV / AVI</span>
      </div>

      <button
        className={`face-swap-workbench__drop-zone face-swap-workbench__drop-zone--video ${previewUrl ? "has-preview" : ""}`}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(event) => {
            onSelect?.(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
        {previewUrl ? (
          <video src={previewUrl} muted playsInline preload="metadata" />
        ) : (
          <>
            <Video size={56} />
            <strong>点击或拖拽视频到此处上传</strong>
            <span>支持 MP4 / WEBM / MOV / AVI 格式</span>
          </>
        )}
        {previewUrl && !isUploading && (
          <span
            className="face-swap-workbench__clear-button"
            role="button"
            tabIndex={0}
            aria-label="清除已上传视频"
            onClick={clearFile}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") clearFile(event);
            }}
          >
            <X size={14} />
          </span>
        )}
        {asset && <small>{asset.fileName} · {formatBytes(asset.sizeBytes)}</small>}
        {isUploading && (
          <span className="face-swap-workbench__uploading">
            <Loader2 size={14} />
            上传中...
          </span>
        )}
      </button>

      <div className="face-swap-workbench__sample-title">
        上传视频后点击开始配音，系统将自动分析视频内容并生成配音和背景音乐
      </div>
      {children}
    </section>
  );
}

export function VideoDubbingFaceSwapWorkbench({ isSubmitting, api }) {
  const [videoAsset, setVideoAsset] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  async function selectVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("请上传视频文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setNotice("建议 2GB 以内");
      return;
    }
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview(window.URL.createObjectURL(file));
    setVideoAsset(null);
    setUploading(true);
    setNotice("");
    try {
      setVideoAsset(await api.uploadVideo(file));
    } catch (error) {
      setVideoPreview("");
      setNotice(error.message || "视频上传失败");
    } finally {
      setUploading(false);
    }
  }

  function clearVideo() {
    setVideoAsset(null);
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview("");
    setNotice("");
  }

  function submit() {
    if (!videoAsset) {
      setNotice("请先上传视频文件");
      return;
    }
    setNotice("视频上传成功，可开始配音。");
  }

  return (
    <div className="face-swap-workbench">
      <div className="face-swap-workbench__hero">
        <div>
          <h1>视频配音</h1>
          <p>上传视频，自动分析内容并生成配音与背景音乐</p>
        </div>
      </div>

      <div className="face-swap-workbench__upload-grid face-swap-workbench__upload-grid--single">
        <UploadCard
          asset={videoAsset}
          previewUrl={videoPreview}
          isUploading={uploading}
          onSelect={selectVideo}
          onClear={clearVideo}
        >
          <div className="face-swap-workbench__action-area face-swap-workbench__action-area--inside">
            <button
              className="face-swap-workbench__start-button"
              type="button"
              onClick={submit}
              disabled={isSubmitting || uploading}
            >
              {isSubmitting || uploading ? <Loader2 size={18} /> : <Sparkles size={18} />}
              开始配音
            </button>
          </div>
        </UploadCard>
      </div>

      {notice && <div className="face-swap-workbench__notice">{notice}</div>}
    </div>
  );
}
