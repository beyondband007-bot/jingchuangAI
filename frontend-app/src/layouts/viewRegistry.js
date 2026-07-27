export const registeredFeatureIds = [
  "creation",
  "assets",
  "profile",
  "favorites",
  "billing",
  "image",
  "video",
  "chat",
  "infinite-canvas",
  "digital-human",
  "motion",
  "face-swap",
  "watermark",
  "voice",
  "voice-convert",
  "transcribe",
  "article",
  "music",
  "replicate",
  "enhance",
  "remove-bg",
  "video-voice",
];

export function createViewRegistry(renderers) {
  return registeredFeatureIds
    .map((id) => ({ id, render: renderers[id] }))
    .filter((view) => typeof view.render === "function");
}
