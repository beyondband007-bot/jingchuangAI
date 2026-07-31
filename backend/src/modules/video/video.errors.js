const DEFAULT_ERROR_CODE = "VIDEO_GENERATION_FAILED";

function extractRequestId(message = "") {
  const match = String(message || "").match(/RequestId:\s*([a-zA-Z0-9-]+)|Request id:\s*([a-zA-Z0-9-]+)/i);
  return match?.[1] || match?.[2] || "";
}

function inferErrorCode(message = "") {
  const value = String(message || "");
  if (/InputTextSensitiveContentDetected|input text 'content\[0\]' may contain sensitive information|文本安全审核/i.test(value)) {
    return "VIDEO_PROMPT_CONTENT_REJECTED";
  }
  if (/无法下载第\d+张参考图|resource download failed/i.test(value)) {
    return "VIDEO_REFERENCE_DOWNLOAD_FAILED";
  }
  if (/隐私内容审核|may contain real person/i.test(value)) {
    return "VIDEO_REFERENCE_PRIVACY_REJECTED";
  }
  if (/内容安全审核|sensitive content/i.test(value)) {
    return "VIDEO_REFERENCE_CONTENT_REJECTED";
  }
  if (/上传临时素材服务失败/i.test(value)) {
    return "VIDEO_REFERENCE_UPLOAD_FAILED";
  }
  if (/临时地址不可访问/i.test(value)) {
    return "VIDEO_REFERENCE_URL_UNREACHABLE";
  }
  return DEFAULT_ERROR_CODE;
}

function normalizeReferenceIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) && index > 0 ? index : null;
}

function inferReferenceIndex(message = "") {
  const match = String(message || "").match(/content\[(\d+)\]/i);
  return normalizeReferenceIndex(match?.[1]);
}

export function createVideoTaskError({
  code = DEFAULT_ERROR_CODE,
  message,
  status = 502,
  stage = "provider_submit",
  referenceType,
  referenceIndex,
  requestId,
  cause
}) {
  const error = new Error(message || "视频生成失败", cause ? { cause } : undefined);
  error.status = status;
  error.code = code;
  error.errorDetail = {
    code,
    message: error.message,
    stage,
    referenceType: referenceType || null,
    referenceIndex: normalizeReferenceIndex(referenceIndex),
    requestId: requestId || extractRequestId(error.message) || null
  };
  return error;
}

export function normalizeVideoTaskErrorDetail(value, {
  refunded = false,
  points = 0
} = {}) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && parsed.message) {
        return normalizeVideoTaskErrorDetail(parsed, { refunded, points });
      }
    } catch {
      // Legacy rows store plain error messages.
    }
    const detail = {
      code: inferErrorCode(value),
      message: value,
      stage: "provider_submit",
      referenceType: /image_url|输入图片|参考图/i.test(value) ? "image" : null,
      referenceIndex: inferReferenceIndex(value),
      requestId: extractRequestId(value) || null,
      refunded: Boolean(refunded),
      points: Number(points || 0)
    };
    if (detail.refunded) detail.message = refundedMessage(detail);
    return detail;
  }

  const detail = value.errorDetail || value.videoErrorDetail || value;
  const message = String(detail.message || value.message || "视频生成失败");
  return {
    code: detail.code || value.code || inferErrorCode(message),
    message,
    stage: detail.stage || "provider_submit",
    referenceType: detail.referenceType || null,
    referenceIndex: normalizeReferenceIndex(detail.referenceIndex),
    requestId: detail.requestId || extractRequestId(message) || null,
    refunded: Boolean(detail.refunded ?? refunded),
    points: Number(detail.points ?? points ?? 0)
  };
}

function refundedMessage(detail) {
  const pointsText = detail.points > 0 ? `${detail.points}积分已退回` : "积分已退回";
  const index = detail.referenceIndex || 1;

  if (detail.code === "VIDEO_REFERENCE_DOWNLOAD_FAILED") {
    return `Seedance 无法下载第${index}张参考图，本次生成已停止，${pointsText}。请重新上传素材后重试。`;
  }
  if (detail.code === "VIDEO_REFERENCE_PRIVACY_REJECTED") {
    return `第${index}张参考图未通过平台人物隐私审核。请确认已获得人物授权，或更换参考图后重试。${pointsText}。`;
  }
  if (detail.code === "VIDEO_REFERENCE_CONTENT_REJECTED") {
    return `第${index}张参考图未通过平台内容安全审核，请更换素材后重试。${pointsText}。`;
  }
  if (detail.code === "VIDEO_PROMPT_CONTENT_REJECTED") {
    return `提示词未通过 Seedance 文本安全审核（不是参考图片问题）。平台未返回具体触发词，请缩短提示词或分段改写后重试。${pointsText}。`;
  }
  return detail.message;
}

export function serializeVideoTaskError(value, {
  refunded = false,
  points = 0
} = {}) {
  const detail = normalizeVideoTaskErrorDetail(value, { refunded, points });
  if (!detail) return "";
  if (refunded) {
    detail.refunded = true;
    detail.points = Number(points || detail.points || 0);
    detail.message = refundedMessage(detail);
  }
  return JSON.stringify(detail);
}

export function parseVideoTaskError(value, options = {}) {
  return normalizeVideoTaskErrorDetail(value, options);
}
