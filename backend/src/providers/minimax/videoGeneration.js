import { requestMinimax } from "./client.js";

export const MINIMAX_H3_MODEL = "MiniMax-H3";

function buildMediaInput(type, role, url) {
  return {
    type,
    role,
    [type]: { url }
  };
}

export function buildMinimaxH3Content({
  prompt,
  firstFrameImageUrl,
  lastFrameImageUrl,
  referenceImageUrls = [],
  referenceVideoUrl,
  referenceAudioUrl
}) {
  const content = [{ type: "text", text: String(prompt || "").trim() }];
  if (firstFrameImageUrl) {
    content.push(buildMediaInput("image_url", "first_frame", firstFrameImageUrl));
  }
  if (lastFrameImageUrl) {
    content.push(buildMediaInput("image_url", "last_frame", lastFrameImageUrl));
  }
  for (const url of referenceImageUrls) {
    content.push(buildMediaInput("image_url", "reference_image", url));
  }
  if (referenceVideoUrl) {
    content.push(buildMediaInput("video_url", "reference_video", referenceVideoUrl));
  }
  if (referenceAudioUrl) {
    content.push(buildMediaInput("audio_url", "reference_audio", referenceAudioUrl));
  }
  return content;
}

export function buildMinimaxH3Payload({
  content,
  resolution = "2K",
  ratio = "16:9",
  duration = 4,
  watermark = false
}) {
  const hasFrameInput = content.some((item) => ["first_frame", "last_frame"].includes(item.role));
  return {
    model: MINIMAX_H3_MODEL,
    content,
    resolution: String(resolution || "2K").toUpperCase(),
    duration: Number(duration),
    ratio: hasFrameInput ? "adaptive" : ratio,
    aigc_watermark: Boolean(watermark)
  };
}

export async function createMinimaxH3VideoTask(options) {
  const payload = buildMinimaxH3Payload(options);
  const result = await requestMinimax("/v2/video_generation", {
    method: "POST",
    body: JSON.stringify(payload),
    retries: 0
  });
  if (!result.task_id) {
    const error = new Error("MiniMax H3 response missing task_id");
    error.status = 502;
    error.body = result;
    throw error;
  }
  return { taskId: result.task_id, raw: result };
}

export async function getMinimaxH3VideoTask({ taskId }) {
  return requestMinimax(`/v2/query/video_generation/${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapMinimaxH3VideoState(record = {}) {
  const status = String(record?.task?.status || "").toLowerCase();
  if (status === "succeeded") return "completed";
  if (["failed", "cancelled"].includes(status)) return "failed";
  return "processing";
}

export function extractMinimaxH3VideoResult(record = {}) {
  const task = record?.task || {};
  const rawError = task.error?.message || task.error || record?.error?.message || record?.error || "";
  return {
    resultUrl: task.content?.url || "",
    errorMessage: typeof rawError === "string" ? rawError : JSON.stringify(rawError),
    usage: task.usage || null,
    resolution: task.resolution || null,
    duration: task.duration || null,
    ratio: task.ratio || null
  };
}
