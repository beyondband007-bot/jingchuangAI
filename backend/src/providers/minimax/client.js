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

  const response = await fetch(`${normalizeBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.minimax.apiKey}`,
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

  const minimaxStatusCode = body?.base_resp?.status_code;
  if (!response.ok || (typeof minimaxStatusCode === "number" && minimaxStatusCode !== 0)) {
    const error = new Error(
      body?.base_resp?.status_msg ||
        body?.message ||
        body?.error ||
        `Minimax request failed with ${response.status}`
    );
    error.status = response.ok ? 502 : response.status;
    error.body = body;
    throw error;
  }

  return body;
}
