import React, { useMemo } from "react";
import {
  Check,
  CheckCircle2,
  Film,
  Music,
  Play,
  Sparkles,
} from "lucide-react";

const STEP_DEFINITIONS = [
  {
    id: "script",
    label: "脚本解析",
    icon: Play,
    activeLabel: "正在解析脚本...",
  },
  {
    id: "material",
    label: "素材生成",
    icon: Film,
    activeLabel: "正在生成画面素材...",
  },
  {
    id: "audio",
    label: "音频合成",
    icon: Music,
    activeLabel: "正在合成音频...",
  },
  {
    id: "post",
    label: "后期处理",
    icon: CheckCircle2,
    activeLabel: "正在进行后期处理...",
  },
];

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getActiveStep(progressPercent) {
  if (progressPercent < 25) return 1;
  if (progressPercent < 75) return 2;
  if (progressPercent < 90) return 3;
  return 4;
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

function getStepStatusLabel(step) {
  if (step.status === "done") return "已完成";
  if (step.status === "active") return step.activeLabel;
  return "等待中";
}

export function VideoGeneratingPanel({ prompt = "", progressPercent = 0 }) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const activeStep = getActiveStep(safeProgress);
  const steps = useMemo(() => buildSteps(activeStep), [activeStep]);
  const ringOffset =
    RING_CIRCUMFERENCE - (safeProgress / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="video-gen-immersive-panel">
      <header className="video-gen-immersive-hero">
        <h1>
          <Sparkles size={18} />
          视频生成中
          <Sparkles size={18} />
        </h1>
        {prompt ? <p>{prompt}</p> : null}
      </header>

      <div className="video-gen-immersive-progress" aria-live="polite">
        <svg viewBox="0 0 120 120" role="img" aria-label={`整体进度 ${safeProgress}%`}>
          <circle
            className="video-gen-waiting-ring-track"
            cx="60"
            cy="60"
            r={RING_RADIUS}
          />
          <circle
            className="video-gen-waiting-ring-fill"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <div className="video-gen-immersive-progress-copy">
          <span>整体进度</span>
          <strong>{safeProgress}%</strong>
          <em>生成中...</em>
        </div>
      </div>

      <div className="video-gen-immersive-steps" aria-label="生成阶段">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const lineStatus = step.status === "done" ? "done" : "pending";

          return (
            <div
              key={step.id}
              className={`video-gen-waiting-step is-${step.status}${isLast ? " is-last" : ""}`}
            >
              <div className="video-gen-waiting-step-track">
                <div
                  className={`video-gen-waiting-step-node${step.status === "active" ? " is-active" : ""}${step.status === "done" ? " is-done" : ""}`}
                >
                  {step.status === "done" ? (
                    <Check size={16} strokeWidth={2.5} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                {!isLast ? (
                  <span
                    className={`video-gen-waiting-step-line is-${lineStatus}`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="video-gen-waiting-step-copy">
                <strong>{step.label}</strong>
                <span>{getStepStatusLabel(step)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="video-gen-immersive-footnote">
        AI 正在为您生成高质量视频，请耐心等待，生成完成后将自动展示。
      </p>
    </div>
  );
}
