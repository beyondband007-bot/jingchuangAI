import { API_BASE } from "../apiBase.js";

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

  return message;
}

export async function requestJson(path, options = {}) {
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
      if (!response.ok) {
        const error = new Error(cleanApiErrorMessage({ message: text, status: response.status }));
        error.status = response.status;
        throw error;
      }
      return text;
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
