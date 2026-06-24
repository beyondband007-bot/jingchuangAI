import React from "react";
import {
  CheckCircle2,
  Download,
  RefreshCcw,
  Sparkles,
  Star,
} from "lucide-react";

export function VideoGenerationResultPlayer({
  task,
  onBack,
  onFavorite,
  onRegenerate,
}) {
  if (!task?.video) return null;

  return (
    <div className="video-gen-immersive-panel video-gen-result-panel">
      <header className="video-gen-immersive-hero video-gen-result-hero">
        <h1>
          <CheckCircle2 size={22} />
          视频生成完成
          <Sparkles size={18} />
        </h1>
        {task.prompt ? <p>{task.prompt}</p> : null}
      </header>

      <div className="video-gen-result-player-shell">
        <video
          key={task.video}
          src={task.video}
          controls
          playsInline
          preload="metadata"
        />
      </div>

      <div className="video-gen-result-meta">
        <span className="video-gen-result-tag">{task.model}</span>
        <span className="video-gen-result-tag">{task.ratio}</span>
        <span className="video-gen-result-tag">{task.duration} 秒</span>
        {task.time ? (
          <span className="video-gen-result-tag is-muted">{task.time}</span>
        ) : null}
      </div>

      <div className="video-gen-result-actions">
        <button type="button" className="is-primary" onClick={onBack}>
          继续创作
        </button>
        <a className="video-gen-result-action" href={task.video} download>
          <Download size={15} />
          下载视频
        </a>
        <button
          type="button"
          className={`video-gen-result-action${task.favorite ? " is-favorite" : ""}`}
          onClick={onFavorite}
        >
          <Star size={15} fill={task.favorite ? "#f8d545" : "none"} />
          {task.favorite ? "已收藏" : "收藏"}
        </button>
        <button
          type="button"
          className="video-gen-result-action"
          onClick={onRegenerate}
        >
          <RefreshCcw size={15} />
          再次生成
        </button>
      </div>
    </div>
  );
}
