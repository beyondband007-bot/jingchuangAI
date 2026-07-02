/** @typedef {import('./videoGenRawState').GenerationStatus} GenerationStatus */
/** @typedef {import('./videoGenRawState').GenerationRawState} GenerationRawState */

export const PROGRESS_RING_RADIUS = 116;
export const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

/** @typedef {'script' | 'film' | 'music' | 'edit' | 'check'} StepIconKey */

const STEPS = [
  {
    label: "1. 脚本解析",
    activeLabel: "正在解析脚本...",
    icon: /** @type {StepIconKey} */ ("script"),
  },
  {
    label: "2. 素材生成",
    activeLabel: "正在生成素材...",
    icon: /** @type {StepIconKey} */ ("film"),
  },
  {
    label: "3. 音频合成",
    activeLabel: "正在合成音频...",
    icon: /** @type {StepIconKey} */ ("music"),
  },
  {
    label: "4. 后期处理",
    activeLabel: "正在进行后期处理...",
    icon: /** @type {StepIconKey} */ ("edit"),
  },
];

const STEP_COUNT = STEPS.length;
const STEP_STARTS = [0, 15, 50, 75];
const STEP_LINE_START = 10;
const STEP_LINE_END = 90;
const STEP_NODE_SPAN = (STEP_LINE_END - STEP_LINE_START) / (STEP_COUNT - 1);

/**
 * @typedef {Object} DerivedStep
 * @property {string} label
 * @property {string} stateLabel
 * @property {string} className
 * @property {StepIconKey} icon
 */

/**
 * @typedef {Object} DerivedVideoGenState
 * @property {{ isStageVisible: boolean, isGenerating: boolean, isDone: boolean, ariaBusy: boolean }} meta
 * @property {{ title: string, description: string }} header
 * @property {{ value: number, percentText: string, statusText: string, etaText: string, ringDashoffset: number, ringCircumference: number, ariaLabel: string }} progress
 * @property {number} currentStep
 * @property {string} stepsProgressWidth
 * @property {DerivedStep[]} steps
 * @property {{ title: string, text: string }} tip
 */

export function deriveCurrentStep(progress) {
  const safe = Math.max(0, Math.min(100, progress));
  if (safe >= 100) return STEP_COUNT - 1;
  for (let index = STEP_COUNT - 1; index >= 0; index -= 1) {
    if (safe >= STEP_STARTS[index]) return index;
  }
  return 0;
}

/**
 * @param {number} index
 * @param {number} progress
 * @param {GenerationStatus} status
 */
function deriveStep(index, progress, status) {
  const meta = STEPS[index];
  const stepIndex = deriveCurrentStep(progress);

  if (status === "done") {
    return {
      label: meta.label,
      stateLabel: "已完成",
      className: "step is-done",
      icon: /** @type {StepIconKey} */ ("check"),
    };
  }

  if (index < stepIndex) {
    return {
      label: meta.label,
      stateLabel: "已完成",
      className: "step is-done",
      icon: /** @type {StepIconKey} */ ("check"),
    };
  }

  if (index === stepIndex) {
    return {
      label: meta.label,
      stateLabel: meta.activeLabel,
      className: "step active",
      icon: meta.icon,
    };
  }

  return {
    label: meta.label,
    stateLabel: "等待中",
    className: "step",
    icon: meta.icon,
  };
}

function deriveStepsProgressWidth(progress) {
  const safe = Math.max(0, Math.min(100, progress));
  if (safe >= 100) return `${STEP_LINE_END - STEP_LINE_START}%`;
  if (safe < STEP_STARTS[1]) return "0%";

  const segmentIndex = safe < STEP_STARTS[2] ? 0 : safe < STEP_STARTS[3] ? 1 : 2;
  const segmentStart = STEP_STARTS[segmentIndex + 1];
  const segmentEnd =
    segmentIndex + 2 < STEP_STARTS.length ? STEP_STARTS[segmentIndex + 2] : 100;
  const stepProgress = (safe - segmentStart) / (segmentEnd - segmentStart);
  const previousNode = STEP_LINE_START + segmentIndex * STEP_NODE_SPAN;
  const nextNode = previousNode + STEP_NODE_SPAN;
  const endpoint = previousNode + (nextNode - previousNode) * stepProgress;
  const width = endpoint - STEP_LINE_START;
  return `${Math.max(0, Math.min(STEP_LINE_END - STEP_LINE_START, width))}%`;
}

function deriveEtaText(_progress, status) {
  if (status === "done") return "";
  return "预计需要5分钟";
}

export function deriveRingDashoffset(progress) {
  const safe = Math.max(0, Math.min(100, progress));
  return PROGRESS_RING_CIRCUMFERENCE * (1 - safe / 100);
}

/**
 * @param {GenerationRawState | null | undefined} raw
 * @param {{ prompt?: string }} [context]
 * @returns {DerivedVideoGenState | null}
 */
export function deriveVideoGenState(raw, context = {}) {
  if (!raw || raw.status === "idle") return null;

  const progress = Math.max(0, Math.min(100, raw.progress));
  const displayProgress = Math.floor(progress);
  const isDone = raw.status === "done";
  const isGenerating = raw.status === "generating";

  return {
    meta: {
      isStageVisible: isGenerating || isDone,
      isGenerating,
      isDone,
      ariaBusy: isGenerating,
    },
    header: {
      title: isDone ? "生成完成" : "视频生成中",
      description: "",
    },
    progress: {
      value: progress,
      percentText: `${displayProgress}%`,
      statusText: isDone ? "已完成" : "生成中...",
      etaText: deriveEtaText(progress, raw.status),
      ringDashoffset: deriveRingDashoffset(progress),
      ringCircumference: PROGRESS_RING_CIRCUMFERENCE,
      ariaLabel: `整体进度 ${displayProgress}%`,
    },
    currentStep: deriveCurrentStep(progress),
    stepsProgressWidth: deriveStepsProgressWidth(progress),
    steps: STEPS.map((_, index) => deriveStep(index, progress, raw.status)),
    tip: {
      title: "小贴士",
      text: "AI 正在为您生成高质量视频，请耐心等待，生成完成后将自动展示。",
    },
  };
}

/** @param {GenerationRawState} raw */
export function toGenerationState(raw) {
  const progress = Math.max(0, Math.min(100, raw.progress));
  return {
    status: raw.status,
    progress,
    steps: STEPS.map((step, index) => ({
      name: step.label,
      status:
        index < deriveCurrentStep(progress)
          ? "done"
          : index === deriveCurrentStep(progress)
            ? "running"
            : "pending",
    })),
  };
}
