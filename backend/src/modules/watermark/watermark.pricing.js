const BASIC_RATES_RMB_PER_MINUTE = Object.freeze({
  sd: 0.13,
  hd: 0.17,
  fhd: 0.34,
  twoK: 0.67,
  fourK: 1.34,
  eightK: 2.69
});

const ADVANCED_RATES_RMB_PER_MINUTE = Object.freeze({
  hd: 1.5,
  fhd: 3,
  twoK: 3,
  fourK: 6
});

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function getTencentMpsWatermarkResolutionTier({ width, height } = {}) {
  const shortEdge = Math.min(positiveNumber(width), positiveNumber(height));
  if (!shortEdge || shortEdge <= 480) return "sd";
  if (shortEdge <= 720) return "hd";
  if (shortEdge <= 1080) return "fhd";
  if (shortEdge <= 1440) return "twoK";
  if (shortEdge <= 2160) return "fourK";
  return "eightK";
}

export function getTencentMpsWatermarkRate({ width, height, model = "basic" } = {}) {
  const tier = getTencentMpsWatermarkResolutionTier({ width, height });
  const normalizedModel = String(model || "").toLowerCase() === "advanced" ? "advanced" : "basic";
  const rates = normalizedModel === "advanced" ? ADVANCED_RATES_RMB_PER_MINUTE : BASIC_RATES_RMB_PER_MINUTE;
  const fallbackRate = normalizedModel === "advanced" ? rates.fourK : rates.eightK;
  return {
    model: normalizedModel,
    tier,
    rmbPerMinute: rates[tier] || fallbackRate
  };
}

export function calculateTencentMpsWatermarkPoints({
  durationSeconds,
  width,
  height,
  model = "basic",
  markup = 1.2,
  pointsPerRmb = 100
} = {}) {
  const seconds = positiveNumber(durationSeconds);
  if (!seconds) return 0;
  const rate = getTencentMpsWatermarkRate({ width, height, model });
  const points = seconds / 60
    * rate.rmbPerMinute
    * positiveNumber(markup, 1.2)
    * positiveNumber(pointsPerRmb, 100);
  return Math.max(1, Math.ceil(points));
}
