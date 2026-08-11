import { API_BASE } from "../apiBase.js";

// Identical read requests often originate from a page and one of its child
// panels during the same render. Share only in-flight GETs: this removes
// duplicate traffic without introducing stale-data caching semantics.
const inFlightGetRequests = new Map();

const ERROR_TRANSLATIONS = [
  { pattern: /unauthorized|forbidden|please log in|not logged in|not authenticated/i, message: "请先登录" },
  { pattern: /insufficient credits?|credit insufficient|not enough credits?|积分不足/i, message: "积分不够，请充值" },
  { pattern: /network error|failed to fetch|network request failed/i, message: "网络连接失败，请检查网络后重试" },
  { pattern: /timeout|timed out/i, message: "请求超时，请稍后重试" },
  { pattern: /voice clone is already processing/i, message: "该音色正在解析，请稍后再试" },
  { pattern: /source asset id is required|image_url is required|file is required|missing required|required field/i, message: "提交信息不完整，请检查输入后重试" },
  { pattern: /upload failed|upload error|failed to upload/i, message: "上传失败，请稍后重试" },
  { pattern: /task creation failed|failed to create task|create task failed/i, message: "任务创建失败，请稍后重试" },
  { pattern: /invalid file|unsupported format|file too large|exceeds maximum/i, message: "文件格式或大小不支持，请重新选择" },
  { pattern: /server error|internal server error|something went wrong/i, message: "服务器繁忙，请稍后重试" }
];

export function cleanApiErrorMessage(error, fallback = "操作失败，请稍后重试") {
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || "").trim();

  if (/请先登录|unauthorized|forbidden/i.test(message)) return "请先登录";
  if (status === 401 && !message) return "请先登录";
  if (status === 402 || /积分不够|请充值|insufficient/i.test(message)) return "积分不够，请充值";
  if (!message) return fallback;
  if (/^Request failed with \d+/i.test(message)) return fallback;
  if (/Route not found|<!doctype|<html|stack trace|SyntaxError|TypeError/i.test(message)) return fallback;
  if (/^\{[\s\S]*\}$/.test(message)) return fallback;

  for (const rule of ERROR_TRANSLATIONS) {
    if (rule.pattern.test(message)) return rule.message;
  }

  return message;
}

async function performJsonRequest(path, options) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      const error = new Error(cleanApiErrorMessage({ message: text, status: response.status }));
      error.status = response.status;
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(cleanApiErrorMessage({
      message: body.error || body.message || text || `Request failed with ${response.status}`,
      status: response.status
    }));
    error.status = response.status;
    throw error;
  }

  return body;
}

function getRequestKey(path, options) {
  const headers = Object.entries(options.headers || {})
    .map(([key, value]) => [key.toLowerCase(), String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([path, headers]);
}

export function requestJson(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const canDeduplicate =
    method === "GET" &&
    !options.body &&
    !options.signal &&
    !options.cache;

  if (!canDeduplicate) return performJsonRequest(path, options);

  const key = getRequestKey(path, options);
  const existingRequest = inFlightGetRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = performJsonRequest(path, options).finally(() => {
    inFlightGetRequests.delete(key);
  });
  inFlightGetRequests.set(key, request);
  return request;
}
