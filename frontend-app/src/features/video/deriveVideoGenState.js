/** @typedef {import('./videoGenRawState').GenerationStatus} GenerationStatus */
/** @typedef {import('./videoGenRawState').GenerationRawState} GenerationRawState */

export const STEP_NAMES = ["脚本解析", "素材生成", "音频合成", "后期处理"];
export const RING_CIRCUMFERENCE = 339;
export const RING_RADIUS = 54;
export const RING_CENTER = 110;

const LOGS_TEXT = [
  "开始生成任务...",
  "正在解析脚本...",
  "正在生成素材...",
  "正在合成音频...",
  "正在后期处理...",
];

/**
 * @typedef {Object} DerivedStep
 * @property {string} name
 * @property {string} className
 */

/**
 * @typedef {Object} DerivedLogLine
 * @property {string} text
 */

/**
 * @typedef {Object} DerivedVideoGenState
 * @property {{ isStageVisible: boolean, isGenerating: boolean, isDone: boolean, ariaBusy: boolean }} meta
 * @property {{ rootClassName: string }} stage
 * @property {{ value: number, percentText: string, ringDashoffset: number, ariaLabel: string }} progress
 * @property {number} currentStep
 * @property {DerivedStep[]} steps
 * @property {{ lines: DerivedLogLine[], className: string }} logs
 */

/** @param {number} progress */
export function deriveCurrentStep(progress) {
  return Math.min(3, Math.floor(progress / 25));
}

/**
 * Loading UI: stepIndex = floor(progress / 25), active when i === stepIndex.
 * @param {number} index
 * @param {number} progress
 * @param {GenerationStatus} status
 */
export function deriveStepClassName(index, progress, status) {
  if (status === "done") return "step";
  const stepIndex = deriveCurrentStep(progress);
  return index === stepIndex ? "step active" : "step";
}

/**
 * Loading UI: slice(0, floor(progress / 20)).
 * @param {number} progress
 * @param {GenerationStatus} status
 */
export function deriveLogs(progress, status) {
  if (status === "done") {
    return [...LOGS_TEXT, "视频生成完成"];
  }
  const logIndex = Math.floor(progress / 20);
  return LOGS_TEXT.slice(0, logIndex);
}

/** @param {number} progress */
export function deriveRingDashoffset(progress) {
  const safe = Math.max(0, Math.min(100, progress));
  return RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * safe) / 100;
}

/**
 * @param {GenerationRawState | null | undefined} raw
 * @returns {DerivedVideoGenState | null}
 */
export function deriveVideoGenState(raw) {
  if (!raw || raw.status === "idle") return null;

  const progress = Math.max(0, Math.min(100, raw.progress));
  const displayProgress = Math.floor(progress);
  const isDone = raw.status === "done";
  const isGenerating = raw.status === "generating";
  const currentStep = deriveCurrentStep(progress);
  const logTexts = deriveLogs(progress, raw.status);

  return {
    meta: {
      isStageVisible: isGenerating || isDone,
      isGenerating,
      isDone,
      ariaBusy: isGenerating,
    },
    stage: {
      rootClassName: isDone ? "gen-stage is-done" : "gen-stage",
    },
    progress: {
      value: progress,
      percentText: `${displayProgress}%`,
      ringDashoffset: deriveRingDashoffset(progress),
      ariaLabel: `整体进度 ${displayProgress}%`,
    },
    currentStep,
    steps: STEP_NAMES.map((name, index) => ({
      name,
      className: deriveStepClassName(index, progress, raw.status),
    })),
    logs: {
      className: "logs",
      lines: logTexts.map((text) => ({ text })),
    },
  };
}

/** @param {GenerationRawState} raw */
export function toGenerationState(raw) {
  const progress = Math.max(0, Math.min(100, raw.progress));
  return {
    status: raw.status,
    progress,
    steps: STEP_NAMES.map((name, index) => ({
      name,
      status:
        index < deriveCurrentStep(progress)
          ? "done"
          : index === deriveCurrentStep(progress)
            ? "running"
            : "pending",
    })),
  };
}
