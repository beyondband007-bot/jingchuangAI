import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Download,
  ListMusic,
  ListStart,
  Loader2,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from "lucide-react";
import { formatBeijingStamp } from "../../utils/time";
import { downloadMediaFile, resolveMediaUrl } from "../../api/mediaUrl.js";
import {
  attachAudioElement,
  formatAudioTime,
  getActiveLyricIndex,
  getLineProgress,
  getLyricSubtitle
} from "./musicPlayerUtils";
import { MusicImmersiveStage } from "./MusicImmersiveStage";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const PLAY_MODES = [
  { id: "shuffle", label: "随机播放", icon: Shuffle },
  { id: "sequential", label: "顺序播放", icon: ListStart },
  { id: "single-loop", label: "单曲循环", icon: Repeat1 },
  { id: "list-loop", label: "列表循环", icon: Repeat },
];

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
  await downloadMediaFile(audioUrl, fileName);
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

function MusicPlayModePopover({
  open,
  anchorRef,
  modes,
  activeMode,
  onSelect,
  onClose
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPanelStyle(null);
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 180;
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - 12,
      );
      setPanelStyle({
        position: "fixed",
        left: `${left}px`,
        bottom: `${window.innerHeight - rect.top + 12}px`,
        width: `${width}px`,
        zIndex: 12000,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorRef.current?.contains(event.target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || !panelStyle) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="music-full-player__play-mode-menu"
      style={panelStyle}
      role="menu"
      aria-label="播放模式"
      onWheel={(event) => event.stopPropagation()}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === activeMode;
        return (
          <button
            key={mode.id}
            type="button"
            role="menuitem"
            className={`music-full-player__play-mode-item${isActive ? " is-active" : ""}`}
            onClick={() => {
              onSelect(mode.id);
              onClose();
            }}
          >
            <Icon size={18} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function MusicPlaylistPopover({
  open,
  anchorRef,
  items,
  activeId,
  onSelect,
  onClose
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPanelStyle(null);
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(360, Math.max(280, window.innerWidth - 24));
      const left = Math.min(
        Math.max(12, rect.right - width),
        window.innerWidth - width - 12
      );
      const maxHeight = Math.min(320, Math.max(180, rect.top - 24));

      setPanelStyle({
        position: "fixed",
        left: `${left}px`,
        bottom: `${window.innerHeight - rect.top + 12}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 12000
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, items.length]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorRef.current?.contains(event.target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || !panelStyle) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="music-full-player__playlist is-portal"
      style={panelStyle}
      role="listbox"
      aria-label="播放列表"
      onWheel={(event) => event.stopPropagation()}
    >
      {items.map((track, index) => {
        const isActive = track.id === activeId;
        const trackTitle = getLyricSubtitle(track);
        return (
          <button
            key={track.id}
            type="button"
            role="option"
            aria-selected={isActive}
            className={`music-full-player__playlist-item${isActive ? " is-active" : ""}`}
            onClick={() => {
              onSelect(track);
              onClose();
            }}
          >
            <span className="music-full-player__playlist-index">{index + 1}</span>
            <span className="music-full-player__playlist-copy">
              <strong>{trackTitle}</strong>
              <span>{track.prompt || "AI 音乐"}</span>
            </span>
            <span className="music-full-player__playlist-duration">
              {formatAudioTime((track.durationMs || 0) / 1000)}
            </span>
          </button>
        );
      })}
    </div>,
    document.body
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
  const playlistBtnRef = useRef(null);
  const playModeBtnRef = useRef(null);
  const volumeWrapRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState("sequential");
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showPlayModeMenu, setShowPlayModeMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [audioState, setAudioState] = useState("idle");
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const playbackUrl = useMemo(
    () => resolveMediaUrl(item?.audioUrl),
    [item?.audioUrl],
  );

  const timeline = Array.isArray(item?.lyricsTimeline) ? item.lyricsTimeline : [];
  const timelineKey = useMemo(
    () => timeline.map((line) => `${line.lineIndex}:${line.startMs}:${line.endMs}`).join("|"),
    [timeline]
  );
  const prevTimelineKeyRef = useRef("");
  const currentMs = currentTime * 1000;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLyricsSyncing = item?.lyricsSyncStatus === "processing";
  const title = getLyricSubtitle(item);
  const isInstrumentalMode = Boolean(item?.isInstrumental);
  const canPlayAudio = Boolean(playbackUrl) && audioState !== "error";
  const isAudioLoading = Boolean(playbackUrl) && audioState === "idle";
  const displayDuration = audioState === "ready" && duration > 0
    ? duration
    : (item?.durationMs ? item.durationMs / 1000 : 0);

  const playableItems = useMemo(
    () => items.filter((entry) => entry.audioUrl && entry.status !== "failed"),
    [items]
  );
  const activeIndex = playableItems.findIndex((entry) => entry.id === item?.id);

  useEffect(() => {
    const audio = audioRef.current;
    if (!playbackUrl) {
      setAudioState("idle");
      setCurrentTime(0);
      setDuration(0);
      return undefined;
    }

    setAudioState("idle");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(autoPlay);

    if (!audio) return undefined;

    function markReady(target) {
      setAudioState("ready");
      setDuration(Number.isFinite(target.duration) ? target.duration : 0);
      setCurrentTime(target.currentTime || 0);
      if (isPlayingRef.current) {
        target.playbackRate = speed;
        target.play().catch(() => setIsPlaying(false));
      }
    }

    const detach = attachAudioElement(audio, {
      onReady: markReady,
      onError: () => {
        setAudioState("error");
        setIsPlaying(false);
        setDuration(0);
        setCurrentTime(0);
      }
    });

    audio.load();

    return detach;
  }, [item?.id, playbackUrl, autoPlay, speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying || audioState !== "ready" || !playbackUrl) return;
    audio.playbackRate = speed;
    audio.play().catch(() => setIsPlaying(false));
  }, [isPlaying, audioState, playbackUrl, speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    audio.volume = isMuted ? 0 : volume;
  }, [speed, volume, isMuted]);

  useEffect(() => {
    if (!showVolume) return undefined;
    function handlePointerDown(event) {
      if (volumeWrapRef.current?.contains(event.target)) return;
      setShowVolume(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    const time = audio?.currentTime ?? currentTime;
    setActiveLyricIndex(getActiveLyricIndex(timeline, time));

    if (timelineKey && timelineKey !== prevTimelineKeyRef.current) {
      prevTimelineKeyRef.current = timelineKey;
      if (audio && timeline.length) {
        setActiveLyricIndex(getActiveLyricIndex(timeline, audio.currentTime));
      }
    }
  }, [timeline, timelineKey, currentTime]);

  useEffect(() => {
    if (isInstrumentalMode || activeLyricIndex < 0) return;
    const panel = lyricScrollRef.current;
    const line = activeLineRef.current;
    if (!panel || !line) return;
    const target = line.offsetTop - (panel.clientHeight / 2) + (line.clientHeight / 2);
    panel.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeLyricIndex, item?.id, isInstrumentalMode]);

  function selectTrack(track) {
    if (!track?.audioUrl || track.status === "failed") return;
    onSelectItem?.(track);
  }

  function pickNextIndex(step) {
    if (!playableItems.length) return -1;
    if (playableItems.length === 1) return 0;
    if (playMode === "shuffle" && step > 0) {
      let nextIndex = activeIndex;
      while (nextIndex === activeIndex) {
        nextIndex = Math.floor(Math.random() * playableItems.length);
      }
      return nextIndex;
    }
    if (activeIndex < 0) return step > 0 ? 0 : playableItems.length - 1;
    return (activeIndex + step + playableItems.length) % playableItems.length;
  }

  function playSibling(step) {
    const nextIndex = pickNextIndex(step);
    if (nextIndex < 0) return;
    selectTrack(playableItems[nextIndex]);
  }

  function handleTrackEnded() {
    if (playMode === "single-loop") {
      restartCurrent();
      return;
    }
    if (playableItems.length <= 1) {
      setIsPlaying(false);
      return;
    }
    if (
      playMode === "shuffle" ||
      playMode === "list-loop" ||
      (activeIndex >= 0 && activeIndex < playableItems.length - 1)
    ) {
      setIsPlaying(true);
      playSibling(1);
      return;
    }
    setIsPlaying(false);
  }

  function restartCurrent() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }

  function selectPlayMode(modeId) {
    setPlayMode(modeId);
  }

  function toggleMute() {
    setIsMuted((value) => !value);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !playbackUrl || audioState === "error") return;
    if (isPlaying) {
      if (audioState === "ready") audio.pause();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    if (audioState === "ready") {
      audio.playbackRate = speed;
      audio.play().catch(() => setIsPlaying(false));
    }
  }

  function seekTo(ratio) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const nextTime = Math.min(audio.duration, Math.max(0, ratio * audio.duration));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setActiveLyricIndex(getActiveLyricIndex(timeline, nextTime));
  }

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const canSwitchTrack = playableItems.length > 1;

  if (!item) return null;

  return (
    <div className={`music-full-player${isInstrumentalMode ? " music-full-player--instrumental" : ""}`}>
      <audio
        ref={audioRef}
        src={playbackUrl || undefined}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={handleTrackEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="music-full-player__toolbar">
        <button type="button" className="music-full-player__back" onClick={onBack}>
          <ArrowLeft size={18} />
          返回创作
        </button>
      </div>

      <div className={`music-full-player__body${isInstrumentalMode ? " music-immersive" : ""}`}>
        {isInstrumentalMode ? (
          <MusicImmersiveStage isPlaying={isPlaying} />
        ) : (
          <section className="music-full-player__lyrics" ref={lyricScrollRef}>
            <div className={`music-full-player__lyrics-inner${timeline.length ? " is-karaoke" : " is-static"}`}>
              {isLyricsSyncing && !timeline.length ? (
                <div className="music-full-player__lyrics-status is-inline">
                  <Loader2 size={18} className="music-lyrics-sync-spinner" />
                  <p>正在后台同步歌词时间轴...</p>
                </div>
              ) : null}
              {timeline.length ? (
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
        )}
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
          <span>{formatAudioTime(displayDuration)}</span>
        </div>

        {audioState === "error" ? (
          <p className="music-full-player__audio-error" role="alert">
            音频加载失败，请重新生成或稍后再试
          </p>
        ) : null}

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
            <button
              type="button"
              ref={playModeBtnRef}
              className={`music-mini-btn music-mini-btn--play-mode${showPlayModeMenu ? " is-active" : ""}`}
              aria-label={PLAY_MODES.find((mode) => mode.id === playMode).label}
              aria-expanded={showPlayModeMenu}
              title={PLAY_MODES.find((mode) => mode.id === playMode).label}
              onClick={(event) => {
                event.stopPropagation();
                setShowVolume(false);
                setShowPlaylist(false);
                setShowPlayModeMenu((value) => !value);
              }}
            >
              {React.createElement(PLAY_MODES.find((mode) => mode.id === playMode).icon, { size: 18 })}
            </button>
            <button
              type="button"
              className="music-mini-btn"
              aria-label="上一首"
              disabled={!canSwitchTrack}
              onClick={() => playSibling(-1)}
            >
              <SkipBack size={20} />
            </button>
            <button
              type="button"
              className={`music-mini-btn is-primary is-large${isAudioLoading ? " is-loading" : ""}`}
              onClick={togglePlay}
              disabled={!canPlayAudio}
              aria-label={isPlaying ? "暂停" : "播放"}
              aria-busy={isAudioLoading}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button
              type="button"
              className="music-mini-btn"
              aria-label="下一首"
              disabled={!canSwitchTrack}
              onClick={() => playSibling(1)}
            >
              <SkipForward size={20} />
            </button>
            <button
              type="button"
              ref={playlistBtnRef}
              className={`music-mini-btn${showPlaylist ? " is-active" : ""}`}
              aria-label="播放列表"
              aria-expanded={showPlaylist}
              disabled={!playableItems.length}
              onClick={(event) => {
                event.stopPropagation();
                setShowVolume(false);
                setShowPlaylist((value) => !value);
              }}
            >
              <ListMusic size={18} />
            </button>
          </div>

          <MusicPlayModePopover
            open={showPlayModeMenu}
            anchorRef={playModeBtnRef}
            modes={PLAY_MODES}
            activeMode={playMode}
            onSelect={selectPlayMode}
            onClose={() => setShowPlayModeMenu(false)}
          />

          <MusicPlaylistPopover
            open={showPlaylist}
            anchorRef={playlistBtnRef}
            items={playableItems}
            activeId={item.id}
            onSelect={selectTrack}
            onClose={() => setShowPlaylist(false)}
          />

          <div className="music-full-player__tools">
            <button type="button" className="music-mini-btn" onClick={cycleSpeed}>
              {speed === 1 ? "1.0x" : `${speed}x`}
            </button>
            <div className="music-full-player__volume-wrap" ref={volumeWrapRef}>
              <button
                type="button"
                className={`music-mini-btn${isMuted || volume === 0 ? " is-active" : ""}`}
                aria-label={isMuted || volume === 0 ? "取消静音" : "音量"}
                onClick={() => {
                  setShowPlaylist(false);
                  if (isMuted || volume === 0) {
                    setIsMuted(false);
                    if (volume === 0) setVolume(0.8);
                    return;
                  }
                  setShowVolume((value) => !value);
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              {showVolume ? (
                <div className="music-full-player__volume-panel">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    aria-label="音量调节"
                    onChange={(event) => {
                      const nextVolume = Number(event.target.value);
                      setVolume(nextVolume);
                      setIsMuted(nextVolume === 0);
                    }}
                  />
                </div>
              ) : null}
            </div>
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
