import { createHttpError } from "./http.js";

function isBlockedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  return false;
}

export function parseProxyTargetUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    throw createHttpError("url is required", 400);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw createHttpError("invalid url", 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw createHttpError("invalid url", 400);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw createHttpError("url host is not allowed", 400);
  }
  return parsed.toString();
}

export async function fetchProxiedMedia(url) {
  const target = parseProxyTargetUrl(url);
  const response = await fetch(target);
  if (!response.ok) {
    throw createHttpError(`upstream request failed with ${response.status}`, 502);
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}
