/** @typedef {'idle' | 'generating' | 'done'} GenerationStatus */

/**
 * @typedef {Object} GenerationRawState
 * @property {GenerationStatus} status
 * @property {number} progress
 * @property {number} startedAtMs
 * @property {number=} completionStepIndex
 * @property {number=} completionStepStartedAtMs
 */

export const VIRTUAL_PROGRESS_DURATION_MS = 5 * 60 * 1000;
export const MIN_VIRTUAL_PROGRESS_DURATION_MS = 3 * 60 * 1000;
export const MAX_VIRTUAL_PROGRESS_DURATION_MS = 5 * 60 * 1000;
export const MIN_VISIBLE_STEP_MS = 5 * 1000;
export const VIRTUAL_PROGRESS_MAX = 98;

const MIN_TARGET_VIDEO_SECONDS = 4;
const MAX_TARGET_VIDEO_SECONDS = 10;
const STEP_COUNT = 4;
const STEP_STARTS = [0, 15, 50, 75];
const COMPLETION_SKIP_PROGRESS = 80;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCurrentStep(progress) {
  const safe = clamp(Number(progress) || 0, 0, 100);
  if (safe >= 100) return STEP_COUNT - 1;
  for (let index = STEP_COUNT - 1; index >= 0; index -= 1) {
    if (safe >= STEP_STARTS[index]) return index;
  }
  return 0;
}

function getStepProgress(stepIndex, elapsedMs) {
  const safeIndex = clamp(Number(stepIndex) || 0, 0, STEP_COUNT - 1);
  const ratio = clamp(elapsedMs / MIN_VISIBLE_STEP_MS, 0, 0.96);
  const start = STEP_STARTS[safeIndex];
  const end =
    safeIndex === STEP_COUNT - 1
      ? VIRTUAL_PROGRESS_MAX
      : STEP_STARTS[safeIndex + 1] - 1;
  return start + (end - start) * ratio;
}

export function getVirtualProgressDurationMs(targetDurationSeconds) {
  const seconds = Number(targetDurationSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return VIRTUAL_PROGRESS_DURATION_MS;
  }
  const ratio =
    (clamp(seconds, MIN_TARGET_VIDEO_SECONDS, MAX_TARGET_VIDEO_SECONDS) -
      MIN_TARGET_VIDEO_SECONDS) /
    (MAX_TARGET_VIDEO_SECONDS - MIN_TARGET_VIDEO_SECONDS);
  return Math.round(
    MIN_VIRTUAL_PROGRESS_DURATION_MS +
      (MAX_VIRTUAL_PROGRESS_DURATION_MS - MIN_VIRTUAL_PROGRESS_DURATION_MS) *
        ratio,
  );
}

/**
 * @param {number} [nowMs]
 * @returns {GenerationRawState}
 */
export function createInitialRawState(nowMs = Date.now()) {
  return { status: "generating", progress: 0, startedAtMs: nowMs };
}

/**
 * Restores the waiting-stage clock for a task that was opened from history.
 * Backdating the virtual start time keeps progress moving instead of leaving
 * the restored page frozen at the server-side checkpoint.
 *
 * @param {{ progress?: number, durationMs?: number, nowMs?: number }} options
 * @returns {GenerationRawState}
 */
export function createResumedRawState({
  progress = 0,
  durationMs = VIRTUAL_PROGRESS_DURATION_MS,
  nowMs = Date.now(),
} = {}) {
  const safeProgress = clamp(Number(progress) || 0, 0, VIRTUAL_PROGRESS_MAX);
  const safeDurationMs =
    Number.isFinite(Number(durationMs)) && Number(durationMs) > 0
      ? Number(durationMs)
      : VIRTUAL_PROGRESS_DURATION_MS;
  const elapsedMs = (safeProgress / VIRTUAL_PROGRESS_MAX) * safeDurationMs;

  return {
    status: "generating",
    progress: safeProgress,
    startedAtMs: nowMs - elapsedMs,
  };
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

  if (typeof prev.completionStepIndex === "number") {
    const elapsedMs = Math.max(
      0,
      nowMs - (prev.completionStepStartedAtMs ?? nowMs),
    );
    if (elapsedMs >= MIN_VISIBLE_STEP_MS) {
      const nextStepIndex = prev.completionStepIndex + 1;
      if (nextStepIndex >= STEP_COUNT) {
        return { ...prev, status: "done", progress: 100 };
      }
      return {
        ...prev,
        completionStepIndex: nextStepIndex,
        completionStepStartedAtMs: nowMs,
        progress: Math.max(prev.progress, getStepProgress(nextStepIndex, 0)),
      };
    }
    return {
      ...prev,
      progress: Math.max(
        prev.progress,
        getStepProgress(prev.completionStepIndex, elapsedMs),
      ),
    };
  }

  if (taskComplete) {
    if (prev.progress > COMPLETION_SKIP_PROGRESS) {
      return { ...prev, status: "done", progress: 100 };
    }
    const currentStep = getCurrentStep(prev.progress);
    const completionStepIndex = Math.min(STEP_COUNT - 1, currentStep + 1);
    return {
      ...prev,
      completionStepIndex,
      completionStepStartedAtMs: nowMs,
      progress: Math.max(prev.progress, getStepProgress(completionStepIndex, 0)),
    };
  }

  const elapsedMs = Math.max(0, nowMs - prev.startedAtMs);
  const progress = Math.min(
    VIRTUAL_PROGRESS_MAX,
    (elapsedMs / durationMs) * VIRTUAL_PROGRESS_MAX,
  );

  return { ...prev, progress: Math.max(prev.progress, progress) };
}
