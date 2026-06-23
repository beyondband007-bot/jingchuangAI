import { config } from "../config/index.js";
import { createHttpError } from "./http.js";

export function buildPublicMediaUrl(localUrl = "") {
  const path = String(localUrl || "").trim();
  if (/^https?:\/\//i.test(path)) return path;
  if (!config.media.publicBaseUrl) {
    throw createHttpError("PUBLIC_MEDIA_BASE_URL or PUBLIC_BASE_URL is required to expose local media files", 500);
  }

  const mediaPath = path.replace(/^\/?media\/?/, "").replace(/^\/+/, "");
  return `${config.media.publicBaseUrl}/${mediaPath}`;
}
