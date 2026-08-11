import { randomUUID } from "crypto";
import { mkdir, rename, rm, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { config } from "../config/index.js";
import { createHttpError } from "./http.js";
import { parseProxyTargetUrl } from "./mediaProxy.js";

const DEFAULT_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
// A failed transfer remains a processing task and is retried by the next task
// refresh. Keep each refresh bounded instead of blocking history APIs with
// several long download attempts in one request.
const DEFAULT_ATTEMPTS = 1;
export const GENERATED_IMAGE_THUMBNAIL = Object.freeze({
  width: 420,
  jpegQuality: 90
});

const imageExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"]
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeContentType(value = "") {
  return String(value).split(";")[0].trim().toLowerCase();
}

function getImageExtension(contentType, sourceUrl) {
  const normalizedType = normalizeContentType(contentType);
  if (imageExtensions.has(normalizedType)) return imageExtensions.get(normalizedType);

  let extension = "";
  try {
    extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  } catch {
    // URL validation happens before download.
  }
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }
  throw createHttpError(`KIE image result has unsupported content type: ${normalizedType || "unknown"}`, 502);
}

async function readResponseBytes(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw createHttpError(`KIE image result exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, 502);
  }
  if (!response.body) {
    throw createHttpError("KIE image result response is empty", 502);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw createHttpError(`KIE image result exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, 502);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  if (!totalBytes) {
    throw createHttpError("KIE image result file is empty", 502);
  }
  return Buffer.concat(chunks, totalBytes);
}

async function fileExistsWithContent(filePath) {
  try {
    const file = await stat(filePath);
    return file.isFile() && file.size > 0;
  } catch {
    return false;
  }
}

async function downloadImage({
  sourceUrl,
  taskId,
  index,
  outputDir,
  publicDir,
  fetchImpl,
  maxBytes,
  timeoutMs,
  attempts
}) {
  const validatedUrl = parseProxyTargetUrl(sourceUrl);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let tempPath = "";
    try {
      const response = await fetchImpl(validatedUrl, {
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        throw createHttpError(`KIE image result download returned ${response.status}`, 502);
      }

      const extension = getImageExtension(response.headers.get("content-type"), validatedUrl);
      const fileName = `result-${index + 1}${extension}`;
      const filePath = path.join(outputDir, fileName);
      if (await fileExistsWithContent(filePath)) {
        return `${publicDir}/${fileName}`;
      }

      const bytes = await readResponseBytes(response, maxBytes);
      tempPath = path.join(outputDir, `.${fileName}.${randomUUID()}.part`);
      await writeFile(tempPath, bytes, { flag: "wx" });
      await rename(tempPath, filePath);
      return `${publicDir}/${fileName}`;
    } catch (error) {
      lastError = error;
      if (tempPath) await unlink(tempPath).catch(() => {});
      if (attempt < attempts) await delay(500 * attempt);
    }
  }

  throw createHttpError(
    `KIE image result ${index + 1} could not be saved locally for task ${taskId}: ${lastError?.message || "download failed"}`,
    502
  );
}

async function createThumbnail({ outputDir, publicDir, originalUrl, index }) {
  const thumbnailName = `thumbnail-${index + 1}.jpg`;
  const thumbnailPath = path.join(outputDir, thumbnailName);
  if (await fileExistsWithContent(thumbnailPath)) {
    return `${publicDir}/${thumbnailName}`;
  }

  const originalName = path.basename(new URL(originalUrl, "http://local").pathname);
  const originalPath = path.join(outputDir, originalName);
  const tempPath = path.join(outputDir, `.${thumbnailName}.${randomUUID()}.jpg`);
  try {
    await sharp(originalPath)
      .resize({ width: GENERATED_IMAGE_THUMBNAIL.width, withoutEnlargement: true })
      .jpeg({ quality: GENERATED_IMAGE_THUMBNAIL.jpegQuality })
      .toFile(tempPath);
    await rename(tempPath, thumbnailPath);
    return `${publicDir}/${thumbnailName}`;
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw createHttpError(`generated image thumbnail ${index + 1} could not be created: ${error.message}`, 502);
  }
}

async function createGeneratedImageThumbnails({
  taskId,
  originalUrls,
  feature = "images",
  storageDir = config.media.storageDir
}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!/^\d+$/.test(normalizedTaskId)) {
    throw createHttpError("generated image task id is invalid", 500);
  }
  const urls = Array.isArray(originalUrls)
    ? originalUrls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];
  if (!urls.length) {
    throw createHttpError("generated image original URL is missing", 500);
  }

  const normalizedFeature = String(feature || "images").replace(/[^a-z0-9-]/gi, "") || "images";
  const outputDir = path.resolve(process.cwd(), storageDir, "generated", normalizedFeature, normalizedTaskId);
  const publicDir = `/media/generated/${normalizedFeature}/${normalizedTaskId}`;
  return Promise.all(
    urls.map((originalUrl, index) =>
      createThumbnail({ outputDir, publicDir, originalUrl, index })
    )
  );
}

export async function persistGeneratedImages({
  taskId,
  urls,
  feature = "images",
  fetchImpl = fetch,
  storageDir = config.media.storageDir,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  attempts = DEFAULT_ATTEMPTS
}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!/^\d+$/.test(normalizedTaskId)) {
    throw createHttpError("generated image task id is invalid", 500);
  }
  const sourceUrls = Array.isArray(urls) ? urls.map((url) => String(url || "").trim()).filter(Boolean) : [];
  if (!sourceUrls.length) {
    throw createHttpError("KIE image result URL is missing", 502);
  }

  const normalizedFeature = String(feature || "images").replace(/[^a-z0-9-]/gi, "") || "images";
  const outputDir = path.resolve(process.cwd(), storageDir, "generated", normalizedFeature, normalizedTaskId);
  const publicDir = `/media/generated/${normalizedFeature}/${normalizedTaskId}`;
  await mkdir(outputDir, { recursive: true });

  const originalUrls = await Promise.all(
    sourceUrls.map((sourceUrl, index) =>
      downloadImage({
        sourceUrl,
        taskId: normalizedTaskId,
        index,
        outputDir,
        publicDir,
        fetchImpl,
        maxBytes,
        timeoutMs,
        attempts
      })
    )
  );
  await createGeneratedImageThumbnails({
    taskId: normalizedTaskId,
    originalUrls,
    feature: normalizedFeature,
    storageDir
  });

  return originalUrls;
}

export async function removeStoredGeneratedImages({
  taskId,
  feature = "images",
  storageDir = config.media.storageDir
}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!/^\d+$/.test(normalizedTaskId)) return;
  const normalizedFeature = String(feature || "images").replace(/[^a-z0-9-]/gi, "") || "images";
  const outputDir = path.resolve(process.cwd(), storageDir, "generated", normalizedFeature, normalizedTaskId);
  await rm(outputDir, { recursive: true, force: true });
}
