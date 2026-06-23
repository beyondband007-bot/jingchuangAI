import React from "react";
import { MoreHorizontal, Music, Play } from "lucide-react";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function generateCoverGradient(seed) {
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  ];
  let hash = 0;
  const str = String(seed || "music");
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function MusicRecentGrid({ items = [], onSelectItem, emptyText = "还没有生成过音乐，快来创作第一首吧 ✨" }) {
  if (!items.length) {
    return <div className="music-ref-empty">{emptyText}</div>;
  }

  return (
    <div className="music-ref-recent-list">
      {items.map((item) => (
        <div key={item.id} className="music-ref-recent-card" onClick={() => onSelectItem?.(item)}>
          <div className="music-ref-recent-cover" style={{ background: generateCoverGradient(item.id) }}>
            <Music size={28} />
          </div>
          <div className="music-ref-recent-body">
            <div className="music-ref-recent-main">
              <strong>{item.prompt || "AI 音乐"}</strong>
              <span>{item.isInstrumental ? "纯音乐" : "带歌词"} · {formatDuration(item.durationMs)}</span>
            </div>
            <div className="music-ref-recent-actions">
              <button
                type="button"
                className="music-ref-recent-play"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectItem?.(item);
                }}
                aria-label="播放"
              >
                <Play size={14} fill="currentColor" />
              </button>
              <button type="button" className="music-ref-recent-more" onClick={(event) => event.stopPropagation()} aria-label="更多">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
