import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import "./incrementalItems.css";

function getFeatureScrollContainer() {
  return document.querySelector(".app-shell__content.feature-main");
}

function getScrollMetrics(scrollContainer) {
  if (scrollContainer) {
    return {
      scrollPosition: scrollContainer.clientHeight + scrollContainer.scrollTop,
      triggerPosition: scrollContainer.scrollHeight - 420,
    };
  }

  return {
    scrollPosition: window.innerHeight + window.scrollY,
    triggerPosition: document.documentElement.scrollHeight - 420,
  };
}

export function useIncrementalItems(
  items,
  resetKey,
  { batchSize = 30, enabled = true, delay = 720 } = {},
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const loadMoreTimerRef = useRef(0);
  const total = items.length;
  const hasMore = enabled && visibleCount < total;

  useEffect(() => {
    if (loadMoreTimerRef.current) {
      window.clearTimeout(loadMoreTimerRef.current);
      loadMoreTimerRef.current = 0;
    }
    isLoadingMoreRef.current = false;
    setVisibleCount(batchSize);
    setIsLoadingMore(false);
  }, [batchSize, resetKey]);

  useEffect(() => {
    if (!enabled || !hasMore) return undefined;

    let frameId = 0;
    const scrollContainer = getFeatureScrollContainer();
    function loadMoreIfNeeded() {
      if (!hasMore || isLoadingMoreRef.current) return;
      const { scrollPosition, triggerPosition } =
        getScrollMetrics(scrollContainer);
      if (scrollPosition >= triggerPosition) {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        loadMoreTimerRef.current = window.setTimeout(() => {
          setVisibleCount((count) => Math.min(total, count + batchSize));
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          loadMoreTimerRef.current = 0;
        }, delay);
      }
    }

    function scheduleCheck() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(loadMoreIfNeeded);
    }

    scheduleCheck();
    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);
    return () => {
      window.cancelAnimationFrame(frameId);
      scrollTarget.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
    };
  }, [batchSize, delay, enabled, hasMore, total]);

  return {
    items: enabled ? items.slice(0, visibleCount) : items,
    isLoadingMore,
    hasMore,
  };
}

export function IncrementalLoadMoreIndicator({ active }) {
  if (!active) return null;
  return (
    <div className="incremental-load-more" role="status" aria-live="polite">
      <Loader2 size={18} className="is-spinning" />
      <span>加载中...</span>
    </div>
  );
}
