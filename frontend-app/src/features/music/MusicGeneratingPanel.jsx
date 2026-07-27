import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  Mic,
  Music,
  SlidersHorizontal,
  Sparkles,
  X
} from "lucide-react";
import { MusicRecentGrid } from "./MusicRecentGrid";

const STEP_DEFINITIONS = [
  { id: "lyrics", label: "解析歌词", icon: FileText },
  { id: "melody", label: "创作旋律", icon: Music },
  { id: "arrange", label: "编曲制作", icon: SlidersHorizontal },
  { id: "sync", label: "歌词同步", icon: Mic }
];

const ICON_BAR_COUNT = 5;
const WAVE_BAR_COUNT = 20;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener?.("change", updatePreference);
    return () => query.removeEventListener?.("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useRandomBarHeights(count, { min, max, tickMin = 90, tickMax = 260, isStatic = false }) {
  const [heights, setHeights] = useState(() =>
    Array.from({ length: count }, () => min + Math.random() * (max - min))
  );

  useEffect(() => {
    if (isStatic) return undefined;
    const timeouts = new Set();
    let cancelled = false;

    function scheduleBar(index) {
      const delay = tickMin + Math.random() * (tickMax - tickMin);
      const id = window.setTimeout(() => {
        if (cancelled) return;
        setHeights((prev) => {
          const next = [...prev];
          next[index] = min + Math.random() * (max - min);
          return next;
        });
        scheduleBar(index);
      }, delay);
      timeouts.add(id);
    }

    for (let index = 0; index < count; index += 1) {
      scheduleBar(index);
    }

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [count, min, max, tickMin, tickMax, isStatic]);

  return isStatic ? Array.from({ length: count }, () => (min + max) / 2) : heights;
}

function RandomEqualizerBars({
  count,
  min,
  max,
  className,
  barTag: Bar = "span",
  tickMin,
  tickMax
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const heights = useRandomBarHeights(count, {
    min,
    max,
    tickMin,
    tickMax,
    isStatic: prefersReducedMotion,
  });

  return (
    <>
      {heights.map((height, index) => (
        <Bar key={index} style={{ height: `${height}px` }} />
      ))}
    </>
  );
}

function getStepStatusLabel(status) {
  if (status === "done") return "已完成";
  if (status === "active") return "进行中";
  return "等待中";
}

function buildSteps(activeStep) {
  return STEP_DEFINITIONS.map((step, index) => {
    const stepNumber = index + 1;
    let status = "pending";
    if (stepNumber < activeStep) status = "done";
    else if (stepNumber === activeStep) status = "active";
    return { ...step, status };
  });
}

function getEtaLabel(activeStep, etaSeconds) {
  if (activeStep === 2 && etaSeconds > 0) return `预计剩余 ${etaSeconds} 秒`;
  if (activeStep === 3) return "正在编曲制作，请稍候...";
  if (activeStep === 4) return "正在同步歌词时间轴...";
  if (activeStep === 1) return "正在解析歌词内容...";
  return "正在准备生成任务...";
}

export function MusicGeneratingPanel({
  activeStep = 1,
  progressPercent = 0,
  etaSeconds = 0,
  recentItems = [],
  generatingId = "",
  onCancel,
  onViewAll,
  onSelectItem,
  onDownloadItem,
  onEditCoverItem,
  onDeleteItem,
  onRetryItem,
}) {
  const steps = buildSteps(activeStep);
  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <div className="music-gen-waiting-layout">
      <div className="music-gen-waiting-hero">
        <div className="music-gen-waiting-icon" aria-hidden="true">
          <span className="music-gen-waiting-icon-glow" />
          <Music size={28} />
          <span className="music-gen-waiting-icon-bars">
            <RandomEqualizerBars
              count={ICON_BAR_COUNT}
              min={6}
              max={16}
              barTag="i"
              tickMin={70}
              tickMax={200}
            />
          </span>
        </div>
        <h1>正在创作你的音乐</h1>
        <p>AI 正在为你生成旋律、编曲和歌词，请稍候片刻 <Sparkles size={14} /></p>
      </div>

      <div className="music-gen-waiting-card">
        <div className="music-gen-waiting-steps" aria-label="生成进度">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            const lineStatus = step.status === "done" ? "done" : "pending";
            return (
              <div
                key={step.id}
                className={`music-gen-waiting-step is-${step.status}${isLast ? " is-last" : ""}`}
              >
                <div className="music-gen-waiting-step-track">
                  <div className={`music-gen-waiting-step-node${step.status === "active" ? " is-active" : ""}`}>
                    {step.status === "done" ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <Icon size={18} />
                    )}
                    {step.status === "active" ? <span className="music-gen-waiting-step-ring" aria-hidden="true" /> : null}
                  </div>
                  {!isLast ? <span className={`music-gen-waiting-step-line is-${lineStatus}`} aria-hidden="true" /> : null}
                </div>
                <div className="music-gen-waiting-step-copy">
                  <strong>{step.label}</strong>
                  <span>{getStepStatusLabel(step.status)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="music-gen-waiting-wave" aria-hidden="true">
          <RandomEqualizerBars
            count={WAVE_BAR_COUNT}
            min={14}
            max={48}
            tickMin={80}
            tickMax={280}
          />
        </div>

        <div className="music-gen-waiting-progress">
          <strong>{safeProgress}%</strong>
          <span>{getEtaLabel(activeStep, etaSeconds)}</span>
        </div>
      </div>

      <div className="music-ref-recent music-gen-waiting-recent">
        <div className="music-ref-section-head">
          <h3><Clock size={18} /> 最近生成</h3>
          <button type="button" className="music-ref-link" onClick={onViewAll}>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <MusicRecentGrid
          items={recentItems}
          generatingId={generatingId}
          onSelectItem={onSelectItem}
          onDownloadItem={onDownloadItem}
          onEditCoverItem={onEditCoverItem}
          onDeleteItem={onDeleteItem}
          onRetryItem={onRetryItem}
        />
      </div>
    </div>
  );
}
