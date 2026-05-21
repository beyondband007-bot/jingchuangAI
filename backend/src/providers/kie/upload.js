import { readFile } from "fs/promises";
import { config } from "../../config/index.js";

const uploadCache = new Map();

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
    body?.data?.downloadUrl ||
    body?.data?.download_url ||
    body?.data?.fileUrl ||
    body?.data?.file_url ||
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
    const error = new Error(body?.msg || body?.message || body?.error || `KIE file upload failed with ${response.status}`);
    error.status = response.ok ? 502 : response.status;
    error.body = body;
    throw error;
  }
}

export async function uploadFileToKie({ filePath, fileName, mimeType = "application/octet-stream", uploadPath = "digital-human" }) {
  ensureKieKey();

  const cacheKey = `${filePath}:${uploadPath}:${fileName}:${mimeType}`;
  if (uploadCache.has(cacheKey)) {
    return uploadCache.get(cacheKey);
  }

  const bytes = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: mimeType }), fileName);
  formData.append("uploadPath", uploadPath);
  formData.append("fileName", fileName);

  const response = await fetch(`${normalizeBaseUrl()}/api/file-stream-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.kie.apiKey}`
    },
    body: formData
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
    const error = new Error("KIE file upload response missing URL");
    error.status = 502;
    error.body = body;
    throw error;
  }

  const result = { url, raw: body };
  uploadCache.set(cacheKey, result);
  return result;
}
