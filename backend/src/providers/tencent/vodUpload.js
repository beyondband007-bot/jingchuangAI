import path from "path";
import { stat } from "fs/promises";
import COS from "cos-nodejs-sdk-v5";
import { config } from "../../config/index.js";
import { createTencentVodClient } from "./vodVideo.js";

const uploadCache = new Map();

function assertUploadResponse(value, field) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Tencent Cloud VOD ApplyUpload response missing ${field}`);
  }
  return value;
}

export function getTencentVodMediaType(filePath = "") {
  const extension = path.extname(String(filePath)).slice(1).toLowerCase();
  if (!extension) throw new Error("Tencent Cloud VOD upload requires a file extension");
  return extension === "jpeg" ? "jpg" : extension;
}

export function buildTencentVodApplyUploadPayload({
  filePath,
  subAppId = config.tencentCloud.vodSubAppId,
  expireHours = config.tencentCloud.vodReferenceExpireHours,
  now = Date.now()
}) {
  const hours = Math.max(1, Number(expireHours) || 24);
  return {
    SubAppId: Number(subAppId),
    MediaType: getTencentVodMediaType(filePath),
    MediaName: path.basename(filePath),
    ExpireTime: new Date(Number(now) + hours * 60 * 60 * 1000).toISOString()
  };
}

function createCosClient(certificate = {}) {
  return new COS({
    SecretId: assertUploadResponse(certificate.SecretId, "TempCertificate.SecretId"),
    SecretKey: assertUploadResponse(certificate.SecretKey, "TempCertificate.SecretKey"),
    SecurityToken: assertUploadResponse(certificate.Token, "TempCertificate.Token")
  });
}

export async function uploadFileToTencentVod({
  filePath,
  subAppId = config.tencentCloud.vodSubAppId,
  expireHours = config.tencentCloud.vodReferenceExpireHours,
  now = Date.now(),
  vodClient,
  cosFactory = createCosClient
}) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile() || fileStat.size <= 0) {
    throw new Error("Tencent Cloud VOD reference file is empty");
  }

  const client = vodClient || createTencentVodClient();
  const applyPayload = buildTencentVodApplyUploadPayload({ filePath, subAppId, expireHours, now });
  const applyResult = await client.ApplyUpload(applyPayload);
  const certificate = assertUploadResponse(applyResult?.TempCertificate, "TempCertificate");
  const bucket = assertUploadResponse(applyResult?.StorageBucket, "StorageBucket");
  const region = assertUploadResponse(applyResult?.StorageRegion, "StorageRegion");
  const key = assertUploadResponse(applyResult?.MediaStoragePath, "MediaStoragePath");
  const sessionKey = assertUploadResponse(applyResult?.VodSessionKey, "VodSessionKey");

  const cosClient = cosFactory(certificate);
  await cosClient.uploadFile({
    Bucket: bucket,
    Region: region,
    Key: key,
    FilePath: filePath
  });

  const commitResult = await client.CommitUpload({
    SubAppId: Number(subAppId),
    VodSessionKey: sessionKey
  });
  const mediaUrl = assertUploadResponse(commitResult?.MediaUrl, "CommitUpload.MediaUrl");
  return {
    url: mediaUrl,
    mediaUrl,
    fileId: commitResult?.FileId || null,
    requestId: commitResult?.RequestId || null,
    expireTime: applyPayload.ExpireTime
  };
}

export async function uploadReferenceToTencentVod(options = {}) {
  const fileStat = await stat(options.filePath);
  const subAppId = Number(options.subAppId || config.tencentCloud.vodSubAppId);
  const expireHours = Math.max(1, Number(options.expireHours || config.tencentCloud.vodReferenceExpireHours) || 24);
  const cacheKey = `${subAppId}:${options.filePath}:${fileStat.size}:${fileStat.mtimeMs}`;
  const now = Number(options.now || Date.now());
  const cached = uploadCache.get(cacheKey);
  if (cached && cached.reuseUntil > now) return cached.promise;

  const promise = uploadFileToTencentVod({ ...options, subAppId, expireHours, now });
  uploadCache.set(cacheKey, {
    promise,
    reuseUntil: now + Math.max(60, expireHours * 60 * 60 - 10 * 60) * 1000
  });
  try {
    return await promise;
  } catch (error) {
    uploadCache.delete(cacheKey);
    throw error;
  }
}

export function clearTencentVodReferenceUploadCache() {
  uploadCache.clear();
}
