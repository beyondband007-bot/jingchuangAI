import { config } from "../../config/index.js";

function ensureKey() {
  if (!config.metasoH3.apiKey) {
    const error = new Error("METASO_H3_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function normalizeBaseUrl() {
  return (config.metasoH3.baseUrl || "https://metaso.cn/api/minimax").replace(/\/$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  if ([502, 503, 504].includes(Number(error?.status))) return true;
  return /fetch failed|network|socket|timeout|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(
    String(error?.message || "")
  );
}

function cleanMessage(body, status) {
  const message =
    body?.message ||
    body?.error?.message ||
    (typeof body?.error === "string" ? body.error : "") ||
    body?.base_resp?.status_msg ||
    body?.raw ||
    "";
  if (status === 401) return "METASO H3 API Key 无效或已撤销";
  if (status === 402) return "METASO H3 账户额度不足";
  if (status === 429) return "METASO H3 请求过于频繁，请稍后重试";
  if ([502, 503, 504].includes(status)) return "METASO H3 服务暂时不可用，请稍后重试";
  return String(message || `METASO H3 request failed with ${status}`);
}

async function requestMetasoH3Once(path, options = {}) {
  ensureKey();
  const response = await fetch(`${normalizeBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.metasoH3.apiKey}`,
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

  const providerCode = Number(body?.code ?? body?.base_resp?.status_code);
  if (!response.ok || (Number.isFinite(providerCode) && providerCode !== 0 && providerCode >= 400)) {
    const status = response.ok && Number.isFinite(providerCode) ? providerCode : response.status;
    const error = new Error(cleanMessage(body, status));
    error.status = status;
    error.body = body;
    error.requestId = body?.request_id || body?.requestId || null;
    throw error;
  }
  return body;
}

export async function requestMetasoH3(path, options = {}) {
  const retries = Number(options.retries ?? 2);
  const retryDelayMs = Number(options.retryDelayMs ?? 1200);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestMetasoH3Once(path, options);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= retries) break;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}
