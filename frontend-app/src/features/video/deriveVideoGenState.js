/** @typedef {import('./videoGenRawState').GenerationStatus} GenerationStatus */
/** @typedef {import('./videoGenRawState').GenerationRawState} GenerationRawState */

export const PROGRESS_RING_RADIUS = 116;
export const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

/** @typedef {'play' | 'film' | 'music' | 'check'} StepIconKey */

const STEPS = [
  {
    label: "1. 脚本解析",
    activeLabel: "正在解析脚本...",
    icon: /** @type {StepIconKey} */ ("play"),
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
    icon: /** @type {StepIconKey} */ ("check"),
  },
];

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
  return Math.min(3, Math.floor(progress / 25));
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
      className: "step",
      icon: meta.icon,
    };
  }

  if (index < stepIndex) {
    return {
      label: meta.label,
      stateLabel: "已完成",
      className: "step",
      icon: meta.icon,
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
  return `${Math.max(8, safe * 0.55)}%`;
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
      description: context.prompt ?? "",
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
