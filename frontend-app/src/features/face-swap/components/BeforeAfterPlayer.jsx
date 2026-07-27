import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function BeforeAfterPlayer({
  beforeUrl,
  afterUrl,
  posterUrl = "",
  beforeLabel = "原视频",
  afterLabel = "生成结果",
}) {
  const containerRef = useRef(null);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);
  const draggingRef = useRef(false);
  const afterLayoutReadyRef = useRef(false);
  const [position, setPosition] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoLayout, setVideoLayout] = useState({
    aspectRatio: "16 / 9",
    orientation: "landscape",
  });

  const syncTime = useCallback((source) => {
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after || !source) return;
    const target = source === before ? after : before;
    if (Math.abs(target.currentTime - source.currentTime) > 0.08) {
      target.currentTime = source.currentTime;
    }
  }, []);

  useEffect(() => {
    afterLayoutReadyRef.current = false;
    setIsReady(false);
    setVideoLayout({ aspectRatio: "16 / 9", orientation: "landscape" });
  }, [beforeUrl, afterUrl]);

  useEffect(() => {
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after) return undefined;

    let loaded = 0;
    function markReady() {
      loaded += 1;
      if (loaded >= 2) setIsReady(true);
    }

    before.addEventListener("loadeddata", markReady);
    after.addEventListener("loadeddata", markReady);
    before.addEventListener("timeupdate", () => syncTime(before));
    after.addEventListener("timeupdate", () => syncTime(after));

    return () => {
      before.removeEventListener("loadeddata", markReady);
      after.removeEventListener("loadeddata", markReady);
    };
  }, [beforeUrl, afterUrl, syncTime]);

  useEffect(() => {
    return () => {
      beforeRef.current?.pause();
      afterRef.current?.pause();
    };
  }, []);

  function updatePosition(clientX) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  }

  function handlePointerDown(event) {
    draggingRef.current = true;
    updatePosition(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) return;
    updatePosition(event.clientX);
  }

  function handlePointerUp(event) {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  async function togglePlay() {
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after) return;

    if (isPlaying) {
      before.pause();
      after.pause();
      setIsPlaying(false);
      return;
    }

    after.currentTime = before.currentTime;
    try {
      await Promise.all([before.play(), after.play()]);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function captureVideoLayout(event, isAfterVideo = false) {
    const width = Number(event.currentTarget?.videoWidth || 0);
    const height = Number(event.currentTarget?.videoHeight || 0);
    if (!width || !height) return;
    if (!isAfterVideo && afterLayoutReadyRef.current) return;
    if (isAfterVideo) afterLayoutReadyRef.current = true;

    const orientation = height > width ? "portrait" : width > height ? "landscape" : "square";
    setVideoLayout({
      aspectRatio: `${width} / ${height}`,
      orientation,
    });
  }

  if (!beforeUrl || !afterUrl) return null;

  return (
    <div className="fsw-compare">
      <div
        ref={containerRef}
        className={`fsw-compare__viewport is-${videoLayout.orientation}`}
        style={{ "--fsw-video-aspect": videoLayout.aspectRatio }}
        role="group"
        aria-label="换脸前后对比"
      >
        <video
          ref={afterRef}
          className="fsw-compare__video fsw-compare__video--after"
          src={afterUrl}
          poster={posterUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => captureVideoLayout(event, true)}
          onEnded={() => setIsPlaying(false)}
        />
        <div
          className="fsw-compare__before-layer"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <video
            ref={beforeRef}
            className="fsw-compare__video fsw-compare__video--before"
            src={beforeUrl}
            poster={posterUrl}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => captureVideoLayout(event)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        <div className="fsw-compare__labels">
          <span>{beforeLabel}</span>
          <span>{afterLabel}</span>
        </div>

        <div
          className="fsw-compare__divider"
          style={{ left: `${position}%` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label="拖动对比滑块"
          aria-valuemin={4}
          aria-valuemax={96}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPosition((v) => Math.max(4, v - 2));
            if (event.key === "ArrowRight") setPosition((v) => Math.min(96, v + 2));
          }}
        >
          <span className="fsw-compare__handle" />
        </div>
      </div>

      <div className="fsw-compare__controls">
        <button
          type="button"
          className="fsw-compare__play"
          onClick={togglePlay}
          disabled={!isReady}
          aria-label={isPlaying ? "暂停同步播放" : "同步播放"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          <span>{isPlaying ? "暂停" : "同步播放"}</span>
        </button>
        <p>拖动中线滑块对比换脸前后效果，支持同步播放</p>
      </div>
    </div>
  );
}
