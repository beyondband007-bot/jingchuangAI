import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./videoDurationPicker.css";

function toNumberList(options = []) {
  return [...new Set(
    options
      .map((item) => (typeof item === "object" && item !== null ? Number(item.value) : Number(item)))
      .filter((value) => Number.isFinite(value) && value > 0),
  )].sort((a, b) => a - b);
}

function nearestDuration(value, durations, previous = value) {
  if (!durations.length) return value;
  const target = Number(value);
  const prev = Number(previous);
  return durations.reduce((best, current) => {
    const bestDist = Math.abs(best - target);
    const currentDist = Math.abs(current - target);
    if (currentDist < bestDist) return current;
    if (currentDist > bestDist) return best;
    if (Number.isFinite(prev) && target !== prev) {
      return target > prev ? Math.max(best, current) : Math.min(best, current);
    }
    return current > best ? current : best;
  }, durations[0]);
}

function buildTickMarks(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min].filter(Number.isFinite);
  const step = max - min >= 20 ? 5 : max - min >= 10 ? 5 : 1;
  const ticks = new Set([min, max]);
  const start = Math.ceil(min / step) * step;
  for (let value = start; value <= max; value += step) {
    ticks.add(value);
  }
  return [...ticks].sort((a, b) => a - b);
}

export function VideoDurationPicker({
  value,
  onChange,
  options = [],
  placement = "top",
  disabled = false,
  triggerClassName = "",
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPlacement, setPanelPlacement] = useState(placement);
  const [panelStyle, setPanelStyle] = useState(null);
  const [draftInput, setDraftInput] = useState("");
  const [sliderValue, setSliderValue] = useState(null);
  const isDraggingRef = useRef(false);

  const durations = useMemo(() => toNumberList(options), [options]);
  const minDuration = durations[0] || 1;
  const maxDuration = durations[durations.length - 1] || minDuration;
  const selected = nearestDuration(Number(value) || minDuration, durations);
  const displayValue = sliderValue == null ? selected : sliderValue;
  const ticks = useMemo(
    () => buildTickMarks(minDuration, maxDuration),
    [minDuration, maxDuration],
  );
  const fillPercent = maxDuration > minDuration
    ? ((displayValue - minDuration) / (maxDuration - minDuration)) * 100
    : 0;

  function closePanel({ restoreFocus = false } = {}) {
    setIsOpen(false);
    setDraftInput("");
    setSliderValue(null);
    isDraggingRef.current = false;
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openPanel() {
    if (disabled || !durations.length) return;
    window.dispatchEvent(
      new CustomEvent("facemini-prompt-dropdown-open", { detail: id }),
    );
    setDraftInput(String(selected));
    setSliderValue(null);
    setIsOpen(true);
  }

  function togglePanel() {
    if (isOpen) closePanel();
    else openPanel();
  }

  function commitDuration(nextValue) {
    const snapped = nearestDuration(Number(nextValue), durations, selected);
    if (Number.isFinite(snapped)) {
      onChange?.(snapped);
      setDraftInput(String(snapped));
    }
    setSliderValue(null);
  }

  function handleSliderInput(event) {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    setSliderValue(next);
    setDraftInput(String(Math.round(next)));
    if (!isDraggingRef.current) {
      commitDuration(next);
    }
  }

  function handleSliderPointerDown() {
    isDraggingRef.current = true;
  }

  function handleSliderPointerUp(event) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    commitDuration(event.currentTarget.value);
  }

  function updatePanelPosition() {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const viewportPadding = 8;
    const offset = 8;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const panelHeight = panel.offsetHeight;
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const preferredPlacement = placement === "bottom" ? "bottom" : "top";
    const preferredSpace = preferredPlacement === "top" ? spaceAbove : spaceBelow;
    const alternatePlacement = preferredPlacement === "top" ? "bottom" : "top";
    const alternateSpace = alternatePlacement === "top" ? spaceAbove : spaceBelow;
    const resolvedPlacement =
      preferredSpace >= panelHeight + offset
        ? preferredPlacement
        : alternateSpace >= panelHeight + offset
          ? alternatePlacement
          : spaceAbove > spaceBelow
            ? "top"
            : "bottom";
    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.left + rect.width / 2 - panelWidth / 2,
        window.innerWidth - panelWidth - viewportPadding,
      ),
    );
    const top =
      resolvedPlacement === "top"
        ? Math.max(viewportPadding, rect.top - panelHeight - offset)
        : Math.min(
            window.innerHeight - panelHeight - viewportPadding,
            rect.bottom + offset,
          );

    setPanelPlacement(resolvedPlacement);
    setPanelStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${panelWidth}px`,
    });
  }

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const frameId = window.requestAnimationFrame(updatePanelPosition);
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, placement, durations.length]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOtherMenus(event) {
      if (event.detail !== id) closePanel();
    }

    function closeOnOutside(event) {
      const target = event.target;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        closePanel();
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") closePanel({ restoreFocus: true });
    }

    function repositionOrClose(event) {
      if (panelRef.current?.contains(event.target)) return;
      closePanel();
    }

    window.addEventListener("facemini-prompt-dropdown-open", closeOtherMenus);
    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("wheel", repositionOrClose, true);
    document.addEventListener("touchmove", repositionOrClose, true);
    window.addEventListener("resize", repositionOrClose);
    window.addEventListener("scroll", repositionOrClose, true);
    return () => {
      window.removeEventListener("facemini-prompt-dropdown-open", closeOtherMenus);
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("wheel", repositionOrClose, true);
      document.removeEventListener("touchmove", repositionOrClose, true);
      window.removeEventListener("resize", repositionOrClose);
      window.removeEventListener("scroll", repositionOrClose, true);
    };
  }, [id, isOpen]);

  useEffect(() => {
    if (isOpen && sliderValue == null) setDraftInput(String(selected));
  }, [isOpen, selected, sliderValue]);

  const panel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          className={`video-duration-picker__panel video-duration-picker__panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="dialog"
          aria-label="选择视频生成时长"
        >
          <div className="video-duration-picker__title">选择视频生成时长</div>
          <div className="video-duration-picker__body">
            <div className="video-duration-picker__slider-wrap">
              <input
                className="video-duration-picker__slider"
                type="range"
                min={minDuration}
                max={maxDuration}
                step={1}
                value={displayValue}
                aria-valuemin={minDuration}
                aria-valuemax={maxDuration}
                aria-valuenow={Math.round(displayValue)}
                aria-label="视频时长"
                style={{ "--duration-fill": `${fillPercent}%` }}
                onPointerDown={handleSliderPointerDown}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onChange={handleSliderInput}
              />
              <div className="video-duration-picker__ticks" aria-hidden="true">
                {ticks.map((tick) => {
                  const left = maxDuration > minDuration
                    ? ((tick - minDuration) / (maxDuration - minDuration)) * 100
                    : 0;
                  return (
                    <span
                      key={tick}
                      className="video-duration-picker__tick"
                      style={{ left: `${left}%` }}
                    >
                      <i />
                      <em>{tick}</em>
                    </span>
                  );
                })}
              </div>
            </div>

            <label className="video-duration-picker__input-box">
              <input
                type="number"
                min={minDuration}
                max={maxDuration}
                step={1}
                value={draftInput}
                aria-label="自定义视频时长秒数"
                onChange={(event) => setDraftInput(event.target.value)}
                onBlur={() => commitDuration(draftInput || selected)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDuration(draftInput || selected);
                  }
                }}
              />
              <span>s</span>
            </label>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`video-duration-picker ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`video-duration-picker__trigger ${triggerClassName}`.trim()}
        aria-label="选择视频时长"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled || !durations.length}
        onClick={togglePanel}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
        <span>{selected}s</span>
      </button>
      {panel}
    </div>
  );
}
