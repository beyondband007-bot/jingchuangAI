import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, Play, Video, X } from "lucide-react";
import { cleanDisplayName, formatBytes } from "../utils";

function MediaLightbox({ url, title, onClose }) {
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
    <div className="vgw-media-lightbox" role="dialog" aria-modal="true" aria-label={`预览${title}`}>
      <button type="button" className="vgw-media-lightbox__backdrop" aria-label="关闭预览" onClick={onClose} />
      <figure className="vgw-media-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="vgw-media-lightbox__close" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <img src={url} alt={title} />
      </figure>
    </div>,
    document.body,
  );
}

export function InputUploadTile({
  slotLabel,
  kind,
  title,
  hint,
  previewUrl,
  asset,
  isUploading,
  accept,
  fileFallback,
  onSelect,
  onClear,
}) {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const isPhoto = kind === "photo";
  const Icon = isPhoto ? ImagePlus : Video;

  useEffect(() => {
    setVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [previewUrl]);

  async function handleVideoPreviewClick(event) {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setVideoPlaying(false);
      }
    } else {
      video.pause();
    }
  }

  return (
    <>
      <article className={`vgw-input-slot is-${kind} ${previewUrl ? "has-preview" : ""}`}>
        {slotLabel ? <div className="vgw-input-slot__badge">{slotLabel}</div> : null}
        <div className="vgw-input-slot__zone">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={(event) => {
              onSelect?.(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          {previewUrl ? (
            <>
              <button
                type="button"
                className={`vgw-input-slot__media ${isPhoto ? "is-image" : "is-video"}`}
                onClick={isPhoto ? () => setLightboxOpen(true) : handleVideoPreviewClick}
                aria-label={isPhoto ? "点击放大预览图片" : videoPlaying ? "点击暂停视频" : "点击播放视频"}
              >
                {isPhoto ? (
                  <img src={previewUrl} alt={title} />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      playsInline
                      preload="metadata"
                      onPlay={() => setVideoPlaying(true)}
                      onPause={() => setVideoPlaying(false)}
                      onEnded={() => setVideoPlaying(false)}
                    />
                    {!videoPlaying && (
                      <span className="vgw-input-slot__play" aria-hidden="true">
                        <Play size={22} fill="currentColor" />
                      </span>
                    )}
                  </>
                )}
              </button>
              {!isUploading && (
                <>
                  <button
                    type="button"
                    className="vgw-input-slot__replace"
                    onClick={() => inputRef.current?.click()}
                  >
                    更换
                  </button>
                  <button type="button" className="vgw-input-slot__clear" onClick={onClear} aria-label="清除">
                    <X size={14} />
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              type="button"
              className="vgw-input-slot__trigger"
              onClick={() => inputRef.current?.click()}
              aria-label={title}
            >
              <span className="vgw-input-slot__icon">
                <Icon size={26} />
              </span>
              <strong>{title}</strong>
              <span>{hint}</span>
            </button>
          )}
          {isUploading && (
            <div className="vgw-input-slot__overlay">
              <Loader2 size={22} className="vgw-spin" />
              <span>上传中</span>
            </div>
          )}
        </div>
        {asset && (
          <footer className="vgw-input-slot__meta">
            <small>
              {cleanDisplayName(asset.fileName, fileFallback)} · {formatBytes(asset.sizeBytes)}
            </small>
          </footer>
        )}
      </article>
      {lightboxOpen && (
        <MediaLightbox url={previewUrl} title={title} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

export function InputSection({
  stepState = "active",
  subjectSlot,
  driverSlot,
  config,
  workflowStatus,
}) {
  return (
    <section className={`vgw-step vgw-step--input is-${stepState}`} data-workflow-status={workflowStatus}>
      <div className="vgw-step__label">
        <span>01</span>
        <strong>素材输入</strong>
      </div>
      <div className="vgw-glass-card vgw-input-section">
        <div className="vgw-input-section__flow">
          <InputUploadTile {...subjectSlot} />
          <InputUploadTile {...driverSlot} />
        </div>
        {config && <div className="vgw-input-section__config">{config}</div>}
      </div>
    </section>
  );
}
