import { useEffect, useState } from "react";
import { Copy, Image, Sparkles, Star, X } from "lucide-react";
import { BaseModal } from "../../components/BaseModal";
import "../../components/faceminiDetailModal.css";

function formatInspirationResolution(item) {
  if (item?.resolution) return String(item.resolution);
  if (item?.quality) return String(item.quality);
  const modelDescription = [item?.model, item?.modelKey, item?.providerModel, item?.mode]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
  const modelResolution = modelDescription.match(/\b(\d{3,4}\s*p|\d+\s*k)\b/i);
  if (modelResolution) return modelResolution[1].replace(/\s+/g, "").toUpperCase();
  const width = Number(item?.width);
  const height = Number(item?.height);
  if (width > 0 && height > 0) return `${Math.round(width)}×${Math.round(height)}`;
  return "—";
}

const catalogRatios = [
  ["16:9", 16 / 9],
  ["9:16", 9 / 16],
  ["4:3", 4 / 3],
  ["3:4", 3 / 4],
  ["3:2", 3 / 2],
  ["2:3", 2 / 3],
  ["1:1", 1],
];

function formatInspirationRatio(dimensions, fallback, isCatalogMaterial) {
  if (!isCatalogMaterial && fallback) return fallback;

  const width = Number(dimensions?.width);
  const height = Number(dimensions?.height);
  if (width > 0 && height > 0) {
    if (isCatalogMaterial) {
      const actualRatio = width / height;
      return catalogRatios.reduce((nearest, candidate) =>
        Math.abs(candidate[1] - actualRatio) < Math.abs(nearest[1] - actualRatio)
          ? candidate
          : nearest,
      )[0];
    }
    const greatestCommonDivisor = (left, right) => {
      let a = Math.round(left);
      let b = Math.round(right);
      while (b) [a, b] = [b, a % b];
      return a;
    };
    const divisor = greatestCommonDivisor(width, height);
    return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
  }
  return fallback;
}

export function FaceminiInspirationModal({
  item,
  onClose,
  onRemix,
  onReference,
  onFavorite,
  onCopyPrompt,
  copied = false,
  getInitialFavorite,
}) {
  const [activeSrc, setActiveSrc] = useState(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setActiveSrc(null);
    setActiveVideoSrc(null);
    setImageDimensions(null);
    setVideoDimensions(null);
    setIsFavorite(Boolean(item?.favorite) || Boolean(getInitialFavorite?.(item)));
  }, [getInitialFavorite, item?.id]);

  if (!item) return null;

  const isVideo = Boolean(
    item.isVideo ||
      item.mediaType === "video" ||
      item.video ||
      item.videoSrc ||
      item.videoUrl,
  );
  const primarySrc =
    item.videoSrc ||
    item.hdSrc ||
    item.imageUrl ||
    item.image ||
    item.poster ||
    item.thumbnail ||
    item.src;
  const fallbackSrc = item.hdFallbackSrc || item.fallbackSrc;
  const imageSrc = activeSrc || primarySrc;
  const primaryVideoSrc =
    item.videoSrc || item.video || item.videoUrl || item.preview || item.source;
  const fallbackVideoSrc =
    item.videoFallbackSrc || item.videoFallback || item.mp4 || null;
  const videoSrc = activeVideoSrc || primaryVideoSrc;
  const mediaDimensions = videoDimensions || imageDimensions;
  const resolution = mediaDimensions
    ? `${mediaDimensions.width}×${mediaDimensions.height}`
    : formatInspirationResolution(item);

  return (
    <BaseModal
      open={Boolean(item)}
      variant="detail"
      className="fm-detail-modal-backdrop"
      surfaceClassName="fm-detail-modal"
      ariaLabel={`${item.title || "灵感详情"}详情`}
      closeLabel="关闭详情"
      onClose={onClose}
    >
        <div className="fm-detail-media">
          {isVideo && videoSrc ? (
            <video
              src={videoSrc}
              poster={item.poster || imageSrc}
              controls
              playsInline
              autoPlay
              muted
              onLoadedMetadata={(event) => {
                const { videoWidth: width, videoHeight: height } = event.currentTarget;
                if (width > 0 && height > 0) {
                  setVideoDimensions({ width, height });
                }
              }}
              onError={() => {
                if (fallbackVideoSrc && videoSrc !== fallbackVideoSrc) {
                  setActiveVideoSrc(fallbackVideoSrc);
                }
              }}
            />
          ) : (
            <img
              src={imageSrc}
              alt={item.title || "灵感图片"}
              onError={() => {
                if (activeSrc !== fallbackSrc && fallbackSrc) {
                  setActiveSrc(fallbackSrc);
                }
              }}
              onLoad={(event) => {
                const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                if (width > 0 && height > 0) {
                  setImageDimensions({ width, height });
                }
              }}
            />
          )}
        </div>
        <aside className="fm-detail-info">
          <button
            className="fm-detail-close"
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={20} />
          </button>
          <p className="fm-detail-eyebrow">
            {item.category || item.type || "图片灵感"}
          </p>
          <h2>{item.title || "灵感详情"}</h2>
          <label>提示词</label>
          <p className="fm-detail-prompt">{item.prompt || "暂无提示词"}</p>
          {onCopyPrompt && (
            <button
              className="fm-detail-copy"
              type="button"
              onClick={onCopyPrompt}
            >
              <Copy size={15} />
              {copied ? "已复制" : "复制提示词"}
            </button>
          )}
          <dl>
            <div>
              <dt>比例</dt>
              <dd>{formatInspirationRatio(
                mediaDimensions,
                item.ratio || (isVideo ? "16:9" : "4:5"),
                Boolean(item.categoryId),
              )}</dd>
            </div>
            <div>
              <dt>分辨率</dt>
              <dd>{resolution}</dd>
            </div>
            <div>
              <dt>使用模型</dt>
              <dd>{item.model || (isVideo ? "Kling Video" : "Kling Image")}</dd>
            </div>
          </dl>
          <div className="fm-detail-actions">
            <button
              className="is-primary"
              type="button"
              onClick={() => onRemix?.(item)}
            >
              <Sparkles size={16} />
              生成同款
            </button>
            <button
              className="is-secondary"
              type="button"
              onClick={() => onReference?.(item)}
            >
              <Image size={16} />
              用作参考
            </button>
            {onFavorite && (
              <button
                className={`is-favorite ${isFavorite ? "is-active" : ""}`}
                type="button"
                onClick={async () => {
                  try {
                    const nextValue = await onFavorite(item);
                    setIsFavorite(Boolean(nextValue));
                  } catch {
                    // Keep the current state when the favorite action fails.
                  }
                }}
                aria-label={isFavorite ? "取消收藏" : "收藏"}
                title={isFavorite ? "取消收藏" : "收藏"}
              >
                <Star size={17} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </aside>
    </BaseModal>
  );
}
