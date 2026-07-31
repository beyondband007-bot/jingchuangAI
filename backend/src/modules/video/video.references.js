import path from "path";
import { stat } from "fs/promises";
import { config } from "../../config/index.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { createVideoTaskError } from "./video.errors.js";

const MEDIA_PREFIX = "/media/video/references/";

export function getVideoReferenceFilePath(url, storageDir = config.media.storageDir) {
  const value = String(url || "").trim();
  if (!value.startsWith(MEDIA_PREFIX)) return "";
  const fileName = path.basename(value.slice(MEDIA_PREFIX.length));
  return path.resolve(process.cwd(), storageDir, "video", "references", fileName);
}

export function getVideoReferenceMimeType(kind, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (kind === "image") {
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    if (extension === ".gif") return "image/gif";
    return "image/jpeg";
  }
  if (kind === "audio") {
    if (extension === ".wav") return "audio/wav";
    if (extension === ".m4a") return "audio/mp4";
    if (extension === ".aac") return "audio/aac";
    if (extension === ".ogg") return "audio/ogg";
    if (extension === ".webm") return "audio/webm";
    if (extension === ".flac") return "audio/flac";
    return "audio/mpeg";
  }
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".avi") return "video/x-msvideo";
  return "video/mp4";
}

function expectedContentType(kind) {
  return kind === "image" ? "image/" : kind === "video" ? "video/" : "audio/";
}

export async function assertVideoReferenceUrlAccessible({
  url,
  kind,
  referenceIndex,
  fetchImpl = globalThis.fetch
}) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(15000)
    });
  } catch (cause) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${referenceIndex}个参考素材的临时地址不可访问，请重新上传或稍后重试。视频任务尚未提交，未扣除积分。`,
      status: 502,
      stage: "reference_preflight",
      referenceType: kind,
      referenceIndex,
      cause
    });
  }

  try {
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const validType = contentType.startsWith(expectedContentType(kind))
      || contentType.startsWith("application/octet-stream");
    if (!response.ok || !validType || contentType.includes("text/html")) {
      throw createVideoTaskError({
        code: "VIDEO_REFERENCE_URL_UNREACHABLE",
        message: `第${referenceIndex}个参考素材的临时地址校验失败，请重新上传或稍后重试。视频任务尚未提交，未扣除积分。`,
        status: 502,
        stage: "reference_preflight",
        referenceType: kind,
        referenceIndex
      });
    }
  } finally {
    await response.body?.cancel().catch(() => {});
  }
}

export async function resolveArkVideoReference({
  userId,
  url,
  kind,
  referenceIndex,
  uploadImpl = uploadFileToKie,
  fetchImpl = globalThis.fetch,
  storageDir = config.media.storageDir
}) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^asset:\/\/(?!local-)/i.test(value)) return value;
  if (/^asset:\/\/local-/i.test(value)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${referenceIndex}个参考素材只有本地占位地址，Seedance 无法访问。请重新上传后重试。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_preflight",
      referenceType: kind,
      referenceIndex
    });
  }

  const filePath = getVideoReferenceFilePath(value, storageDir);
  if (!filePath) return value;

  let fileStat;
  let upload;
  try {
    fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size <= 0) throw new Error("reference file is empty");
    upload = await uploadImpl({
      filePath,
      fileName: path.basename(filePath),
      mimeType: getVideoReferenceMimeType(kind, filePath),
      uploadPath: `video-references/${userId}`
    });
  } catch (cause) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_UPLOAD_FAILED",
      message: `第${referenceIndex}个参考素材上传临时素材服务失败，请检查网络后重试。视频任务尚未提交，未扣除积分。`,
      status: 502,
      stage: "reference_upload",
      referenceType: kind,
      referenceIndex,
      cause
    });
  }

  await assertVideoReferenceUrlAccessible({
    url: upload.url,
    kind,
    referenceIndex,
    fetchImpl
  });
  return upload.url;
}

export async function resolveKieVideoReference(options) {
  const value = String(options?.url || "").trim();
  if (!value) return "";
  if (/^asset:\/\//i.test(value)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${options.referenceIndex}个参考素材是火山资产地址，当前 KIE 模型无法访问。请重新上传后重试。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_preflight",
      referenceType: options.kind,
      referenceIndex: options.referenceIndex
    });
  }
  return resolveArkVideoReference(options);
}
