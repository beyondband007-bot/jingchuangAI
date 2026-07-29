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

export function validateVideoPayload({
  prompt,
  model,
  ratio,
  duration,
  count,
  referenceImageUrl,
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
  if (referenceImageUrl && referenceVideoUrl) {
    throw createHttpError("cannot provide both reference image and reference video", 400);
  }
  if (
    String(model.provider_model || "").includes("kling-3.0") &&
    (referenceVideoUrl || referenceAudioUrl)
  ) {
    throw createHttpError("Kling 3.0 currently supports prompt and optional reference image only", 400);
  }
  if (referenceAudioUrl && !/^(?:https?:\/\/|\/media\/|asset:\/\/)/i.test(String(referenceAudioUrl))) {
    throw createHttpError("invalid reference audio URL", 400);
  }
}
