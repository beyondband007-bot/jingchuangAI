import React, { useId, useMemo } from "react";

const WAVE_PATH =
  "M0 40 C30 18 50 62 80 40 S130 18 160 40 S210 62 240 40 S290 18 320 40 S370 62 400 40 S450 18 480 40";

function buildParticles(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: 10 + ((index * 17 + 7) % 80),
    top: 18 + ((index * 23 + 11) % 64),
    size: 4 + (index % 3) * 1.5 + (index % 2) * 0.5,
    opacity: 0.08 + (index % 4) * 0.025,
    duration: 16 + (index % 5) * 3,
    delay: (index % 6) * 1.4,
    drift: -18 + (index % 7) * 6
  }));
}

function WaveSvg({ gradientId, mirrored = false }) {
  return (
    <svg
      viewBox="0 0 480 80"
      className="music-immersive__wave-svg"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(124, 92, 255, 0)" />
          <stop offset="35%" stopColor="rgba(124, 92, 255, 0.28)" />
          <stop offset="72%" stopColor="rgba(124, 92, 255, 0.42)" />
          <stop offset="100%" stopColor="rgba(124, 92, 255, 0.06)" />
        </linearGradient>
      </defs>
      <path
        d={WAVE_PATH}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={WAVE_PATH}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        transform="translate(0, 14)"
        opacity="0.45"
      />
    </svg>
  );
}

function FlowWaveLine({ side, gradientId }) {
  const mirrored = side === "right";

  return (
    <div className={`music-immersive__wave-line music-immersive__wave-line--${side}`}>
      <div className="music-immersive__wave-track">
        <WaveSvg gradientId={`${gradientId}-${side}-a`} mirrored={mirrored} />
        <WaveSvg gradientId={`${gradientId}-${side}-b`} mirrored={mirrored} />
      </div>
    </div>
  );
}

export function MusicImmersiveStage({ isPlaying = true }) {
  const gradientBase = useId().replace(/:/g, "");
  const particles = useMemo(() => buildParticles(8), []);

  return (
    <div className={`music-immersive__stage${isPlaying ? " is-playing" : " is-paused"}`}>
      <div className="music-immersive__glow music-immersive__glow--core" aria-hidden="true" />
      <div className="music-immersive__glow music-immersive__glow--soft" aria-hidden="true" />

      <div className="music-immersive__particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="music-immersive__particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              "--particle-drift": `${particle.drift}px`
            }}
          />
        ))}
      </div>

      <div className="music-immersive__center">
        <div className="music-immersive__stage-row">
          <FlowWaveLine side="left" gradientId={gradientBase} />
          <div className="music-immersive__icon-stack">
            <span className="music-immersive__ring music-immersive__ring--one" />
            <span className="music-immersive__ring music-immersive__ring--two" />
            <div className="music-immersive__icon" aria-hidden="true">♪</div>
          </div>
          <FlowWaveLine side="right" gradientId={gradientBase} />
        </div>
      </div>
    </div>
  );
}
