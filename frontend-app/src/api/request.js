import { API_BASE } from "../apiBase.js";

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
        throw new Error(text || `Request failed with ${response.status}`);
      }
      return text;
    }
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || text || `Request failed with ${response.status}`);
  }

  return body;
}
