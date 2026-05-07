import { createHttpError } from "../../shared/http.js";

export const imageRatioOptions = ["1:1", "3:4", "4:3", "9:16", "16:9"];
export const imageQualityOptions = [
  { value: "1K", multiplier: 0.8 },
  { value: "2K", multiplier: 1 },
  { value: "4K", multiplier: 1.65 }
];
export const imageCountOptions = [1];

export function qualityMultiplier(quality) {
  return imageQualityOptions.find((item) => item.value === quality)?.multiplier || 1;
}

export function validateImagePayload({ prompt, ratio, quality, count }) {
  if (!prompt || !prompt.trim()) {
    throw createHttpError("prompt is required", 400);
  }
  if (
    !imageRatioOptions.includes(ratio) ||
    !imageQualityOptions.some((item) => item.value === quality) ||
    !imageCountOptions.includes(Number(count))
  ) {
    throw createHttpError("invalid generation options", 400);
  }
}
