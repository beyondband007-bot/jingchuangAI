export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

export function normalizeSourceDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return String(Math.max(2, Math.ceil(number)));
}

export function cleanDisplayName(value, fallback = "素材文件") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const suspiciousCount = (text.match(/[\u951F]/g) || []).length;
  if (suspiciousCount >= 2 || /[ãÂ]/.test(text)) return fallback;
  return text;
}

export function readVideoFileDuration(file) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.resolve("");
  }

  return new Promise((resolve) => {
    const url = window.URL.createObjectURL(file);
    const video = document.createElement("video");

    function cleanup() {
      window.URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = normalizeSourceDuration(video.duration);
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve("");
    };
    video.src = url;
  });
}

export const PROCESSING_STEPS = [
  { id: "detect", label: "素材检测", threshold: 0 },
  { id: "analyze", label: "结构分析", threshold: 20 },
  { id: "generate", label: "AI 生成中", threshold: 40 },
  { id: "blend", label: "视频融合", threshold: 65 },
  { id: "render", label: "渲染输出", threshold: 84 },
];

export function getStepState(stepIndex, progress, isDone, isFailed = false) {
  if (isDone) return "done";
  if (isFailed) {
    const step = PROCESSING_STEPS[stepIndex];
    const next = PROCESSING_STEPS[stepIndex + 1];
    const failedProgress = Math.max(0, Number(progress) || 0);
    if (next && failedProgress >= next.threshold) return "done";
    if (failedProgress >= step.threshold) return "failed";
    return "pending";
  }
  const step = PROCESSING_STEPS[stepIndex];
  const next = PROCESSING_STEPS[stepIndex + 1];
  if (progress >= (next?.threshold ?? 100)) return "done";
  if (progress >= step.threshold) return "active";
  return "pending";
}

export function deriveWorkflowStatus({ uploadingField, taskStatus, progress }) {
  if (uploadingField) return "uploading";
  if (taskStatus === "completed") return "done";
  if (taskStatus === "processing" || taskStatus === "pending") {
    return progress >= 84 ? "rendering" : "processing";
  }
  if (taskStatus === "failed") return "failed";
  return "idle";
}

export const WORKFLOW_STATUS_LABELS = {
  idle: "待开始",
  uploading: "上传中",
  processing: "AI 生成中",
  rendering: "渲染输出",
  done: "已完成",
  failed: "生成失败",
};
