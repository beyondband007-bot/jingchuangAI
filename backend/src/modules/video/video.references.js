import path from "path";
import { stat } from "fs/promises";
import { config } from "../../config/index.js";
import {
  createVirtualAssetFromLocalFile,
  createVirtualAssetFromRemoteUrl,
  waitForVirtualAssetReference
} from "../digital-human/arkVirtualAssets.service.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { buildPublicMediaUrl } from "../../shared/publicMedia.js";
import { createVideoTaskError } from "./video.errors.js";

const MEDIA_PREFIX = "/media/video/references/";

export function getLocalMediaFilePath(url, storageDir = config.media.storageDir) {
  const value = String(url || "").trim();
  if (!value.startsWith("/media/")) return "";

  let mediaPath;
  try {
    mediaPath = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/^\/media\/?/, "");
  } catch {
    return "";
  }
  if (!mediaPath || mediaPath.includes("\0") || mediaPath.includes("\\")) return "";

  const storageRoot = path.resolve(process.cwd(), storageDir);
  const filePath = path.resolve(storageRoot, mediaPath);
  const relativePath = path.relative(storageRoot, filePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) return "";
  return filePath;
}

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

function getTrustedAssetFeature(kind) {
  return `video-generation-${kind}`;
}

function getRemoteReferenceFileName(url, kind, referenceIndex) {
  try {
    const fileName = path.basename(new URL(url).pathname);
    if (fileName) return fileName;
  } catch {
    // The caller validates the URL before this fallback is used.
  }
  return `video-reference-${referenceIndex}.${kind === "image" ? "png" : kind === "video" ? "mp4" : "mp3"}`;
}

function assertTrustedAssetReference(reference, { kind, referenceIndex }) {
  if (/^asset:\/\/(?!local-)/i.test(String(reference || "").trim())) return reference;
  throw createVideoTaskError({
    code: "VIDEO_REFERENCE_UPLOAD_FAILED",
    message: `第${referenceIndex}个参考素材未能进入火山可信资产库。视频任务尚未提交，未扣除积分。请稍后重试或重新上传素材。`,
    status: 502,
    stage: "reference_asset",
    referenceType: kind,
    referenceIndex
  });
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
  createLocalAssetImpl = createVirtualAssetFromLocalFile,
  createRemoteAssetImpl = createVirtualAssetFromRemoteUrl,
  waitForAssetReferenceImpl = waitForVirtualAssetReference,
  storageDir = config.media.storageDir
}) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^asset:\/\/(?!local-)/i.test(value)) return value;
  if (/^asset:\/\/local-/i.test(value)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_UPLOAD_FAILED",
      message: `第${referenceIndex}个参考素材只有本地占位地址，未进入火山可信资产库。请重新上传后重试。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_asset",
      referenceType: kind,
      referenceIndex
    });
  }

  const filePath = getVideoReferenceFilePath(value, storageDir);
  try {
    let asset;
    if (filePath) {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile() || fileStat.size <= 0) throw new Error("reference file is empty");
      asset = await createLocalAssetImpl({
        userId,
        feature: getTrustedAssetFeature(kind),
        localUrl: value,
        filePath,
        originalName: path.basename(filePath),
        mimeType: getVideoReferenceMimeType(kind, filePath),
        sizeBytes: fileStat.size
      });
    } else {
      const remoteUrl = /^\/media\//i.test(value) ? buildPublicMediaUrl(value) : value;
      if (!/^https?:\/\//i.test(remoteUrl)) throw new Error("reference URL must be HTTP(S) or uploaded media");
      const originalName = getRemoteReferenceFileName(remoteUrl, kind, referenceIndex);
      asset = await createRemoteAssetImpl({
        userId,
        feature: getTrustedAssetFeature(kind),
        url: remoteUrl,
        originalName,
        mimeType: getVideoReferenceMimeType(kind, originalName),
        sizeBytes: 0
      });
    }

    const reference = await waitForAssetReferenceImpl(asset.id);
    return assertTrustedAssetReference(reference, { kind, referenceIndex });
  } catch (cause) {
    if (cause?.errorDetail) throw cause;
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_UPLOAD_FAILED",
      message: `第${referenceIndex}个参考素材进入火山可信资产库失败，请检查素材和网络后重试。视频任务尚未提交，未扣除积分。`,
      status: 502,
      stage: "reference_asset",
      referenceType: kind,
      referenceIndex,
      cause
    });
  }
}

export async function resolveMinimaxVideoReference({
  userId,
  url,
  kind,
  referenceIndex,
  fetchImpl = globalThis.fetch,
  uploadImpl = uploadFileToKie,
  storageDir = config.media.storageDir
}) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^asset:\/\//i.test(value)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${referenceIndex}个参考素材是火山资产地址，MiniMax H3 无法访问。请重新上传素材后重试。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_preflight",
      referenceType: kind,
      referenceIndex
    });
  }

  const filePath = getLocalMediaFilePath(value, storageDir);
  if (filePath) {
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile() || fileStat.size <= 0) throw new Error("reference file is empty");
      const upload = await uploadImpl({
        filePath,
        fileName: path.basename(filePath),
        mimeType: getVideoReferenceMimeType(kind, filePath),
        uploadPath: `minimax-h3-references/${userId}`
      });
      await assertVideoReferenceUrlAccessible({
        url: upload.url,
        kind,
        referenceIndex,
        fetchImpl
      });
      return upload.url;
    } catch (cause) {
      if (cause?.errorDetail) throw cause;
      throw createVideoTaskError({
        code: "VIDEO_REFERENCE_UPLOAD_FAILED",
        message: `第${referenceIndex}个参考素材上传临时文件服务失败，请检查网络后重试。视频任务尚未提交，未扣除积分。`,
        status: 502,
        stage: "reference_upload",
        referenceType: kind,
        referenceIndex,
        cause
      });
    }
  }

  const publicUrl = /^\/media\//i.test(value) ? buildPublicMediaUrl(value) : value;
  if (!/^https?:\/\//i.test(publicUrl)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${referenceIndex}个参考素材不是 MiniMax H3 可访问的公网地址。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_preflight",
      referenceType: kind,
      referenceIndex
    });
  }
  await assertVideoReferenceUrlAccessible({
    url: publicUrl,
    kind,
    referenceIndex,
    fetchImpl
  });
  return publicUrl;
}

export async function resolveKieVideoReference({
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
  if (/^asset:\/\//i.test(value)) {
    throw createVideoTaskError({
      code: "VIDEO_REFERENCE_URL_UNREACHABLE",
      message: `第${referenceIndex}个参考素材是火山资产地址，当前 KIE 模型无法访问。请重新上传后重试。视频任务尚未提交，未扣除积分。`,
      status: 422,
      stage: "reference_preflight",
      referenceType: kind,
      referenceIndex
    });
  }

  const filePath = getVideoReferenceFilePath(value, storageDir);
  if (!filePath) return /^\/media\//i.test(value) ? buildPublicMediaUrl(value) : value;

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size <= 0) throw new Error("reference file is empty");
    const upload = await uploadImpl({
      filePath,
      fileName: path.basename(filePath),
      mimeType: getVideoReferenceMimeType(kind, filePath),
      uploadPath: `video-references/${userId}`
    });
    await assertVideoReferenceUrlAccessible({
      url: upload.url,
      kind,
      referenceIndex,
      fetchImpl
    });
    return upload.url;
  } catch (cause) {
    if (cause?.errorDetail) throw cause;
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
}
