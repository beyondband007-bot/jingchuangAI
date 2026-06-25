export const PHOTO_SCRIPT_MAX_LENGTH = 500;

export const PHOTO_MODEL_LABELS = {
  "kie-s2v-r2v": "可灵数字人",
};

export const PHOTO_RESOLUTION_OPTIONS = [
  { value: "720p", label: "720p" },
];

export const PHOTO_ASPECT_RATIO_OPTIONS = [
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "1:1", label: "1:1 方形" },
];

export const PHOTO_VOICE_EMOTION_OPTIONS = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
];

export function estimatePhotoSpeechSeconds(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function formatPhotoModelLabel(model) {
  if (!model?.value) return "可灵数字人";
  return PHOTO_MODEL_LABELS[model.value] || model.label || model.value;
}
