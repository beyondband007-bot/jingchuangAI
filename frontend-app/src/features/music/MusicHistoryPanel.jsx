import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward
} from "lucide-react";
import { formatBeijingStamp } from "../../utils/time";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatAudioTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getActiveLyricIndex(timeline, currentTimeSec) {
  if (!Array.isArray(timeline) || !timeline.length) return -1;
  const currentMs = currentTimeSec * 1000;
  let activeIndex = -1;
  for (let index = 0; index < timeline.length; index += 1) {
    const startMs = Number(timeline[index].startMs || 0);
    if (currentMs < startMs) break;
    if (activeIndex === -1 || startMs > Number(timeline[activeIndex].startMs || 0)) {
      activeIndex = index;
    }
  }
  return activeIndex;
}

function getLineProgress(line, currentMs) {
  const start = Number(line?.startMs);
  const end = Number(line?.endMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (currentMs - start) / (end - start)));
}

function getLyricSubtitle(item) {
  const timeline = item.lyricsTimeline || [];
  if (timeline[0]?.text) return timeline[0].text;
  const firstLine = String(item.lyrics || "").split(/\r?\n/).map((t) => t.trim()).find(Boolean);
  return firstLine || "AI 音乐";
}

function makeFileName(prefix, ext) {
  return `${prefix}-${formatBeijingStamp()}.${ext}`;
}

