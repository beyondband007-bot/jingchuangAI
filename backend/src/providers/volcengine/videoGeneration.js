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

function extractReferenceIndex(body = {}) {
  const param = String(body?.error?.param || body?.param || body?.error?.message || body?.message || "");
  const match = param.match(/content\[(\d+)\]/i);
  const contentIndex = Number(match?.[1]);
  return Number.isInteger(contentIndex) && contentIndex > 0 ? contentIndex : null;
}

export function normalizeArkVideoErrorDetail(body = {}) {
  const code = String(body?.error?.code || body?.code || "");
  const message = String(body?.error?.message || body?.message || body?.error || "");
  const requestId = body?.request_id || body?.RequestId || extractArkRequestId(message);
  const suffix = requestId ? `（RequestId: ${requestId}）` : "";
  const referenceIndex = extractReferenceIndex(body);

  if (/InputImageSensitiveContentDetected\.PrivacyInformation/i.test(code) || /input image may contain real person/i.test(message)) {
    return {
      code: "VIDEO_REFERENCE_PRIVACY_REJECTED",
      message: `素材未通过火山平台隐私内容审核：输入图片可能包含真人或隐私信息。请确认已获得人物授权；若仍被拦截，请更换图片后重试${suffix}`,
      stage: "provider_submit",
      referenceType: "image",
      referenceIndex,
      requestId: requestId || null
    };
  }

  if (/InputVideoSensitiveContentDetected\.PrivacyInformation/i.test(code) || /input video may contain real person/i.test(message)) {
    return {
      code: "VIDEO_REFERENCE_PRIVACY_REJECTED",
      message: `素材未通过火山平台隐私内容审核：输入视频可能包含真人或隐私信息。请确认已获得人物授权；若仍被拦截，请更换视频后重试${suffix}`,
      stage: "provider_submit",
      referenceType: "video",
      referenceIndex,
      requestId: requestId || null
    };
  }

  if (/InputTextSensitiveContentDetected/i.test(code) || /input text 'content\[0\]' may contain sensitive information/i.test(message)) {
    return {
      code: "VIDEO_PROMPT_CONTENT_REJECTED",
      message: `提示词未通过 Seedance 文本安全审核。该错误与参考图片无关，平台未返回具体触发词；请缩短提示词或分段改写后重试${suffix}`,
      stage: "provider_submit",
      referenceType: null,
      referenceIndex: null,
      requestId: requestId || null
    };
  }

  if (/resource download failed/i.test(message) || (/InvalidParameter/i.test(code) && /image_url/i.test(message))) {
    const index = referenceIndex || 1;
    return {
      code: "VIDEO_REFERENCE_DOWNLOAD_FAILED",
      message: `Seedance 无法下载第${index}张参考图，请重新上传素材后重试${suffix}`,
      stage: "provider_submit",
      referenceType: "image",
      referenceIndex: index,
      requestId: requestId || null
    };
  }

  if (/SensitiveContentDetected/i.test(code) || /sensitive content/i.test(message)) {
    const referenceType = /InputVideo/i.test(code)
      ? "video"
      : /InputImage/i.test(code)
        ? "image"
        : null;
    return {
      code: referenceType ? "VIDEO_REFERENCE_CONTENT_REJECTED" : "VIDEO_INPUT_CONTENT_REJECTED",
      message: referenceType
        ? `参考素材未通过火山平台内容安全审核，请更换素材后重试${suffix}`
        : `输入内容未通过火山平台安全审核，平台未返回具体触发项，请简化输入后重试${suffix}`,
      stage: "provider_submit",
      referenceType,
      referenceIndex: referenceType ? referenceIndex : null,
      requestId: requestId || null
    };
  }

  if (/asset .*not found/i.test(message) || /notfound.*asset/i.test(code)) {
    return {
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `火山视频生成接口无法访问该 asset:// 资产，通常是资产库 Project 与视频生成 API Key 命名空间未打通${suffix}`,
      stage: "provider_submit",
      referenceType: null,
      referenceIndex,
      requestId: requestId || null
    };
  }

  if (/copyright/i.test(code) || /copyright restrictions/i.test(message)) {
    return {
      code: "VIDEO_PROMPT_COPYRIGHT_REJECTED",
      message: `AI模型判断提示词可能涉及版权问题，请调整后再上传${suffix}`,
      stage: "provider_submit",
      referenceType: null,
      referenceIndex: null,
      requestId: requestId || null
    };
  }

  return {
    code: "VIDEO_PROVIDER_REQUEST_FAILED",
    message: message || `Ark request failed${suffix}`,
    stage: "provider_submit",
    referenceType: null,
    referenceIndex,
    requestId: requestId || null
  };
}

export function normalizeArkVideoErrorMessage(body = {}) {
  return normalizeArkVideoErrorDetail(body).message;
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
    const detail = normalizeArkVideoErrorDetail(body);
    const error = new Error(detail.message || `Ark request failed with ${response.status}`);
    error.status = response.status;
    error.body = body;
    error.code = detail.code;
    error.videoErrorDetail = detail;
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
  const errorDetail = record?.error ? normalizeArkVideoErrorDetail(record) : null;
  return {
    resultUrl: record?.content?.video_url || record?.content?.url || "",
    thumbnailUrl: record?.content?.last_frame_url || record?.content?.thumbnail_url || "",
    errorMessage: errorDetail?.message || "",
    errorDetail
  };
}

export function buildImageInput(url, role) {
  return {
    type: "image_url",
    role,
    image_url: { url }
  };
}

export function buildFirstFrameImage(url) {
  return buildImageInput(url, "first_frame");
}

export function buildLastFrameImage(url) {
  return buildImageInput(url, "last_frame");
}

export function buildReferenceImage(url) {
  return buildImageInput(url, "reference_image");
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
