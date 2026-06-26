import { config } from "../config/index.js";
import { createHttpError } from "./http.js";

function resolvePublicMediaBaseUrl() {
  const localOverride = String(
    process.env.LOCAL_MEDIA_PUBLIC_BASE_URL || process.env.MEDIA_TUNNEL_BASE_URL || ""
  ).replace(/\/+$/, "");
  if (localOverride) return localOverride;
  return String(config.media.publicBaseUrl || "").replace(/\/+$/, "");
}

export function buildPublicMediaUrl(localUrl = "") {
  const path = String(localUrl || "").trim();
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = resolvePublicMediaBaseUrl();
  if (!baseUrl) {
    throw createHttpError("PUBLIC_MEDIA_BASE_URL or PUBLIC_BASE_URL is required to expose local media files", 500);
  }

  const mediaPath = path.replace(/^\/?media\/?/, "").replace(/^\/+/, "");
  return `${baseUrl}/${mediaPath}`;
}

export async function assertPublicMediaUrlAccessible(url, label = "素材") {
  const target = String(url || "").trim();
  if (!target || /^asset:\/\//i.test(target)) return;

  let response;
  try {
    response = await fetch(target, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    throw createHttpError(
      `${label}公网地址无法访问：${target}。本地开发请配置 LOCAL_MEDIA_PUBLIC_BASE_URL 为可访问本机的内网穿透地址（例如 https://xxx.ngrok-free.app/media），或把文件同步到 PUBLIC_MEDIA_BASE_URL 对应服务器。`,
      502
    );
  }

  if (response.ok || response.status === 206) return;

  throw createHttpError(
    `${label}公网地址返回 ${response.status}：${target}。火山引擎无法下载该文件，请检查 LOCAL_MEDIA_PUBLIC_BASE_URL / PUBLIC_MEDIA_BASE_URL 配置。`,
    502
  );
}
