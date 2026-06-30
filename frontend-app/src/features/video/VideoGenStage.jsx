import React, { useRef } from "react";
import { PROGRESS_RING_RADIUS } from "./deriveVideoGenState";
import { useGenerationStageAmbience } from "./useGenerationStageAmbience";
import "./videoGenStage.css";

/** @param {{ icon: import('./deriveVideoGenState').StepIconKey }} props */
function StepIcon({ icon }) {
  if (icon === "script") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h8l4 4v12H6z" />
        <path d="M14 4v4h4" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (icon === "film") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 4v16M15 4v16" />
      </svg>
    );
  }
  if (icon === "music") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18V6l9-2v12" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="15" cy="16" r="3" />
      </svg>
    );
  }
  if (icon === "edit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M4 18h16" />
        <path d="M8 6v12M16 6v12" />
        <path d="m10 14 4-4" />
        <path d="m10 10 4 4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.4 4.8-5" />
    </svg>
  );
}

/**
 * Facemini generation-stage UI — driven by derivedState only.
 * @param {import('./deriveVideoGenState').DerivedVideoGenState} derivedState
 */
export function VideoGenStage({ derivedState }) {
  const stageRef = useRef(null);
  const orbitNodeA = useRef(null);
  const orbitNodeB = useRef(null);
  const orbitNodeC = useRef(null);
  const orbitNodeD = useRef(null);
  const orbitNodeRefs = [orbitNodeA, orbitNodeB, orbitNodeC, orbitNodeD];

  const { ambientRef, waveRef } = useGenerationStageAmbience(
    stageRef,
    orbitNodeRefs,
  );

  const { meta, header, progress, steps, stepsProgressWidth, tip } =
    derivedState;

  const rootClassName = `generation-stage video-gen-view video-gen-view-root is-gen-stage${
    meta.isDone ? " is-done" : ""
  }`;

  return (
    <section
      ref={stageRef}
      className={rootClassName}
      aria-live="polite"
      aria-busy={meta.ariaBusy}
    >
      <canvas ref={ambientRef} className="generation-stage__ambient" />
      <canvas ref={waveRef} className="generation-stage__wave" />

      <div className="generation-content">
        <h1 className="generation-title">
          <span className="sparkle" />
          {header.title}
          <span className="sparkle" />
        </h1>

        {header.description ? (
          <div className="generation-desc">{header.description}</div>
        ) : null}

        <div className="visual-core">
          <svg className="orbit-svg" viewBox="0 0 940 350" aria-hidden="true">
            <defs>
              <filter
                id="genNodeGlow"
                x="-200%"
                y="-200%"
                width="400%"
                height="400%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <ellipse
              className="orbit-line one"
              cx="470"
              cy="175"
              rx="405"
              ry="125"
            />
            <ellipse
              className="orbit-line two"
              cx="470"
              cy="175"
              rx="395"
              ry="92"
            />
            <ellipse
              className="orbit-line three"
              cx="470"
              cy="175"
              rx="330"
              ry="142"
            />

            <g ref={orbitNodeA} className="moving-node node-a">
              <circle className="orbit-node" r="5" filter="url(#genNodeGlow)" />
              <circle className="orbit-node" r="10" opacity="0.16" filter="url(#genNodeGlow)" />
            </g>
            <g ref={orbitNodeB} className="moving-node node-b">
              <circle className="orbit-node" r="4" filter="url(#genNodeGlow)" />
              <circle className="orbit-node" r="8" opacity="0.14" filter="url(#genNodeGlow)" />
            </g>
            <g ref={orbitNodeC} className="moving-node node-c">
              <circle className="orbit-node" r="3" filter="url(#genNodeGlow)" />
            </g>
            <g ref={orbitNodeD} className="moving-node node-d">
              <circle className="orbit-node" r="6" filter="url(#genNodeGlow)" />
              <circle className="orbit-node" r="12" opacity="0.12" filter="url(#genNodeGlow)" />
            </g>
          </svg>

          <div className="progress-shell">
            <svg className="progress-svg" viewBox="0 0 280 280">
              <defs>
                <linearGradient id="genProgressGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#826fff" />
                  <stop offset="55%" stopColor="#6f5cff" />
                  <stop offset="100%" stopColor="#9e8aff" />
                </linearGradient>
                <filter
                  id="genProgressGlow"
                  x="-40%"
                  y="-40%"
                  width="180%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                className="progress-track"
                cx="140"
                cy="140"
                r={PROGRESS_RING_RADIUS}
              />
              <circle
                className="progress-value"
                cx="140"
                cy="140"
                r={PROGRESS_RING_RADIUS}
                strokeDasharray={progress.ringCircumference}
                strokeDashoffset={progress.ringDashoffset}
              />
            </svg>

            <div className="progress-copy">
              <div className="progress-label">整体进度</div>
              <div className="progress-number" aria-label={progress.ariaLabel}>
                {progress.percentText}
              </div>
              <div className="progress-status">{progress.statusText}</div>
              {progress.etaText ? (
                <div className="progress-eta">{progress.etaText}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="steps">
          <div
            className="steps-progress"
            style={{ width: stepsProgressWidth }}
          />
          {steps.map((step) => (
            <div key={step.label} className={step.className}>
              <div className="step-icon">
                <StepIcon icon={step.icon} />
              </div>
              <div className="step-name">{step.label}</div>
              <div className="step-state">{step.stateLabel}</div>
            </div>
          ))}
        </div>

        <div className="tip-card">
          <div className="tip-title">
            <span className="tip-icon">✦</span>
            {tip.title}
          </div>
          <div className="tip-text">{tip.text}</div>
        </div>
      </div>
    </section>
  );
}
