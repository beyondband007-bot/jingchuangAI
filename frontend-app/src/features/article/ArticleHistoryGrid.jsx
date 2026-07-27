import React from "react";
import { CircleAlert, Loader2, RefreshCcw, Star, Trash2 } from "lucide-react";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { formatBeijingDateTime } from "../../utils/time";
import { getArticleImages } from "./articlePreviewUtils";

export function ArticleHistoryGrid({
  cards,
  onPreview,
  onToggleFavorite,
  onRegenerate,
  onDelete,
}) {
  return (
    <section className="article-history-section article-history-page">
      <div className="article-history-grid">
        {cards.map((task) => {
          const taskImages = getArticleImages(task);
          const isCompleted = ["completed", "partial_completed"].includes(task.status) && taskImages.length > 0;
          const isFailed = task.status === "failed";
          const canRetryOrDelete = isCompleted || isFailed;
          return (
            <article className={`article-history-card status-${task.status}`} key={task.id}>
              <button className="article-history-preview" type="button" onClick={() => onPreview(task)} disabled={!isCompleted}>
                {taskImages.length ? (
                  <span className={`article-history-image-stack count-${Math.min(taskImages.length, 4)}`}>
                    {taskImages.slice(0, 4).map((item, index) => (
                      <img
                        src={item.image}
                        alt={`爆款图文历史结果 ${index + 1}`}
                        key={item.id}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </span>
                ) : isFailed ? (
                  <span className="article-history-failed">
                    <CircleAlert size={28} />
                    生成失败
                  </span>
                ) : (
                  <span className="article-history-loading">
                    <Loader2 size={26} className="is-spinning" />
                    生成中
                  </span>
                )}
              </button>
              <div className="article-history-meta">
                <strong>{task.copy?.title || task.title || task.model || "爆款图文"}</strong>
                <p>
                  {taskImages.length || task.count || 1} 张 · {task.ratio} · {task.quality} ·{" "}
                  {formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}
                </p>
                <div className="article-history-actions">
                  <button className={task.favorite ? "is-favorite" : ""} type="button" onClick={() => onToggleFavorite(task.id)} aria-label="收藏" disabled={!isCompleted}>
                    <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
                  </button>
                  <button type="button" onClick={() => onRegenerate(task)} aria-label="重新生成" disabled={!canRetryOrDelete}>
                    <RefreshCcw size={15} />
                  </button>
                  <button type="button" onClick={() => onDelete(task.id)} aria-label="删除" disabled={!canRetryOrDelete}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!cards.length && <HistoryEmptyState className="article-history-empty" title="暂无爆款图文生成记录" />}
      </div>
    </section>
  );
}
