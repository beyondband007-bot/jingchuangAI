import { createHttpError } from "../../shared/http.js";
import { calculateVideoPoints as calculateUnifiedVideoPoints } from "../../shared/billingRules.js";

export const videoCountOptions = [1];

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getModelRatios(model) {
  return parseJson(model.supported_ratios, []);
}

export function getModelDurations(model) {
  return parseJson(model.supported_durations, []);
}

export function calculateVideoPoints(model, duration, count = 1) {
  return calculateUnifiedVideoPoints(duration) * Number(count);
}

function cleanMediaUrl(value) {
  return String(value || "").trim();
}

function uniqueMediaUrls(values = []) {
  return [...new Set(values.map(cleanMediaUrl).filter(Boolean))];
}

export function normalizeVideoImageInputs({
  mode = "first-frame",
  referenceImageUrl,
  firstFrameImageUrl,
  lastFrameImageUrl,
  referenceImageUrls
} = {}) {
  let firstFrame = cleanMediaUrl(firstFrameImageUrl);
  const lastFrame = cleanMediaUrl(lastFrameImageUrl);
  const references = uniqueMediaUrls(Array.isArray(referenceImageUrls) ? referenceImageUrls : []);
  const legacyImage = cleanMediaUrl(referenceImageUrl);

  if (legacyImage && !firstFrame && references.length === 0) {
    if (mode === "first-frame") firstFrame = legacyImage;
    else references.push(legacyImage);
  }

  return {
    firstFrameImageUrl: firstFrame || null,
    lastFrameImageUrl: lastFrame || null,
    referenceImageUrls: references
  };
}

export function validateVideoPayload({
  prompt,
  model,
  ratio,
  duration,
  count,
  mode,
  referenceImageUrl,
  firstFrameImageUrl,
  lastFrameImageUrl,
  referenceImageUrls,
  referenceVideoUrl,
  referenceAudioUrl
}) {
  if (!prompt || !prompt.trim()) {
    throw createHttpError("prompt is required", 400);
  }
  if (!model) {
    throw createHttpError("model not found", 400);
  }
  if (!getModelRatios(model).includes(ratio) || !getModelDurations(model).includes(Number(duration))) {
    throw createHttpError("invalid generation options", 400);
  }
  if (!videoCountOptions.includes(Number(count))) {
    throw createHttpError("invalid generation count", 400);
  }
  const imageInputs = normalizeVideoImageInputs({
    mode,
    referenceImageUrl,
    firstFrameImageUrl,
    lastFrameImageUrl,
    referenceImageUrls
  });
  const hasFrameImages = Boolean(imageInputs.firstFrameImageUrl || imageInputs.lastFrameImageUrl);
  const hasReferenceImages = imageInputs.referenceImageUrls.length > 0;
  const allImageUrls = [
    imageInputs.firstFrameImageUrl,
    imageInputs.lastFrameImageUrl,
    ...imageInputs.referenceImageUrls
  ].filter(Boolean);
  const validMediaUrl = /^(?:https?:\/\/|\/media\/|asset:\/\/)/i;

  if ((hasFrameImages || hasReferenceImages) && referenceVideoUrl) {
    throw createHttpError("cannot provide both reference image and reference video", 400);
  }
  if (imageInputs.lastFrameImageUrl && !imageInputs.firstFrameImageUrl) {
    throw createHttpError("last frame requires first frame", 400);
  }
  if (hasFrameImages && hasReferenceImages) {
    throw createHttpError("frame images cannot be combined with reference images", 400);
  }
  if (imageInputs.referenceImageUrls.length > 9) {
    throw createHttpError("too many reference images", 400);
  }
  if (allImageUrls.some((url) => !validMediaUrl.test(url))) {
    throw createHttpError("invalid reference image URL", 400);
  }
  if (
    String(model.provider_model || "").includes("kling-3.0") &&
    (referenceVideoUrl || referenceAudioUrl || imageInputs.lastFrameImageUrl || imageInputs.referenceImageUrls.length > 1)
  ) {
    throw createHttpError("Kling 3.0 currently supports prompt and optional reference image only", 400);
  }
  if (referenceAudioUrl && !validMediaUrl.test(String(referenceAudioUrl))) {
    throw createHttpError("invalid reference audio URL", 400);
  }
}
