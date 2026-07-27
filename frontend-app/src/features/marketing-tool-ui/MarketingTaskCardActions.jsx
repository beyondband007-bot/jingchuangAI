import { Download, RefreshCcw, Star, Trash2 } from "lucide-react";

export function MarketingTaskCardActions({ task, onDelete, onFavorite, onRepeat }) {
  const isCompleted = task.status === "completed" && Boolean(task.resultUrl);
  const canRetryOrDelete = isCompleted || task.status === "failed";

  return (
    <div className="card-actions watermark-card-actions">
      <button
        className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
        type="button"
        onClick={() => onFavorite(task.id)}
        disabled={!isCompleted}
        aria-label="收藏"
      >
        <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
      </button>
      {isCompleted ? (
        <a className="card-action-link" href={task.resultUrl} download>
          <Download size={15} />
          下载
        </a>
      ) : (
        <button type="button" disabled>
          <Download size={15} />
          下载
        </button>
      )}
      <button type="button" onClick={() => onRepeat(task)} disabled={!canRetryOrDelete}>
        <RefreshCcw size={15} />
        再次生成
      </button>
      <button type="button" onClick={() => onDelete(task.id)} disabled={!canRetryOrDelete}>
        <Trash2 size={15} />
        删除
      </button>
    </div>
  );
}
