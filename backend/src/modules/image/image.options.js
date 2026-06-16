import { createHttpError } from "../../shared/http.js";

export const imageRatioOptions = ["1:1", "3:4", "4:3", "9:16", "16:9"];
export const imageQualityOptions = [
  { value: "1K", multiplier: 0.8 },
  { value: "2K", multiplier: 1 }
];
export const imageCountOptions = [1];
export const gptImage2ModelKey = "gpt_image_2";
export const gptImage2ImageToImageModelKey = "gpt_image_2_i2i";
export const imageToImageModelKey = gptImage2ImageToImageModelKey;

export function qualityMultiplier(quality) {
  return imageQualityOptions.find((item) => item.value === quality)?.multiplier || 1;
}

export function validateImagePayload({ prompt, ratio, quality, count, model, referenceImageUrl }) {
  if (!prompt || !prompt.trim()) {
    throw createHttpError("prompt is required", 400);
  }
  if (model === gptImage2ImageToImageModelKey && !referenceImageUrl) {
    throw createHttpError("reference image is required for image-to-image generation", 400);
  }
  if (referenceImageUrl && model !== gptImage2ModelKey && model !== gptImage2ImageToImageModelKey) {
    throw createHttpError("当前模型暂不支持参考图，请切换 GPT Image 2", 400);
  }
  if (
    !imageRatioOptions.includes(ratio) ||
    !imageQualityOptions.some((item) => item.value === quality) ||
    !imageCountOptions.includes(Number(count))
  ) {
    throw createHttpError("invalid generation options", 400);
  }
}
