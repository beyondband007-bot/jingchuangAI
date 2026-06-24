export function calcVideoVirtualDurationMs(videoDurationSeconds = 6) {
  const multiplier = 10 + Math.floor(Math.random() * 11);
  return multiplier * Number(videoDurationSeconds || 6) * 1000;
}

export function buildPseudoRandomProgressKeyframes(virtualDurationMs) {
  const targetMax = 99;
  const segmentCount = 14 + Math.floor(Math.random() * 9);
  const keyframes = [{ t: 0, p: 0 }];

  let accumulatedT = 0;
  let accumulatedP = 0;

  for (let i = 0; i < segmentCount; i += 1) {
    const remainingT = virtualDurationMs - accumulatedT;
    const remainingP = targetMax - accumulatedP;
    if (remainingT <= 120 || remainingP <= 0) break;

    const timePortion = 0.04 + Math.random() * 0.28;
    const dt = Math.max(120, remainingT * timePortion);
    const stall = Math.random() < 0.16;
    const dp = stall
      ? 0
      : remainingP * (0.02 + Math.random() * 0.24);

    accumulatedT = Math.min(virtualDurationMs, accumulatedT + dt);
    accumulatedP = Math.min(targetMax, accumulatedP + dp);
    keyframes.push({ t: accumulatedT, p: Math.round(accumulatedP) });
  }

  keyframes.push({ t: virtualDurationMs, p: targetMax });

  return keyframes
    .sort((a, b) => a.t - b.t)
    .filter((frame, index, list) => {
      if (!index) return true;
      const prev = list[index - 1];
      return frame.t > prev.t || frame.p > prev.p;
    });
}

function smoothstep(ratio) {
  const value = Math.max(0, Math.min(1, ratio));
  return value * value * (3 - 2 * value);
}

export function getPseudoRandomProgressPercent(
  elapsedMs,
  keyframes,
  virtualDurationMs,
) {
  const elapsed = Math.max(0, elapsedMs);
  if (!keyframes?.length) return 0;
  if (elapsed <= 0) return 0;

  const cappedElapsed = Math.min(elapsed, virtualDurationMs);

  for (let index = 1; index < keyframes.length; index += 1) {
    const prev = keyframes[index - 1];
    const curr = keyframes[index];
    if (cappedElapsed <= curr.t) {
      if (curr.p <= prev.p) return prev.p;
      const ratio = (cappedElapsed - prev.t) / (curr.t - prev.t || 1);
      return Math.round(prev.p + (curr.p - prev.p) * smoothstep(ratio));
    }
  }

  return keyframes[keyframes.length - 1]?.p ?? 99;
}

export function getFinishProgressBump(currentPercent) {
  if (currentPercent >= 100) return 0;
  if (currentPercent >= 96) return 100 - currentPercent;
  return 1 + Math.floor(Math.random() * 3);
}
