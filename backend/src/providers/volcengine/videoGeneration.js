import { config } from "../../config/index.js";

function ensureArkKey() {
  if (!config.ark.apiKey) {
    const error = new Error("ARK_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function extractArkRequestId(message = "") {
  const match = String(message || "").match(/Request id:\s*([a-zA-Z0-9-]+)/i);
  return match?.[1] || "";
}

export function normalizeArkVideoErrorMessage(body = {}) {
  const code = String(body?.error?.code || body?.code || "");
  const message = String(body?.error?.message || body?.message || body?.error || "");
  const requestId = body?.request_id || body?.RequestId || extractArkRequestId(message);
  const suffix = requestId ? `（RequestId: ${requestId}）` : "";

  if (/InputImageSensitiveContentDetected\.PrivacyInformation/i.test(code) || /input image may contain real person/i.test(message)) {
    return `火山平台判定输入图片可能包含真人或隐私信息，请更换为明确的虚拟/卡通素材后再试${suffix}`;
  }

  if (/InputVideoSensitiveContentDetected\.PrivacyInformation/i.test(code) || /input video may contain real person/i.test(message)) {
    return `火山平台判定输入视频可能包含真人或隐私信息，请更换为明确的虚拟/卡通参考视频后再试${suffix}`;
  }

  if (/asset .*not found/i.test(message) || /notfound.*asset/i.test(code)) {
    return `火山视频生成接口无法访问该 asset:// 资产，通常是资产库 Project 与视频生成 API Key 命名空间未打通${suffix}`;
  }

  return message || `Ark request failed${suffix}`;
}

async function requestArk(path, options = {}) {
  ensureArkKey();
  const response = await fetch(`${config.ark.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.ark.apiKey}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(normalizeArkVideoErrorMessage(body) || `Ark request failed with ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export async function createArkVideoGenerationTask({
  model = config.ark.videoModel,
  content,
  resolution = "720p",
  ratio = "adaptive",
  duration,
  generateAudio = false,
  watermark = false
}) {
  const payload = {
    model,
    content,
    resolution,
    ratio,
    generate_audio: Boolean(generateAudio),
    watermark: Boolean(watermark)
  };
  if (Number.isFinite(Number(duration))) {
    payload.duration = Number(duration);
  }

  const result = await requestArk("/contents/generations/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!result.id) {
    const error = new Error("Ark video generation response missing task id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return { taskId: result.id, raw: result };
}

export async function getArkVideoGenerationTask({ taskId }) {
  return requestArk(`/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapArkVideoGenerationState(record = {}) {
  if (record.status === "succeeded") return "completed";
  if (record.status === "failed" || record.status === "expired") return "failed";
  return "processing";
}

export function extractArkVideoGenerationResult(record = {}) {
  return {
    resultUrl: record?.content?.video_url || record?.content?.url || "",
    thumbnailUrl: record?.content?.last_frame_url || record?.content?.thumbnail_url || "",
    errorMessage: record?.error ? normalizeArkVideoErrorMessage(record) : ""
  };
}

export function buildReferenceImage(url) {
  return {
    type: "image_url",
    role: "reference_image",
    image_url: { url }
  };
}

export function buildReferenceVideo(url) {
  return {
    type: "video_url",
    role: "reference_video",
    video_url: { url }
  };
}

export function buildReferenceAudio(url) {
  return {
    type: "audio_url",
    role: "reference_audio",
    audio_url: { url }
  };
}
