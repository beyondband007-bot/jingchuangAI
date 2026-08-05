import { config } from "../../config/index.js";

function ensureKey() {
  if (!config.minimax.apiKey) {
    const error = new Error("MINIMAX_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function normalizeBaseUrl() {
  return (config.minimax.baseUrl || "https://api.minimaxi.com").replace(/\/$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanMinimaxMessage(message, status) {
  const text = String(message || "");
  if (/<html|<\/html>|nginx|Gateway Time-out|504/i.test(text) || status === 504) {
    return "MiniMax 服务暂时超时，请稍后重试";
  }
  if (status === 502 || status === 503) {
    return "MiniMax 服务暂时不可用，请稍后重试";
  }
  return text || `Minimax request failed with ${status}`;
}

async function requestMinimaxOnce(path, options = {}) {
  ensureKey();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${normalizeBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.minimax.apiKey}`,
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
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

  const minimaxStatusCode = body?.base_resp?.status_code;
  if (!response.ok || (typeof minimaxStatusCode === "number" && minimaxStatusCode !== 0)) {
    const rawMessage =
      body?.base_resp?.status_msg ||
      body?.message ||
      body?.error?.message ||
      (typeof body?.error === "string" ? body.error : "") ||
      body?.raw ||
      `Minimax request failed with ${response.status}`;
    const isRateLimited = response.status === 429 || /rate limit|rpm|too many requests/i.test(String(rawMessage));
    const isInsufficientBalance = /insufficient balance|balance insufficient|insufficient quota|quota/i.test(
      String(rawMessage)
    );
    const error = new Error(
      isRateLimited
        ? "MiniMax 请求过于频繁，请等待 60 秒后重试"
        : isInsufficientBalance
          ? "MiniMax 账户余额不足，请充值或更换有额度的 API Key"
          : cleanMinimaxMessage(rawMessage, response.status)
    );
    error.status = isRateLimited ? 429 : isInsufficientBalance ? 402 : response.ok ? 502 : response.status;
    error.body = body;
    error.requestId = body?.request_id || null;
    throw error;
  }

  return body;
}

export async function requestMinimax(path, options = {}) {
  const retries = Number(options.retries ?? 2);
  const retryDelayMs = Number(options.retryDelayMs ?? 1200);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestMinimaxOnce(path, options);
    } catch (error) {
      lastError = error;
      const retryable = [502, 503, 504].includes(Number(error.status));
      if (!retryable || attempt >= retries) break;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}
