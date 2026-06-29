import { config } from "../../config/index.js";

const retryableNetworkCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET"
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRequestError(error) {
  const code = error?.code || error?.cause?.code;
  if (retryableNetworkCodes.has(code)) return true;
  return /fetch failed|network|socket|timeout|ECONNRESET/i.test(String(error?.message || ""));
}

function ensureKey() {
  if (!config.kie.apiKey) {
    const error = new Error("KIE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

export async function requestKie(path, options = {}) {
  ensureKey();
  const headers = {
    Authorization: `Bearer ${config.kie.apiKey}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`${config.kie.baseUrl}${path}`, {
        ...options,
        headers
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt >= 3 || !isRetryableRequestError(error)) {
        const wrapped = new Error(`KIE request failed: ${error.message}`);
        wrapped.status = 502;
        wrapped.cause = error;
        throw wrapped;
      }
      await delay(500 * attempt);
    }
  }
  if (!response) throw lastError;

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok || (body.code && body.code !== 200)) {
    const error = new Error(body.msg || body.error || `request failed with ${response.status}`);
    error.status = response.status || 502;
    error.body = body;
    throw error;
  }

  return body;
}

export async function getKieTask(taskId) {
  return requestKie(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: "GET"
  });
}

export function mapKieState(state) {
  if (state === "success") return "completed";
  if (state === "fail") return "failed";
  return "processing";
}

export function extractResultUrls(record) {
  const json = record?.data?.resultJson;
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed.resultUrls)) return parsed.resultUrls;
    if (Array.isArray(parsed.outputMediaUrls)) return parsed.outputMediaUrls.map((item) => item.mediaUrl).filter(Boolean);
    if (Array.isArray(parsed.urls)) return parsed.urls;
    return [];
  } catch {
    return [];
  }
}
