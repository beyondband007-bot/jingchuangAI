const modelDisplayNames = {
  "gpt-5-6-codex": "facemini-codex",
  "gpt-5-4": "facemini-codex",
  "gpt-5-5": "facemini-codex",
  "gemini-3-6-flash-openai": "facemini",
  "gemini-3-pro": "facemini",
  "gemini-3.1-pro-openai": "facemini",
  gpt_image_1_5_i2i: "Facemini Image 1.5",
  gpt_image_2: "GPT Image 2（腾讯云）",
  gpt_image_2_i2i: "GPT Image 2（腾讯云）",
  nano_banana2: "Facemini Banana 2",
  nano_banana_pro: "Nano Banana Pro（腾讯云）",
  seedream_4_5: "Seedream 4.5（腾讯云）",
  "GPT Image 1.5": "Facemini Image 1.5",
  "GPT Image 1.5 图生图": "Facemini Image 1.5",
  "GPT Image 2": "GPT Image 2（腾讯云）",
  "GPT Image 2 图生图": "GPT Image 2（腾讯云）",
  "Nano Banana 2": "Facemini Banana 2",
  "Nano Banana Pro": "Nano Banana Pro（腾讯云）",
  "Seedream 4.5": "Seedream 4.5（腾讯云）",
  "GPT5.6-codex": "facemini-codex",
  "GPT Codex 系列": "facemini-codex",
  "Gemini 3.6": "facemini",
  "Gemini 3 Pro": "facemini",
};

export function getFrontendModelDisplayName(model, fallback = "") {
  const value = typeof model === "object" && model !== null ? model.value : model;
  const label =
    fallback ||
    (typeof model === "object" && model !== null ? model.label : "") ||
    value ||
    "";

  return modelDisplayNames[value] || label;
}

export function withFrontendModelDisplayNames(models) {
  return Array.isArray(models)
    ? models.map((model) => ({
        ...model,
        label: getFrontendModelDisplayName(model),
      }))
    : [];
}
