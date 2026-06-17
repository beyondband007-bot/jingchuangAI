import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatAudioTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDurationMs(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (!seconds) return "0:00";
  return formatAudioTime(seconds);
}

function formatSpeedLabel(speed) {
  if (speed === 1) return "1.0x";
  return `${speed}x`;
}

export function VoiceRecentPlayer({
  playerId,
  src,
  durationMs = 0,
  disabled = false,
  playingId,
  onPlayingChange,
  children,
}) {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("0:00");
  const [totalLabel, setTotalLabel] = useState(formatDurationMs(durationMs));
  const [speed, setSpeed] = useState(1);
  const isPlaying = playingId === playerId;

  useEffect(() => {
    if (playingId !== playerId) {
      audioRef.current?.pause();
    }
  }, [playingId, playerId]);

  useEffect(() => {
    setTotalLabel(formatDurationMs(durationMs));
  }, [durationMs]);

  function updateProgress(audio) {
    if (!audio?.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    setProgress(percent);
    setCurrentLabel(formatAudioTime(audio.currentTime));
    setTotalLabel(formatAudioTime(audio.duration));
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || disabled || !src) return;

    if (!audio.paused) {
      audio.pause();
      onPlayingChange("");
      return;
    }

    onPlayingChange(playerId);
    audio.playbackRate = speed;
    audio.play().catch(() => onPlayingChange(""));
  }

  function seekTo(clientX) {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    updateProgress(audio);
  }

  function handleTrackPointerDown(event) {
    if (disabled || !src) return;
    seekTo(event.clientX);

    const onMove = (moveEvent) => seekTo(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }

  return (
    <div className={`voice-recent-player ${disabled ? "is-disabled" : ""}`}>
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => updateProgress(event.currentTarget)}
        onTimeUpdate={(event) => updateProgress(event.currentTarget)}
        onEnded={() => {
          setProgress(0);
          setCurrentLabel("0:00");
          onPlayingChange("");
        }}
      />
      <div className="voice-recent-player-progress">
        <div
          className="voice-recent-player-track"
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          tabIndex={disabled || !src ? -1 : 0}
          onKeyDown={(event) => {
            const audio = audioRef.current;
            if (!audio || !Number.isFinite(audio.duration)) return;
            if (event.key === "ArrowRight") {
              audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
              updateProgress(audio);
            }
            if (event.key === "ArrowLeft") {
              audio.currentTime = Math.max(0, audio.currentTime - 5);
              updateProgress(audio);
            }
          }}
        >
          <div className="voice-recent-player-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="voice-recent-player-times">
          <span className="voice-recent-player-time-current">{currentLabel}</span>
          <span className="voice-recent-player-time-total">{totalLabel}</span>
        </div>
      </div>
      <div className="voice-recent-player-toolbar">
        <div className="voice-recent-player-toolbar-group">
          <button
            className="voice-recent-player-btn"
            type="button"
            onClick={togglePlay}
            disabled={disabled || !src}
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            className="voice-recent-player-speed"
            type="button"
            onClick={cycleSpeed}
            disabled={disabled || !src}
            title="切换播放倍速"
            aria-label={`播放倍速 ${speed} 倍`}
          >
            {formatSpeedLabel(speed)}
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
