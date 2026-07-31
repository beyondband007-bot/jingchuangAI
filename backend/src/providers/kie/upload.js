import { readFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { config } from "../../config/index.js";

const uploadCache = new Map();
const uploadCacheTtlMs = 60 * 60 * 1000;
const retryableNetworkCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET"
]);
const uploadMaxAttempts = 3;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableUploadError(error) {
  if (!error) return false;
  const code = error.code || error.cause?.code;
  if (retryableNetworkCodes.has(code)) return true;
  return /fetch failed|network|socket|timeout|ECONNRESET/i.test(String(error.message || ""));
}

async function postUploadFormData(url, { apiKey, formData }) {
  let lastError;
  for (let attempt = 1; attempt <= uploadMaxAttempts; attempt += 1) {
    try {
      return await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      });
    } catch (error) {
      lastError = error;
      if (attempt >= uploadMaxAttempts || !isRetryableUploadError(error)) {
        throw error;
      }
      await delay(500 * attempt);
    }
  }
  throw lastError;
}

function ensureKieKey() {
  if (!config.kie.apiKey) {
    const error = new Error("KIE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function normalizeBaseUrl() {
  return (config.kie.fileUploadBaseUrl || "https://kieai.redpandaai.co").replace(/\/$/, "");
}

function extractUploadedUrl(body) {
  return (
    body?.data?.fileUrl ||
    body?.data?.file_url ||
    body?.data?.url ||
    body?.data?.downloadUrl ||
    body?.data?.download_url ||
    body?.downloadUrl ||
    body?.fileUrl ||
    body?.url ||
    ""
  );
}

function assertUploadSuccess(response, body) {
  const code = body?.code ?? body?.statusCode;
  const isBusinessOk = code === undefined || code === 200 || code === 0;
  if (!response.ok || !isBusinessOk) {
    const error = new Error(body?.msg || body?.message || body?.error || `file upload failed with ${response.status}`);
    error.status = response.ok ? 502 : response.status;
    error.body = body;
    throw error;
  }
}

export async function uploadFileToKie({ filePath, fileName, mimeType = "application/octet-stream", uploadPath = "digital-human" }) {
  ensureKieKey();

  const bytes = await readFile(filePath);
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const extension = path.extname(fileName || filePath).toLowerCase();
  const uploadFileName = `${contentHash}${extension}`;
  const cacheKey = `${contentHash}:${uploadPath}:${mimeType}`;
  const cached = uploadCache.get(cacheKey);
  if (cached?.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }
  uploadCache.delete(cacheKey);

  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: mimeType }), uploadFileName);
  formData.append("uploadPath", uploadPath);
  formData.append("fileName", uploadFileName);

  const response = await postUploadFormData(`${normalizeBaseUrl()}/api/file-stream-upload`, {
    apiKey: config.kie.apiKey,
    formData
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  assertUploadSuccess(response, body);
  const url = extractUploadedUrl(body);
  if (!url) {
    const error = new Error("file upload response missing URL");
    error.status = 502;
    error.body = body;
    throw error;
  }

  const result = { url, raw: body, contentHash, fileName: uploadFileName };
  uploadCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + uploadCacheTtlMs
  });
  return result;
}
