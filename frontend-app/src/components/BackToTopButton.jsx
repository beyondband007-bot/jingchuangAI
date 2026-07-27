import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const backToTopThreshold = 1200;
const backToTopDurationMs = 1000;

function getWindowScrollElement() {
  return document.scrollingElement || document.documentElement;
}

function getDefaultScrollTarget() {
  return document.querySelector(".app-shell__content.feature-main") || window;
}

function getScrollTop(target) {
  if (!target || target === window) {
    return window.scrollY || getWindowScrollElement().scrollTop || 0;
  }
  return target.scrollTop || 0;
}

function setScrollTop(target, top) {
  if (!target || target === window) {
    window.scrollTo(0, top);
    return;
  }
  target.scrollTop = top;
}

function animateScrollTop(target, duration = backToTopDurationMs) {
  const startTop = getScrollTop(target);
  if (startTop <= 0) return () => {};
  const startTime = window.performance.now();
  let frameId = 0;

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = easeInOutCubic(progress);
    setScrollTop(target, Math.round(startTop * (1 - eased)));
    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  frameId = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(frameId);
}

export function BackToTopButton({
  scrollTargetRef,
  className = "",
  threshold = backToTopThreshold,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cancelScrollRef = useRef(null);
  const buttonClassName = [
    "back-to-top-button",
    isVisible ? "is-visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const target = scrollTargetRef?.current || getDefaultScrollTarget();
    const updateVisibility = () => {
      setIsVisible(getScrollTop(target) > threshold);
    };

    updateVisibility();
    target.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      target.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      cancelScrollRef.current?.();
    };
  }, [scrollTargetRef, threshold]);

  const scrollToTop = useCallback(() => {
    cancelScrollRef.current?.();
    cancelScrollRef.current = animateScrollTop(
      scrollTargetRef?.current || getDefaultScrollTarget(),
    );
  }, [scrollTargetRef]);

  return (
    <button
      className={buttonClassName}
      type="button"
      onClick={scrollToTop}
      aria-label="回到顶部"
      data-tooltip="回到顶部"
      tabIndex={isVisible ? 0 : -1}
    >
      <ArrowUp size={21} strokeWidth={2.4} />
    </button>
  );
}
