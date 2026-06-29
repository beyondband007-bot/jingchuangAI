import React from "react";
import {
  Download,
  History,
  Loader2,
  RefreshCcw,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { formatBeijingDateTime } from "../../../utils/time";

export function HistoryPanel({ tasks, onRepeat, onDelete, onFavorite, emptyHint }) {
  return (
    <main className="vgw-history-page" aria-label="历史记录">
      <section className="vgw-history-page__card">
        <h1>最近生成</h1>
        <div className="vgw-history__list">
          {tasks.length === 0 ? (
            <div className="vgw-history__empty">
              <History size={24} />
              <strong>暂无生成记录</strong>
              <p>{emptyHint || "完成的视频会显示在这里"}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <article key={task.id} className={`vgw-history__item status-${task.status}`}>
                <div className="vgw-history__preview">
                  {task.resultUrl && task.status === "completed" ? (
                    <video
                      src={task.resultUrl}
                      controls
                      playsInline
                      preload="metadata"
                      poster={task.thumbnailUrl || task.imageUrl}
                    />
                  ) : (
                    <div className="vgw-history__placeholder">
                      {task.status === "processing" ? (
                        <Loader2 size={22} className="vgw-spin" />
                      ) : (
                        <Video size={22} />
                      )}
                      <span>{task.status === "failed" ? "生成失败" : "处理中"}</span>
                    </div>
                  )}
                </div>
                <div className="vgw-history__meta">
                  <time>{formatBeijingDateTime(task.createdAt || task.time) || task.time}</time>
                  <strong>{task.price}</strong>
                </div>
                <div className="vgw-history__actions">
                  <button
                    type="button"
                    className={task.favorite ? "is-favorite" : ""}
                    onClick={() => onFavorite(task.id)}
                    disabled={task.status !== "completed"}
                    aria-label="收藏"
                  >
                    <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
                  </button>
                  {task.resultUrl && task.status === "completed" ? (
                    <a href={task.resultUrl} download>
                      <Download size={14} />
                    </a>
                  ) : (
                    <button type="button" disabled>
                      <Download size={14} />
                    </button>
                  )}
                  <button type="button" onClick={() => onRepeat(task)} disabled={task.status === "processing"}>
                    <RefreshCcw size={14} />
                  </button>
                  <button type="button" onClick={() => onDelete(task.id)} disabled={task.status === "processing"}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
