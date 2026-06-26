import React from "react";
import { Check, Loader2 } from "lucide-react";
import { PROCESSING_STEPS, getStepState } from "../utils";

export function ProcessTimeline({ progress = 0, status, error = "" }) {
  const isDone = status === "done";
  const isActive = status === "processing" || status === "rendering" || status === "uploading";
  const isFailed = status === "failed";

  const headline = isFailed
    ? "生成未完成"
    : isDone
      ? "处理完成"
      : status === "rendering"
        ? "正在渲染输出"
        : status === "uploading"
          ? "正在上传素材"
          : status === "processing"
            ? "AI 正在生成"
            : "AI 正在生成";

  return (
    <section
      className={`vgw-step vgw-step--process is-${isDone ? "done" : isFailed ? "failed" : "active"}`}
      data-status={status}
    >
      <div className="vgw-step__label">
        <span>02</span>
        <strong>AI 处理</strong>
      </div>
      <div className="vgw-glass-card vgw-process-card">
        <div
          className={`vgw-timeline is-active ${isDone ? "is-done" : ""} ${isFailed ? "is-failed" : ""}`}
        >
          <div className="vgw-timeline__head">
            <div>
              <span className="vgw-timeline__eyebrow">生成管线</span>
              <h3>{headline}</h3>
            </div>
            {isActive && !isFailed && (
              <div className="vgw-timeline__progress-ring" style={{ "--p": progress }}>
                <span>{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {error && <p className="vgw-timeline__error">{error}</p>}

          <ol className="vgw-timeline__steps">
            {PROCESSING_STEPS.map((step, index) => {
              const state = getStepState(index, progress, isDone, isFailed);
              return (
                <li key={step.id} className={`vgw-timeline__step is-${state}`}>
                  <span className="vgw-timeline__step-icon" aria-hidden="true">
                    {state === "done" ? (
                      <Check size={14} strokeWidth={3} />
                    ) : state === "active" ? (
                      <Loader2 size={14} className="vgw-spin" />
                    ) : (
                      <i />
                    )}
                  </span>
                  <div className="vgw-timeline__step-copy">
                    <strong>{step.label}</strong>
                    <small>
                      {state === "done"
                        ? "已完成"
                        : state === "active"
                          ? "处理中..."
                          : state === "failed"
                            ? "已中断"
                            : "等待中"}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>

          {isActive && !isFailed && (
            <div className="vgw-timeline__bar" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
