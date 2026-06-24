/** @typedef {'idle' | 'generating' | 'done'} GenerationStatus */

/**
 * @typedef {Object} GenerationRawState
 * @property {GenerationStatus} status
 * @property {number} progress
 * @property {number} startedAtMs
 */

export const VIRTUAL_PROGRESS_DURATION_MS = 5 * 60 * 1000;

/**
 * @param {number} [nowMs]
 * @returns {GenerationRawState}
 */
export function createInitialRawState(nowMs = Date.now()) {
  return { status: "generating", progress: 0, startedAtMs: nowMs };
}

/**
 * Loading UI tick: simulate a 5-minute generation timeline.
 * @param {GenerationRawState} prev
 * @param {{ taskComplete?: boolean, nowMs?: number, durationMs?: number }} options
 * @returns {GenerationRawState}
 */
export function tickRawState(
  prev,
  {
    taskComplete = false,
    nowMs = Date.now(),
    durationMs = VIRTUAL_PROGRESS_DURATION_MS,
  } = {},
) {
  if (prev.status !== "generating") return prev;

  if (taskComplete) {
    return { ...prev, status: "done", progress: 100 };
  }

  const elapsedMs = Math.max(0, nowMs - prev.startedAtMs);
  const progress = Math.min(99, (elapsedMs / durationMs) * 99);

  return { ...prev, progress };
}
