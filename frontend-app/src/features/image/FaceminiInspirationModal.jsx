import { useEffect, useState } from "react";
import { Copy, Image, Sparkles, Star, X } from "lucide-react";
import { BaseModal } from "../../components/BaseModal";
import "../../components/faceminiDetailModal.css";

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
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setActiveSrc(null);
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
  const videoSrc =
    item.videoSrc || item.video || item.videoUrl || item.preview || item.source;

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
              <dd>{item.ratio || (isVideo ? "16:9" : "4:5")}</dd>
            </div>
            <div>
              <dt>推荐模型</dt>
              <dd>{item.model || (isVideo ? "Kling Video" : "Kling Image")}</dd>
            </div>
            <div>
              <dt>素材</dt>
              <dd>{item.material || (isVideo ? "视频封面" : "高清原图")}</dd>
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
