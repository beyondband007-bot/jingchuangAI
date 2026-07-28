import { randomUUID } from "crypto";
import { mkdir, open, rename, rm, stat, unlink } from "fs/promises";
import path from "path";
import { config } from "../config/index.js";
import { createHttpError } from "./http.js";
import { parseProxyTargetUrl } from "./mediaProxy.js";

const DEFAULT_MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_ATTEMPTS = 1;

const videoExtensions = new Map([
  ["video/mp4", ".mp4"],
  ["video/quicktime", ".mov"],
  ["video/webm", ".webm"]
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeContentType(value = "") {
  return String(value).split(";")[0].trim().toLowerCase();
}

function getVideoExtension(contentType, sourceUrl) {
  const normalizedType = normalizeContentType(contentType);
  if (videoExtensions.has(normalizedType)) return videoExtensions.get(normalizedType);

  let extension = "";
  try {
    extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  } catch {
    // URL validation happens before download.
  }
  if ([".mp4", ".mov", ".webm"].includes(extension)) return extension;
  throw createHttpError(
    `Provider video result has unsupported content type: ${normalizedType || "unknown"}`,
    502
  );
}

async function fileExistsWithContent(filePath) {
  try {
    const file = await stat(filePath);
    return file.isFile() && file.size > 0;
  } catch {
    return false;
  }
}

async function streamResponseToFile(response, filePath, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw createHttpError(`Provider video result exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, 502);
  }
  if (!response.body) {
    throw createHttpError("Provider video result response is empty", 502);
  }

  const reader = response.body.getReader();
  const file = await open(filePath, "wx");
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw createHttpError(`Provider video result exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, 502);
      }
      const chunk = Buffer.from(value);
      let offset = 0;
      while (offset < chunk.length) {
        const { bytesWritten } = await file.write(chunk, offset, chunk.length - offset);
        if (!bytesWritten) throw createHttpError("Provider video result could not be written to storage", 502);
        offset += bytesWritten;
      }
    }
    if (!totalBytes) {
      throw createHttpError("Provider video result file is empty", 502);
    }
    await file.sync();
  } finally {
    reader.releaseLock();
    await file.close();
  }
}

async function downloadVideo({
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
        throw createHttpError(`Provider video result download returned ${response.status}`, 502);
      }

      const extension = getVideoExtension(response.headers.get("content-type"), validatedUrl);
      const fileName = `result-${index + 1}${extension}`;
      const filePath = path.join(outputDir, fileName);
      if (await fileExistsWithContent(filePath)) {
        return `${publicDir}/${fileName}`;
      }

      tempPath = path.join(outputDir, `.${fileName}.${randomUUID()}.part`);
      await streamResponseToFile(response, tempPath, maxBytes);
      await rename(tempPath, filePath);
      return `${publicDir}/${fileName}`;
    } catch (error) {
      lastError = error;
      if (tempPath) await unlink(tempPath).catch(() => {});
      if (attempt < attempts) await delay(1000 * attempt);
    }
  }

  throw createHttpError(
    `Provider video result ${index + 1} could not be saved locally for task ${taskId}: ${lastError?.message || "download failed"}`,
    502
  );
}

export async function persistGeneratedVideos({
  taskId,
  urls,
  feature = "videos",
  fetchImpl = fetch,
  storageDir = config.media.storageDir,
  maxBytes = DEFAULT_MAX_VIDEO_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  attempts = DEFAULT_ATTEMPTS
}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!/^\d+$/.test(normalizedTaskId)) {
    throw createHttpError("generated video task id is invalid", 500);
  }
  const sourceUrls = Array.isArray(urls)
    ? urls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];
  if (!sourceUrls.length) {
    throw createHttpError("Provider video result URL is missing", 502);
  }

  const normalizedFeature = String(feature || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedFeature)) {
    throw createHttpError("generated video storage feature is invalid", 500);
  }

  const outputDir = path.resolve(process.cwd(), storageDir, "generated", normalizedFeature, normalizedTaskId);
  const publicDir = `/media/generated/${normalizedFeature}/${normalizedTaskId}`;
  await mkdir(outputDir, { recursive: true });

  return Promise.all(
    sourceUrls.map((sourceUrl, index) =>
      downloadVideo({
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
}

export async function removeStoredGeneratedVideos({
  taskId,
  feature = "videos",
  storageDir = config.media.storageDir
}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!/^\d+$/.test(normalizedTaskId)) return;
  const normalizedFeature = String(feature || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedFeature)) return;
  const outputDir = path.resolve(process.cwd(), storageDir, "generated", normalizedFeature, normalizedTaskId);
  await rm(outputDir, { recursive: true, force: true });
}
