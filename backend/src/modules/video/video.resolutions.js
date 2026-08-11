const VIDEO_RESOLUTION_RULES = {
  minimax_h3_2k: {
    defaultResolution: "2K",
    options: [
      { value: "768P", pointsPerSecond: 60, rmbPerSecond: 0.5 },
      { value: "2K", pointsPerSecond: 96, rmbPerSecond: 0.8 }
    ]
  },
  seedance_2_0_720p: {
    defaultResolution: "720P",
    options: [
      {
        value: "480P",
        pointsPerSecond: 54,
        rmbPerSecond: 0.442,
        estimated: true,
        billingNote: "按 720P 已有任务 Token 消耗与像素量比例预估"
      },
      {
        value: "720P",
        pointsPerSecond: 120,
        rmbPerSecond: 0.994,
        estimated: true,
        billingNote: "按 720P 已有任务 Token 消耗预估"
      },
      {
        value: "1080P",
        pointsPerSecond: 270,
        rmbPerSecond: 2.236,
        estimated: true,
        billingNote: "按 720P 已有任务 Token 消耗与像素量比例预估"
      }
    ]
  },
  seedance_tc: {
    defaultResolution: "720P",
    options: [
      {
        value: "480P",
        pointsPerSecond: 54,
        rmbPerSecond: 0.442,
        estimated: true,
        billingNote: "与阿里云 Seedance 480P 售价保持一致"
      },
      {
        value: "720P",
        pointsPerSecond: 120,
        rmbPerSecond: 0.994,
        estimated: true,
        billingNote: "与阿里云 Seedance 720P 售价保持一致"
      },
      {
        value: "1080P",
        pointsPerSecond: 270,
        rmbPerSecond: 2.236,
        estimated: true,
        billingNote: "与阿里云 Seedance 1080P 售价保持一致"
      }
    ]
  },
  kling_3_std: {
    defaultResolution: "720P",
    options: [
      { value: "720P", pointsPerSecond: 120, providerMode: "std" },
      { value: "1080P", pointsPerSecond: 162, providerMode: "pro" },
      { value: "4K", pointsPerSecond: 402, providerMode: "4K" }
    ]
  }
};

function getModelKey(model) {
  return typeof model === "string" ? model : model?.model_key;
}

export function normalizeVideoResolution(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (/^\d{3,4}$/.test(normalized)) return `${normalized}P`;
  return normalized;
}

export function getVideoResolutionConfig(model) {
  return VIDEO_RESOLUTION_RULES[getModelKey(model)] || null;
}

export function getVideoResolutionOptions(model) {
  const config = getVideoResolutionConfig(model);
  return (config?.options || []).map((option) => ({
    ...option,
    label: `${option.value}${option.estimated ? "（预估）" : ""} · ${option.pointsPerSecond}积分/秒`
  }));
}

export function resolveVideoResolution(model, requestedResolution) {
  const config = getVideoResolutionConfig(model);
  if (!config) return normalizeVideoResolution(requestedResolution) || null;

  const normalized = normalizeVideoResolution(requestedResolution || config.defaultResolution);
  const option = config.options.find((item) => item.value === normalized);
  return option?.value || null;
}

export function getVideoResolutionOption(model, resolution) {
  const config = getVideoResolutionConfig(model);
  if (!config) return null;
  const normalized = resolveVideoResolution(model, resolution);
  return config.options.find((item) => item.value === normalized) || null;
}

export function getDefaultVideoResolution(model) {
  return getVideoResolutionConfig(model)?.defaultResolution || null;
}
