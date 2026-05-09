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

export async function requestMinimax(path, options = {}) {
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
      body?.error ||
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
          : rawMessage
    );
    error.status = isRateLimited ? 429 : isInsufficientBalance ? 402 : response.ok ? 502 : response.status;
    error.body = body;
    throw error;
  }

  return body;
}
