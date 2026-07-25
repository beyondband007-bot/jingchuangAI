import { Download, Image, Play, Star, Trash2, Video } from "lucide-react";
import { canFavoriteAsset } from "./assetMappers";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";

export function AssetCardGrid({
  cards,
  isLoading = false,
  emptyTitle,
  emptyClassName = "",
  gridClassName = "",
  onSelect,
  onDelete,
  onToggleFavorite,
}) {
  if (!cards.length) {
    return (
      <HistoryEmptyState
        className={`fm-assets-empty-state ${emptyClassName}`.trim()}
        title={emptyTitle || (isLoading ? "正在加载作品" : "暂无作品")}
      />
    );
  }

  return (
    <div className={`fm-assets-grid ${gridClassName}`.trim()}>
      {cards.map((card) => {
        const canFavorite = canFavoriteAsset(card);
        const isInspiration = Boolean(card.isInspiration);
        return (
          <article
            className="fm-asset-card"
            key={card.id}
            onClick={() => onSelect?.(card)}
          >
            {card.isVideo && card.video ? (
              <video
                src={card.video}
                poster={card.poster || undefined}
                muted
                playsInline
                preload="none"
              />
            ) : card.src ? (
              <img
                src={card.src}
                alt={card.title}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ) : (
              <div className="fm-asset-placeholder">
                {card.isVideo ? <Video size={28} /> : <Image size={28} />}
              </div>
            )}
            <span>{card.type}</span>
            {card.isVideo && (
              <button type="button" aria-label="播放">
                <Play size={16} fill="currentColor" />
              </button>
            )}
            <div className="fm-asset-hover-actions">
              {!isInspiration && (
                <button
                  type="button"
                  aria-label="删除"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete?.(card);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              {!isInspiration &&
                (card.video || card.image ? (
                  <a
                    href={card.video || card.image}
                    download
                    aria-label="下载"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Download size={16} />
                  </a>
                ) : (
                  <button type="button" aria-label="下载" disabled>
                    <Download size={16} />
                  </button>
                ))}
              {canFavorite && (
                <button
                  type="button"
                  aria-label="收藏"
                  className={card.favorite ? "is-favorite" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleFavorite?.(card);
                  }}
                >
                  <Star
                    size={16}
                    fill={card.favorite ? "currentColor" : "none"}
                  />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
