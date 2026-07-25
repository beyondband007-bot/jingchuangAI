import { useEffect, useRef, useState } from "react";

/** Defers preview-video downloads until a user hovers or focuses its card. */
export function LazyPreviewVideo({ src, className = "" }) {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    const play = () => video.play().catch(() => {});
    video.addEventListener("canplay", play, { once: true });
    video.load();
    return () => video.removeEventListener("canplay", play);
  }, [shouldLoad, src]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const pauseWhenHidden = () => {
      if (document.visibilityState !== "hidden") return;
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    };

    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const startPreview = () => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setShouldLoad(true);
    videoRef.current?.play().catch(() => {});
  };

  const stopPreview = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <video
      ref={videoRef}
      className={className}
      src={shouldLoad ? src : undefined}
      muted
      playsInline
      preload="none"
      aria-hidden="true"
      onPointerEnter={startPreview}
      onPointerLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
    />
  );
}
