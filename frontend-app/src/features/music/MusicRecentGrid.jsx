import React, { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, MoreHorizontal, Music, Play, Trash2 } from "lucide-react";
import { getLyricSubtitle } from "./musicPlayerUtils";

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

function isItemGenerating(item, generatingId) {
  return item.id === generatingId || item.status === "processing";
}

export function MusicRecentGrid({
  items = [],
  generatingId = "",
  onSelectItem,
  onDownloadItem,
  onEditCoverItem,
  onDeleteItem,
  emptyText = "还没有生成过音乐，快来创作第一首吧 ✨"
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuWrapRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return undefined;

    function handlePointerDown(event) {
      if (!menuWrapRef.current?.contains(event.target)) {
        setOpenMenuId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  if (!items.length) {
    return <div className="music-ref-empty">{emptyText}</div>;
  }

  return (
    <div className="music-ref-recent-list">
      {items.map((item) => {
        const isGenerating = isItemGenerating(item, generatingId);
        const isMenuOpen = openMenuId === item.id;

        return (
          <div
            key={item.id}
            className={`music-ref-recent-card${isGenerating ? " is-generating" : ""}`}
            onClick={() => !isGenerating && onSelectItem?.(item)}
          >
            <button
              type="button"
              className="music-ref-recent-cover"
              style={item.coverUrl ? undefined : { background: generateCoverGradient(item.id) }}
              onClick={(event) => {
                event.stopPropagation();
                if (!isGenerating) onSelectItem?.(item);
              }}
              disabled={isGenerating}
              aria-label={`打开 ${getLyricSubtitle(item)} 播放器`}
            >
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" className="music-ref-recent-cover-image" />
              ) : (
                <Music size={28} />
              )}
            </button>
            <div className="music-ref-recent-body">
              <div className="music-ref-recent-main">
                <strong>{getLyricSubtitle(item)}</strong>
                <span>
                  {item.isInstrumental ? "纯音乐" : "带歌词"}
                  {!item.title && item.prompt ? ` · ${item.prompt}` : ""}
                  {item.durationMs ? ` · ${formatDuration(item.durationMs)}` : ""}
                </span>
              </div>
              <div className="music-ref-recent-actions">
                {isGenerating ? (
                  <span className="music-gen-waiting-recent-status">
                    <Loader2 size={14} className="music-lyrics-sync-spinner" />
                    生成中...
                  </span>
                ) : (
                  <>
                    {generatingId ? (
                      <span className="music-gen-waiting-recent-duration">{formatDuration(item.durationMs)}</span>
                    ) : null}
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
                    <div
                      className={`music-ref-recent-more-wrap${isMenuOpen ? " is-open" : ""}`}
                      ref={isMenuOpen ? menuWrapRef : null}
                    >
                      <button
                        type="button"
                        className={`music-ref-recent-more${isMenuOpen ? " is-active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((current) => (current === item.id ? null : item.id));
                        }}
                        aria-label="更多操作"
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {isMenuOpen ? (
                        <div className="music-ref-recent-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              onEditCoverItem?.(item);
                            }}
                          >
                            <ImagePlus size={14} />
                            编辑封面
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              onDownloadItem?.(item);
                            }}
                          >
                            <Download size={14} />
                            下载
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="is-danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              onDeleteItem?.(item);
                            }}
                          >
                            <Trash2 size={14} />
                            删除
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
