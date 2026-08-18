import React from "react";
import {
  Download,
  Loader2,
  RefreshCcw,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { HistoryEmptyState } from "../../../components/HistoryEmptyState";
import { formatBeijingDateTime } from "../../../utils/time";

function getTaskStatusLabel(status) {
  if (status === "completed") return "已完成";
  if (status === "failed") return "生成失败";
  return "处理中";
}

export function HistoryPanel({ tasks, onRepeat, onDelete, onFavorite, onOpen }) {
  return (
    <main className="vgw-history-page" aria-label="历史记录">
      <section className="vgw-history-page__card">
        <div className="vgw-history__list">
          {tasks.length === 0 ? (
            <HistoryEmptyState
              className="vgw-history__empty"
              fill
              borderless
              title="暂无历史记录"
            />
          ) : (
            tasks.map((task) => (
              <article key={task.id} className={`vgw-history__item status-${task.status}`}>
                <div className="vgw-history__preview">
                  {task.resultUrl && task.status === "completed" ? (
                    <button className="vgw-history__thumbnail" type="button" onClick={() => onOpen(task)} aria-label="查看动作迁移结果">
                      {task.thumbnailUrl ? <img src={task.thumbnailUrl} alt="动作迁移结果缩略图" loading="lazy" /> : <Video size={22} />}
                    </button>
                  ) : (
                    <div className="vgw-history__placeholder">
                      {task.status === "processing" ? (
                        <Loader2 size={24} className="vgw-spin" />
                      ) : (
                        <Video size={24} />
                      )}
                      <span>{task.status === "failed" ? "生成失败" : "处理中"}</span>
                    </div>
                  )}
                  <span className={`vgw-history__status is-${task.status}`}>
                    {getTaskStatusLabel(task.status)}
                  </span>
                </div>
                <div className="vgw-history__meta">
                  <div className="vgw-history__details">
                    <time>{formatBeijingDateTime(task.createdAt || task.time) || task.time}</time>
                  </div>
                  <strong>{task.price}</strong>
                </div>
                <div className="vgw-history__actions">
                  <button
                    type="button"
                    className={task.favorite ? "is-favorite" : ""}
                    onClick={() => onFavorite(task.id)}
                    disabled={task.status !== "completed"}
                    aria-label="收藏"
                    title="收藏"
                  >
                    <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
                  </button>
                  {task.resultUrl && task.status === "completed" ? (
                    <a href={task.resultUrl} download aria-label="下载视频" title="下载视频">
                      <Download size={14} />
                    </a>
                  ) : (
                    <button type="button" disabled aria-label="下载视频" title="下载视频">
                      <Download size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRepeat(task)}
                    disabled={task.status === "processing"}
                    aria-label="再次生成"
                    title="再次生成"
                  >
                    <RefreshCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    disabled={task.status === "processing"}
                    aria-label="删除"
                    title="删除"
                  >
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
