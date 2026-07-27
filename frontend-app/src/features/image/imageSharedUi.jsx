import { useEffect, useRef, useState } from "react";
import {
  Download,
  Film,
  Image,
  Loader2,
  RefreshCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import "./imageSharedUi.css";

export function ResultCard({
  card,
  onDelete,
  onFavorite,
  onRegenerate,
  onPreview,
  isExample = false,
  isImageGallery = false,
  isSelected = false,
}) {
  const isProcessing =
    card.status === "pending" || card.status === "processing";
  const isFailed = card.status === "failed";
  const displaySrc = isImageGallery ? card.src || card.image : card.image;
  const displayFallback = isImageGallery ? card.fallbackSrc : undefined;
  const isCompleted =
    card.status === "completed" && Boolean(displaySrc || card.hdSrc);
  const canUseCompletedActions = !isExample && isCompleted;
  const canRetryOrDelete = !isExample && (isCompleted || isFailed);
  const canPreview = Boolean(
    displaySrc && onPreview && !isProcessing && !isFailed,
  );
  const shouldShowPlaceholder = isProcessing || isFailed || !displaySrc;

  return (
    <article
      className={`result-card status-${card.status} ${isExample ? "is-example" : ""} ${isImageGallery ? "is-image-gallery" : ""} ${isSelected ? "is-selected-result" : ""}`}
      data-image-card-id={card.id}
    >
      <div
        className={`result-preview ${card.grid ? "preview-grid" : ""} ${shouldShowPlaceholder ? "is-placeholder-preview" : ""}`}
        role={canPreview && isImageGallery ? "button" : undefined}
        tabIndex={canPreview && isImageGallery ? 0 : undefined}
        onClick={canPreview && isImageGallery ? () => onPreview(card) : undefined}
        onKeyDown={
          canPreview && isImageGallery
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPreview(card);
                }
              }
            : undefined
        }
      >
        {isProcessing && <div className="processing-state">生成中...</div>}
        {isFailed && <div className="failed-state">生成失败</div>}
        {!isProcessing && !isFailed && displaySrc ? (
          card.grid ? (
            <>
              <PreloadImage
                src={displaySrc}
                fallbackSrc={displayFallback}
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-3.jpg"
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-4.jpg"
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-5.jpg"
                alt={card.prompt}
              />
            </>
          ) : (
            <PreloadImage
              src={displaySrc}
              fallbackSrc={displayFallback}
              alt={card.prompt}
            />
          )
        ) : null}
        {card.referenceImageUrl && (
          <span className="result-reference-thumb" data-tooltip="参考图">
            <img src={card.referenceImageUrl} alt="" />
          </span>
        )}
        {!isProcessing && !isFailed && !card.image && (
          <span className="broken-image-mark" aria-hidden="true" />
        )}
      </div>
      {!isImageGallery && (
        <div className="result-meta">
          <div className="tag-row">
            <span className="model-tag">{card.model}</span>
            <span className="ratio-tag">{card.ratio}</span>
            <span className="quality-tag">{card.quality}</span>
            {card.referenceImageUrl && (
              <span className="reference-tag">参考图</span>
            )}
            {card.count > 1 && <span className="count-tag">{card.count}张</span>}
          </div>
          <div className="time-row">
            <span>{card.time || "示例"}</span>
            <strong>{card.price}</strong>
          </div>
          <p>{card.error || card.prompt}</p>
          <div className="card-actions">
            <button
              className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
              type="button"
              onClick={() => onFavorite(card.id)}
              aria-label="收藏"
              disabled={!canUseCompletedActions}
            >
              <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
            </button>
            {canUseCompletedActions ? (
              <a
                className="card-action-link"
                href={card.hdSrc || card.imageUrl || card.image}
                download
              >
                <Download size={15} />
                下载
              </a>
            ) : (
              <button type="button" disabled>
                <Download size={15} />
                下载
              </button>
            )}
            <button
              type="button"
              onClick={() => onRegenerate(card.id)}
              disabled={!canRetryOrDelete}
            >
              <RefreshCcw size={15} />
              再次生成
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              disabled={!canRetryOrDelete}
            >
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function formatReferenceImageSize(bytes = 0) {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function writeClipboardText(text) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export function ReferenceImageSlot({ image, isUploading, onRemove }) {
  if (!image && !isUploading) return null;

  if (isUploading) {
    return (
      <div className="fm-prompt-reference-list">
        <div className="fm-prompt-reference-card is-uploading">
          <span className="fm-prompt-reference-preview">
            <Loader2 size={16} className="is-spinning" />
          </span>
          <span className="fm-prompt-reference-meta">
            <strong>参考图上传中</strong>
            <small>上传完成后自动用于生成</small>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-prompt-reference-list">
      <div className="fm-prompt-reference-card">
        <span className="fm-prompt-reference-preview">
          {image?.url ? <img src={image.url} alt="" /> : <Image size={16} />}
        </span>
        <span className="fm-prompt-reference-meta">
          <strong data-tooltip={image?.originalName || "参考图"}>
            {image?.originalName || "参考图"}
          </strong>
          <small>{formatReferenceImageSize(image?.size)}</small>
        </span>
        <button type="button" onClick={onRemove} aria-label="移除参考图">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export function ReferenceMediaSlot({
  image,
  video,
  isUploading,
  onRemoveImage,
  onRemoveVideo,
}) {
  const media = image || video;
  const isVideo = Boolean(video);
  if (!media && !isUploading) return null;

  if (isUploading) {
    return (
      <div className="fm-prompt-reference-list">
        <div className="fm-prompt-reference-card is-uploading">
          <span className="fm-prompt-reference-preview">
            <Loader2 size={16} className="is-spinning" />
          </span>
          <span className="fm-prompt-reference-meta">
            <strong>参考素材上传中</strong>
            <small>上传完成后自动用于生成</small>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-prompt-reference-list">
      <div className="fm-prompt-reference-card">
        <span className="fm-prompt-reference-preview">
          {isVideo ? (
            <Film size={16} />
          ) : media?.url ? (
            <img src={media.url} alt="" />
          ) : (
            <Image size={16} />
          )}
        </span>
        <span className="fm-prompt-reference-meta">
          <strong data-tooltip={media?.originalName || (isVideo ? "参考视频" : "参考图")}>
            {media?.originalName || (isVideo ? "参考视频" : "参考图")}
          </strong>
          <small>
            {isVideo ? "视频参考素材" : formatReferenceImageSize(media?.size)}
          </small>
        </span>
        <button
          type="button"
          onClick={isVideo ? onRemoveVideo : onRemoveImage}
          aria-label={isVideo ? "移除参考视频" : "移除参考图"}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function PreloadImage({ src, fallbackSrc, alt }) {
  const frameRef = useRef(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const [loadState, setLoadState] = useState(src ? "loading" : "empty");
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof window === "undefined" || !("IntersectionObserver" in window),
  );

  useEffect(() => {
    if (!src) {
      setShouldLoad(false);
      return undefined;
    }
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }

    setShouldLoad(false);
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "360px 0px" },
    );
    const frame = frameRef.current;
    if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    setActiveSrc(src);
    if (!src) {
      setLoadState("empty");
      return undefined;
    }
    if (!shouldLoad) {
      setLoadState("deferred");
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    setLoadState("loading");

    const loadImage = (url) => {
      const probe = new window.Image();
      probe.decoding = "async";
      probe.onload = () => {
        if (!cancelled) {
          setActiveSrc(url);
          setLoadState("ready");
        }
      };
      probe.onerror = () => {
        if (cancelled) return;
        if (url === src && fallbackSrc && fallbackSrc !== src) {
          loadImage(fallbackSrc);
        } else {
          setLoadState("loading");
          retryTimer = window.setTimeout(() => loadImage(url), 2500);
        }
      };
      probe.src = url;
    };

    loadImage(src);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [src, fallbackSrc, shouldLoad]);

  if (!activeSrc) return null;

  const isLoading = shouldLoad && (loadState === "loading" || loadState === "failed");

  return (
    <span className="preload-image-frame" ref={frameRef}>
      {isLoading && (
        <span className="image-preload-skeleton" aria-label="图片加载中">
          <Loader2 size={22} />
          <span>图片加载中</span>
        </span>
      )}
      {shouldLoad && (
        <img
          className={isLoading ? "is-image-loading" : ""}
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadState("ready")}
          onError={() => {
            if (activeSrc === src && fallbackSrc && fallbackSrc !== src) {
              setActiveSrc(fallbackSrc);
            } else {
              setLoadState("failed");
            }
          }}
        />
      )}
    </span>
  );
}
