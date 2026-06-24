/** @typedef {'idle' | 'generating' | 'done'} GenerationStatus */

/**
 * @typedef {Object} GenerationRawState
 * @property {GenerationStatus} status
 * @property {number} progress
 */

/** @returns {GenerationRawState} */
export function createInitialRawState() {
  return { status: "generating", progress: 0 };
}

/**
 * Loading UI tick: progress += random * 6 + 2
 * @param {GenerationRawState} prev
 * @param {{ taskComplete?: boolean }} options
 * @returns {GenerationRawState}
 */
export function tickRawState(prev, { taskComplete = false } = {}) {
  if (prev.status !== "generating") return prev;

  const cap = taskComplete ? 100 : 99;
  let progress = prev.progress + (Math.random() * 6 + 2);
  if (progress > cap) progress = cap;

  const status = progress >= 100 ? "done" : "generating";

  return { status, progress };
}
