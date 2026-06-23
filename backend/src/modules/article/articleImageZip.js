import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";

function extractMediaRelativePath(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/media/")) return value.slice("/media/".length);
  try {
    const parsed = new URL(value);
    const marker = "/media/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx >= 0) return parsed.pathname.slice(idx + marker.length);
  } catch {
    return "";
  }
  return "";
}

function extFromUrl(url, fallback = "png") {
  try {
    const pathname = /^https?:\/\//i.test(url) ? new URL(url).pathname : url;
    const ext = path.extname(pathname).slice(1).toLowerCase();
    if (ext && /^[a-z0-9]+$/i.test(ext)) return ext;
  } catch {
    return fallback;
  }
  return fallback;
}

async function readImageAsset(url) {
  const mediaPath = extractMediaRelativePath(url);
  if (mediaPath) {
    const filePath = path.resolve(process.cwd(), config.media.storageDir, mediaPath);
    const buffer = await fs.readFile(filePath);
    return { buffer, ext: extFromUrl(mediaPath) };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw createHttpError(`Failed to download image: ${response.status}`, 502);
  }
  const contentType = response.headers.get("content-type") || "";
  const ext = contentType.split("/")[1]?.split(";")[0] || extFromUrl(url);
  return { buffer: Buffer.from(await response.arrayBuffer()), ext };
}

export function sanitizeZipBaseName(value) {
  const base = String(value || "article-images")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 48);
  return base || "article-images";
}

export async function buildArticleImagesZip(images, { zipName = "article-images" } = {}) {
  const items = (images || []).map((item) => String(item || "").trim()).filter(Boolean);
  if (!items.length) {
    throw createHttpError("No images available for download", 404);
  }

  const zip = new JSZip();
  for (let index = 0; index < items.length; index += 1) {
    const { buffer, ext } = await readImageAsset(items[index]);
    zip.file(`image-${index + 1}.${ext}`, buffer);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return { buffer, fileName: `${sanitizeZipBaseName(zipName)}.zip` };
}
