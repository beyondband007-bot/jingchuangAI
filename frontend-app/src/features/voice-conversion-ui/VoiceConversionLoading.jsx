import React from "react";
import "./VoiceConversionLoading.css";

function AudioWaveIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 10v4" />
      <path d="M6 6v12" />
      <path d="M10 3v18" />
      <path d="M14 8v8" />
      <path d="M18 6v12" />
      <path d="M22 10v4" />
    </svg>
  );
}

export function VoiceConversionLoading({
  progress,
  stageText,
  isComplete,
  title = "正在转换音色",
  completeTitle = "音色转换完成",
  progressLabel = "转换进度",
}) {
  return (
    <section
      className="voice-conversion-loading"
      aria-live="polite"
      aria-busy={!isComplete}
    >
      <div className="voice-conversion-loading__visual">
        <span className="voice-conversion-loading__orbit" aria-hidden="true" />
        <span className="voice-conversion-loading__glow" aria-hidden="true" />
        <div className="voice-conversion-loading__core">
          <AudioWaveIcon />
        </div>
      </div>

      <h2 className="voice-conversion-loading__title">
        {isComplete ? completeTitle : title}
      </h2>

      <p className="voice-conversion-loading__description">
        {stageText || "正在处理音频"}
      </p>

      <div className="voice-conversion-loading__progress-info">
        <span>{progressLabel}</span>
        <strong>{Math.round(progress || 0)}%</strong>
      </div>

      <div className="voice-conversion-loading__progress-track">
        <div
          className="voice-conversion-loading__progress-value"
          style={{
            width: `${Math.min(100, Math.max(0, progress || 0))}%`,
          }}
        />
      </div>
    </section>
  );
}