async function downloadAudioUrl(audioUrl, fileName) {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error("音乐下载失败");
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function LyricLine({ line, isActive, progress, isNear }) {
  if (!isActive) {
    return (
      <p className={`music-expanded-lyric-line${isNear ? " is-near" : ""}`}>
        {line.text}
      </p>
    );
  }

  const chars = [...String(line.text || "")];
  const highlightCount = Math.max(0, Math.min(chars.length, Math.floor(chars.length * progress)));

  return (
    <p className="music-expanded-lyric-line is-active">
      <span className="music-expanded-lyric-sung">{chars.slice(0, highlightCount).join("")}</span>
      <span className="music-expanded-lyric-unsung">{chars.slice(highlightCount).join("")}</span>
    </p>
  );
}

export function MusicHistoryPanel({
  items = [],
  syncingIds = {},
  onSyncLyrics,
  variant = "history",
  initialActiveId = "",
  defaultExpanded = false,
  hideList = false
}) {
  const audioRef = useRef(null);
  const lyricScrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const [activeId, setActiveId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const playableItems = useMemo(
    () => items.filter((item) => item.audioUrl && item.status !== "failed"),
    [items]
  );

  const activeIndex = playableItems.findIndex((item) => item.id === activeId);
  const timeline = Array.isArray(activeItem?.lyricsTimeline) ? activeItem.lyricsTimeline : [];
  const currentMs = currentTime * 1000;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (!initialActiveId) return;
    const item = items.find((entry) => entry.id === initialActiveId);
    if (!item) return;
    setActiveId(initialActiveId);
    if (item.audioUrl && item.status !== "failed" && variant === "generation") {
      setIsPlaying(true);
    }
  }, [initialActiveId, items, variant]);

  useEffect(() => {
    if (variant === "generation" && items[0]?.id && !activeId) {
      setActiveId(items[0].id);
      if (items[0].audioUrl && items[0].status === "completed") {
        setIsPlaying(true);
      }
    }
  }, [variant, items, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const stillExists = items.some((item) => item.id === activeId);
    if (!stillExists) {
      setActiveId("");
      setIsPlaying(false);
      setIsExpanded(false);
    }
  }, [items, activeId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeItem?.audioUrl) return;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) {
      audio.playbackRate = speed;
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [activeItem?.id, activeItem?.audioUrl]);

  useEffect(() => {
    if (variant !== "generation") return;
    if (activeItem?.status === "completed" && activeItem?.audioUrl) {
      setIsExpanded(true);
      setIsPlaying(true);
    }
  }, [variant, activeItem?.status, activeItem?.audioUrl]);

  useEffect(() => {
    setActiveLyricIndex(getActiveLyricIndex(timeline, currentTime));
  }, [timeline, currentTime]);

  useEffect(() => {
    if (!isExpanded || activeLyricIndex < 0) return;
    const panel = lyricScrollRef.current;
    const line = activeLineRef.current;
    if (!panel || !line) return;
    const target = line.offsetTop - (panel.clientHeight / 2) + (line.clientHeight / 2);
    panel.scrollTo({ top: Math.max(0, target), behavior: isExpanded ? "smooth" : "auto" });
  }, [isExpanded, activeLyricIndex, activeId]);

  function selectTrack(item, { autoplay = true } = {}) {
    if (!item?.audioUrl || item.status === "failed") return;
    setActiveId(item.id);
    if (autoplay) {
      setIsPlaying(true);
      window.setTimeout(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.playbackRate = speed;
        audio.play().catch(() => setIsPlaying(false));
      }, 0);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !activeItem?.audioUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.playbackRate = speed;
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }

  function seekTo(ratio) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, ratio * audio.duration));
    setCurrentTime(audio.currentTime);
  }

  function playSibling(step) {
    if (!playableItems.length) return;
    const nextIndex = activeIndex < 0
      ? 0
      : (activeIndex + step + playableItems.length) % playableItems.length;
    selectTrack(playableItems[nextIndex]);
  }

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function renderSyncAction(item, { compact = false } = {}) {
    if (!item.lyrics?.trim() || item.isInstrumental) return null;
    const isSyncing = Boolean(syncingIds[item.id]) || item.lyricsSyncStatus === "processing";
    const hasTimeline = Array.isArray(item.lyricsTimeline) && item.lyricsTimeline.length > 0;
    const isFailed = item.lyricsSyncStatus === "failed";

    if (isSyncing) {
      return (
        <button className="music-history-sync-btn is-syncing" type="button" disabled>
          <Loader2 size={14} className="music-lyrics-sync-spinner" />
          {compact ? "" : "同步中"}
        </button>
      );
    }

    if (hasTimeline) {
      return (
        <button
          className="music-history-sync-btn"
          type="button"
          title="重新同步歌词"
          onClick={(event) => {
            event.stopPropagation();
            onSyncLyrics?.(item, { force: true });
          }}
        >
          <RefreshCw size={14} />
          {compact ? "" : "重新同步"}
        </button>
      );
    }

    return (
      <button
        className={`music-history-sync-btn${isFailed ? " is-failed" : ""}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSyncLyrics?.(item, { force: isFailed });
        }}
      >
        {isFailed ? "重试" : "同步歌词"}
      </button>
    );
  }

  if (!items.length) {
    return (
      <div className="music-history-empty">
        <Music size={28} />
        <strong>暂无生成记录</strong>
        <p>去主页创作你的第一首 AI 音乐，完成后会显示在这里。</p>
      </div>
    );
  }

  const showList = !hideList;
  const isProcessing = activeItem?.status === "processing";
  const isLyricsSyncing = activeItem?.lyricsSyncStatus === "processing";

  return (
    <div className={`music-history-panel${activeItem ? " has-player" : ""}${isExpanded ? " is-expanded" : ""}${variant === "generation" ? " is-generation" : ""}`}>
      <audio
        ref={audioRef}
        src={activeItem?.audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setCurrentTime(event.currentTarget.currentTime || 0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {showList ? (
      <div className="music-history-list-wrap">
        <div className="music-history-list-head">
          <span className="col-title">歌名 / 风格</span>
          <span className="col-prompt">描述</span>
          <span className="col-duration">时长</span>
          <span className="col-date">创建时间</span>
          <span className="col-action">操作</span>
        </div>
        <ul className="music-history-list">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const disabled = !item.audioUrl || item.status === "failed";
            return (
              <li key={item.id}>
                <button
                  className={`music-history-row${isActive ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
                  type="button"
                  onClick={() => selectTrack(item)}
                  disabled={disabled}
                >
                  <div className="col-title">
                    <span className="music-history-cover">
                      <Music size={16} />
                    </span>
                    <div className="music-history-title-block">
                      <strong>{getLyricSubtitle(item)}</strong>
                      <span>{item.prompt || "AI 音乐"}</span>
                    </div>
                  </div>
                  <div className="col-prompt">{item.prompt || "—"}</div>
                  <div className="col-duration">{formatDuration(item.durationMs)}</div>
                  <div className="col-date">{item.createdAt || "—"}</div>
                  <div className="col-action">{renderSyncAction(item, { compact: true })}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      ) : null}

      {activeItem && variant === "generation" && !isExpanded ? (
        <div className="music-generation-status-bar">
          {isProcessing ? (
            <p><Loader2 size={16} className="music-lyrics-sync-spinner" /> 正在生成音乐，请稍候...</p>
          ) : isLyricsSyncing ? (
            <p><Loader2 size={16} className="music-lyrics-sync-spinner" /> 音乐已生成，正在同步歌词...</p>
          ) : (
            <p>音乐已就绪，点击展开查看歌词</p>
          )}
        </div>
      ) : null}

      {activeItem && (!isExpanded || variant !== "generation") ? (
        <div className={`music-mini-player${variant === "generation" ? " is-inline" : ""}`}>
          <div className="music-mini-player-main">
            <button
              type="button"
              className="music-mini-cover"
              onClick={() => setIsExpanded(true)}
              aria-label="展开歌词"
            >
              <Music size={18} />
              <span className="music-mini-cover-expand">
                <Maximize2 size={16} />
              </span>
            </button>
            <span className="music-mini-meta">
              <strong>{getLyricSubtitle(activeItem)}</strong>
              <span>{activeItem.prompt || "AI 音乐"}</span>
            </span>
          </div>

          <div className="music-mini-controls">
            <button type="button" className="music-mini-btn" onClick={() => playSibling(-1)} aria-label="上一首">
              <SkipBack size={16} />
            </button>
            <button type="button" className="music-mini-btn is-primary" onClick={togglePlay} disabled={isProcessing || !activeItem.audioUrl} aria-label={isPlaying ? "暂停" : "播放"}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button type="button" className="music-mini-btn" onClick={() => playSibling(1)} aria-label="下一首">
              <SkipForward size={16} />
            </button>
          </div>

          <div className="music-mini-progress-wrap">
            <span>{formatAudioTime(currentTime)}</span>
            <div
              className="music-mini-progress-track"
              role="slider"
              aria-label="播放进度"
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                seekTo((event.clientX - rect.left) / rect.width);
              }}
            >
              <div className="music-mini-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span>{formatAudioTime(duration || activeItem.durationMs / 1000)}</span>
          </div>

          <div className="music-mini-tools">
            <button type="button" className="music-mini-btn" onClick={cycleSpeed}>{speed === 1 ? "1.0x" : `${speed}x`}</button>
            <button
              type="button"
              className="music-mini-btn"
              onClick={() => downloadAudioUrl(activeItem.audioUrl, makeFileName("ai-music", "mp3"))}
              aria-label="下载"
            >
              <Download size={16} />
            </button>

          </div>
        </div>
      ) : null}

      {isExpanded && activeItem ? (
        <div className={`music-expanded-player${variant === "generation" ? " is-generation" : ""}`} role="dialog" aria-modal="true">
          <div className="music-expanded-backdrop" onClick={() => setIsExpanded(false)} />
          <div className="music-expanded-sheet">
            <header className="music-expanded-header">
              <div>
                <h2>{getLyricSubtitle(activeItem)}</h2>
                <p>{activeItem.prompt || "AI 音乐"}</p>
              </div>
              <button type="button" className="music-expanded-close" onClick={() => setIsExpanded(false)} aria-label="收起">
                <Minimize2 size={20} />
              </button>
            </header>

            <div className="music-expanded-lyrics" ref={lyricScrollRef}>
              <div className="music-expanded-lyrics-inner">
              {isProcessing ? (
                <div className="music-expanded-status">
                  <Loader2 size={28} className="music-lyrics-sync-spinner" />
                  <p>正在生成音乐...</p>
                </div>
              ) : isLyricsSyncing && !timeline.length ? (
                <div className="music-expanded-status">
                  <Loader2 size={28} className="music-lyrics-sync-spinner" />
                  <p>正在同步歌词时间轴...</p>
                </div>
              ) : timeline.length ? timeline.map((line, index) => {
                const isActive = index === activeLyricIndex;
                const isNear = Math.abs(index - activeLyricIndex) === 1;
                const progress = isActive ? getLineProgress(line, currentMs) : 0;
                return (
                  <div
                    key={`${activeItem.id}-${line.lineIndex ?? index}`}
                    ref={isActive ? activeLineRef : null}
                  >
                    <LyricLine line={line} isActive={isActive} isNear={isNear} progress={progress} />
                  </div>
                );
              }) : (
                <div className="music-expanded-lyrics-fallback">
                  {String(activeItem.lyrics || "").split(/\r?\n/).filter(Boolean).map((line, index) => (
                    <p key={index} className="music-expanded-lyric-line is-near">{line}</p>
                  ))}
                </div>
              )}
              </div>
            </div>

            <footer className="music-expanded-footer">
              <div className="music-expanded-progress">
                <span>{formatAudioTime(currentTime)}</span>
                <div
                  className="music-mini-progress-track"
                  onPointerDown={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    seekTo((event.clientX - rect.left) / rect.width);
                  }}
                >
                  <div className="music-mini-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <span>{formatAudioTime(duration || activeItem.durationMs / 1000)}</span>
              </div>
              <div className="music-expanded-controls">
                <button type="button" className="music-mini-btn" onClick={() => playSibling(-1)}><SkipBack size={18} /></button>
                <button type="button" className="music-mini-btn is-primary is-large" onClick={togglePlay} disabled={isProcessing || !activeItem.audioUrl}>
                  {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <button type="button" className="music-mini-btn" onClick={() => playSibling(1)}><SkipForward size={18} /></button>
                <button type="button" className="music-mini-btn" onClick={cycleSpeed}>{speed === 1 ? "1.0x" : `${speed}x`}</button>
                <button
                  type="button"
                  className="music-mini-btn"
                  onClick={() => downloadAudioUrl(activeItem.audioUrl, makeFileName("ai-music", "mp3"))}
                >
                  <Download size={18} />
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
