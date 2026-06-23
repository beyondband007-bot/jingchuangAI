import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  ListMusic,
  Loader2,
  Music,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2
} from "lucide-react";
import { formatBeijingStamp } from "../../utils/time";
import {
  formatAudioTime,
  getActiveLyricIndex,
  getLineProgress,
  getLyricSubtitle
} from "./musicPlayerUtils";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function makeFileName(prefix, ext) {
  return `${prefix}-${formatBeijingStamp()}.${ext}`;
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
      <p className={`music-full-player__lyric-line${isNear ? " is-near" : ""}`}>
        {line.text}
      </p>
    );
  }

  const chars = [...String(line.text || "")];
  const highlightCount = Math.max(0, Math.min(chars.length, Math.floor(chars.length * progress)));

  return (
    <p className="music-full-player__lyric-line is-active">
      <span className="music-full-player__lyric-sung">{chars.slice(0, highlightCount).join("")}</span>
      <span className="music-full-player__lyric-unsung">{chars.slice(highlightCount).join("")}</span>
    </p>
  );
}

export function MusicFullPagePlayer({
  item,
  items = [],
  onBack,
  onSelectItem,
  autoPlay = true
}) {
  const audioRef = useRef(null);
  const lyricScrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  const timeline = Array.isArray(item?.lyricsTimeline) ? item.lyricsTimeline : [];
  const currentMs = currentTime * 1000;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLyricsSyncing = item?.lyricsSyncStatus === "processing";
  const title = getLyricSubtitle(item);

  const playableItems = useMemo(
    () => items.filter((entry) => entry.audioUrl && entry.status !== "failed"),
    [items]
  );
  const activeIndex = playableItems.findIndex((entry) => entry.id === item?.id);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !item?.audioUrl) return;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    if (autoPlay) {
      audio.playbackRate = speed;
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [item?.id, item?.audioUrl, autoPlay]);

  useEffect(() => {
    setActiveLyricIndex(getActiveLyricIndex(timeline, currentTime));
  }, [timeline, currentTime]);

  useEffect(() => {
    if (activeLyricIndex < 0) return;
    const panel = lyricScrollRef.current;
    const line = activeLineRef.current;
    if (!panel || !line) return;
    const target = line.offsetTop - (panel.clientHeight / 2) + (line.clientHeight / 2);
    panel.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeLyricIndex, item?.id]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !item?.audioUrl) return;
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

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  if (!item) return null;

  return (
    <div className="music-full-player">
      <audio
        ref={audioRef}
        src={item.audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setCurrentTime(event.currentTarget.currentTime || 0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          if (activeIndex >= 0 && activeIndex < playableItems.length - 1) {
            onSelectItem?.(playableItems[activeIndex + 1]);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="music-full-player__toolbar">
        <button type="button" className="music-full-player__back" onClick={onBack}>
          <ArrowLeft size={18} />
          返回创作
        </button>
      </div>

      <div className="music-full-player__body">
        <section className="music-full-player__lyrics" ref={lyricScrollRef}>
          <div className={`music-full-player__lyrics-inner${timeline.length ? " is-karaoke" : " is-static"}`}>
            {isLyricsSyncing && !timeline.length ? (
              <div className="music-full-player__lyrics-status">
                <Loader2 size={28} className="music-lyrics-sync-spinner" />
                <p>正在同步歌词时间轴...</p>
              </div>
            ) : timeline.length ? (
              timeline.map((line, index) => {
                const isActive = index === activeLyricIndex;
                const isNear = Math.abs(index - activeLyricIndex) <= 2;
                const progress = isActive ? getLineProgress(line, currentMs) : 0;
                return (
                  <div key={`${item.id}-${line.lineIndex ?? index}`} ref={isActive ? activeLineRef : null}>
                    <LyricLine line={line} isActive={isActive} isNear={isNear} progress={progress} />
                  </div>
                );
              })
            ) : (
              String(item.lyrics || "").split(/\r?\n/).filter(Boolean).map((line, index) => (
                <p key={index} className="music-full-player__lyric-line">{line}</p>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="music-full-player__footer">
        <div className="music-full-player__progress">
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
          <span>{formatAudioTime(duration || item.durationMs / 1000)}</span>
        </div>

        <div className="music-full-player__controls">
          <div className="music-full-player__now-playing">
            <div className="music-full-player__cover-mini" style={{ background: generateCoverGradient(item.id) }}>
              <Music size={18} />
            </div>
            <div className="music-full-player__song-name">
              <strong>{title}</strong>
              {item.prompt ? <span>{item.prompt}</span> : null}
            </div>
          </div>

          <div className="music-full-player__transport">
            <button type="button" className="music-mini-btn" aria-label="随机播放">
              <Shuffle size={18} />
            </button>
            <button type="button" className="music-mini-btn" aria-label="上一首">
              <SkipBack size={20} />
            </button>
            <button
              type="button"
              className="music-mini-btn is-primary is-large"
              onClick={togglePlay}
              disabled={!item.audioUrl}
              aria-label={isPlaying ? "暂停" : "播放"}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button type="button" className="music-mini-btn" aria-label="下一首">
              <SkipForward size={20} />
            </button>
            <button type="button" className="music-mini-btn" aria-label="播放列表">
              <ListMusic size={18} />
            </button>
          </div>

          <div className="music-full-player__tools">
            <button type="button" className="music-mini-btn" onClick={cycleSpeed}>
              {speed === 1 ? "1.0x" : `${speed}x`}
            </button>
            <button type="button" className="music-mini-btn" aria-label="音量">
              <Volume2 size={18} />
            </button>
            <button
              type="button"
              className="music-mini-btn"
              onClick={() => downloadAudioUrl(item.audioUrl, makeFileName("ai-music", "mp3"))}
              aria-label="下载"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
