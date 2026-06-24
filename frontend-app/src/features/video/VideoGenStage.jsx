import React from "react";
import {
  RING_CENTER,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
} from "./deriveVideoGenState";
import "./videoGenStage.css";

/**
 * Loading UI — pure view, reads derivedState only.
 * @param {import('./deriveVideoGenState').DerivedVideoGenState} derivedState
 * @param {React.RefObject<HTMLElement | null>} logEndRef
 */
export function VideoGenStage({ derivedState, logEndRef }) {
  const { meta, stage, progress, steps, logs } = derivedState;

  return (
    <div
      className={stage.rootClassName}
      aria-live="polite"
      aria-busy={meta.ariaBusy}
    >
      <div className="bg particles" aria-hidden="true" />

      <div className="container">
        <div className="progress-wrap">
          <svg className="progress" viewBox="0 0 220 220" aria-hidden="true">
            <circle
              className="bg-circle"
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
            />
            <circle
              className="progress-circle"
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={progress.ringDashoffset}
            />
          </svg>
          <div className="percent" aria-label={progress.ariaLabel}>
            {progress.percentText}
          </div>
        </div>

        <div className="steps" aria-label="生成阶段">
          {steps.map((step) => (
            <div key={step.name} className={step.className}>
              {step.name}
            </div>
          ))}
        </div>

        <div className={logs.className} aria-label="生成日志">
          {logs.lines.map((line, index) => (
            <div key={`${line.text}-${index}`} className="log-item">
              &gt; {line.text}
            </div>
          ))}
          <span ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
