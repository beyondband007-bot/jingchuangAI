import crypto, { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import {
  createArkAsset,
  createArkAssetGroup,
  getArkAsset,
  getArkAssetError,
  listArkAssetGroups,
  listArkAssets,
  mapArkAssetStatus
} from "../../providers/volcengine/assets.js";
import { retryArkCreateWithReconciliation } from "../../providers/volcengine/openapi.js";
import { buildPublicMediaUrl, assertPublicMediaUrlAccessible } from "../../shared/publicMedia.js";
import { getDemoUser } from "../../shared/userService.js";
import { createHttpError } from "../../shared/http.js";
import {
  createArkVirtualAssetGroupRow,
  createArkVirtualAssetRow,
  deleteArkVirtualAssetById,
  deleteArkVirtualAssetByIdForUser,
  deleteArkVirtualAssetByInternalId,
  findArkVirtualAssetById,
  findArkVirtualAssetByIdForUser,
  findArkVirtualAssetByInternalId,
  findArkVirtualAssetGroupByFeature,
  findRefreshableArkVirtualAssets,
  findReusableArkVirtualAsset,
  listArkVirtualAssets,
  updateArkVirtualAssetGroupProvider,
  updateArkVirtualAssetMetadata,
  updateArkVirtualAssetStatus
} from "./arkVirtualAssets.repository.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFeature(value = "") {
  const feature = String(value || "").trim();
  return feature || "digital-human";
}

function getAssetTypeFromMime(mimeType = "") {
  if (String(mimeType).startsWith("image/")) return "Image";
  if (String(mimeType).startsWith("video/")) return "Video";
  if (String(mimeType).startsWith("audio/")) return "Audio";
  return "";
}

async function hashFile(filePath) {
  const bytes = await readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function hashText(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function getGroupName(feature) {
  return `${config.ark.virtualAssetGroupName}-${feature}`;
}

function getGroupDescription(userId, feature) {
  return `Facemini virtual assets user:${userId} feature:${feature}`;
}

function getProviderItems(result) {
  return Array.isArray(result?.Items) ? result.Items : Array.isArray(result?.items) ? result.items : [];
}

function getProviderAssetName(sourceHash, originalName = "") {
  const extension = path.extname(String(originalName || "")).toLowerCase().slice(0, 12);
  return `facemini-${String(sourceHash || "").slice(0, 48)}${extension}`;
}

async function findRemoteAssetGroup({ name, description }) {
  const result = await listArkAssetGroups({
    name,
    pageNumber: 1,
    pageSize: 100,
    projectName: config.ark.projectName
  });
  return getProviderItems(result).find(
    (item) =>
      String(item?.Name || item?.name || "") === name &&
      String(item?.Description || item?.description || "") === description &&
      String(item?.ProjectName || item?.project_name || config.ark.projectName) === config.ark.projectName
  );
}

async function createRemoteAssetSafely({ groupId, url, assetType, name }) {
  return retryArkCreateWithReconciliation({
    label: `CreateAsset:${assetType}`,
    findExisting: async () => {
      const result = await listArkAssets({
        groupIds: [groupId],
        pageNumber: 1,
        pageSize: 100,
        projectName: config.ark.projectName
      });
      return getProviderItems(result).find(
        (item) =>
          String(item?.GroupId || item?.group_id || "") === String(groupId) &&
          String(item?.Name || item?.name || "") === name &&
          String(item?.URL || item?.url || "") === url &&
          String(item?.AssetType || item?.asset_type || "") === assetType
      );
    },
    create: () =>
      createArkAsset({
        projectName: config.ark.projectName,
        groupId,
        url,
        assetType,
        name
      })
  });
}

export function isArkOpenApiConfigured() {
  return Boolean(config.ark.accessKeyId && config.ark.secretAccessKey);
}

export function shouldCreateLocalOnlyVirtualAsset(localOnly = false, arkConfigured = isArkOpenApiConfigured()) {
  return Boolean(localOnly) || !arkConfigured;
}

export function isLocalProviderAssetId(providerAssetId = "") {
  return String(providerAssetId || "").startsWith("local-");
}

function isArkDownloadFailure(error) {
  const code = error?.body?.ResponseMetadata?.Error?.Code || "";
  const message = `${error?.message || ""} ${error?.body?.ResponseMetadata?.Error?.Message || ""}`;
  return code === "InvalidParameter.DownloadFailed" || /download.*failed|bad gateway/i.test(message);
}

export function shouldFallbackToLocalVirtualAsset(error) {
  const message = String(error?.message || "");
  return (
    isArkDownloadFailure(error) ||
    /PUBLIC_MEDIA_BASE_URL|PUBLIC_BASE_URL|公网地址|火山引擎无法下载/i.test(
      message
    )
  );
}

export function mapArkVirtualAsset(row) {
  if (!row) return null;
  let metadata = row.metadata_json || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    metadata = {};
  }
  return {
    id: String(row.id),
    groupId: String(row.group_id),
    feature: row.feature,
    assetType: row.asset_type,
    localUrl: row.local_url,
    publicUrl: row.public_url,
    fileName: row.original_name || path.basename(row.file_path || row.local_url || ""),
    mimeType: row.mime_type || "",
    sizeBytes: Number(row.size_bytes || 0),
    providerGroupId: row.provider_group_id || "",
    providerAssetId: row.provider_asset_id || "",
    assetUri: row.asset_uri || (row.provider_asset_id ? `asset://${row.provider_asset_id}` : ""),
    status: row.status,
    error: row.error_message || "",
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function ensureVirtualAssetGroup({ userId, feature }) {
  const normalizedFeature = normalizeFeature(feature);
  const existing = await findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName);
  if (existing && !isLocalProviderAssetId(existing.provider_group_id)) return existing;

  const name = getGroupName(normalizedFeature);
  const description = getGroupDescription(userId, normalizedFeature);
  const result = await retryArkCreateWithReconciliation({
    label: `CreateAssetGroup:${normalizedFeature}`,
    findExisting: () => findRemoteAssetGroup({ name, description }),
    create: () =>
      createArkAssetGroup({
        projectName: config.ark.projectName,
        name,
        description
      })
  });
  const providerGroupId = result.Id || result.id;
  if (!providerGroupId) {
    const error = new Error("CreateAssetGroup response missing group id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  let id = existing?.id;
  if (existing) {
    await updateArkVirtualAssetGroupProvider(existing.id, { name, providerGroupId });
  } else {
    id = await createArkVirtualAssetGroupRow({
      userId,
      feature: normalizedFeature,
      name,
      providerGroupId,
      projectName: config.ark.projectName
    });
  }
  return findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName) || { id, provider_group_id: providerGroupId };
}

export async function refreshVirtualAssetByRow(row, { force = false } = {}) {
  if (!row?.provider_asset_id || (!force && row.status !== "processing")) return row;

  if (!isArkOpenApiConfigured() || isLocalProviderAssetId(row.provider_asset_id)) {
    if (row.status !== "active") {
      await updateArkVirtualAssetStatus(row.id, {
        status: "active",
        publicUrl: row.public_url || buildPublicMediaUrl(row.local_url || "")
      });
    }
    return findArkVirtualAssetByInternalId(row.id);
  }

  const asset = await getArkAsset({ assetId: row.provider_asset_id, projectName: row.project_name || config.ark.projectName });
  const status = mapArkAssetStatus(asset.Status || asset.status);
  const errorMessage = status === "failed" ? getArkAssetError(asset) || "Ark asset processing failed" : "";
  await updateArkVirtualAssetStatus(row.id, {
    status,
    errorMessage,
    publicUrl: asset.URL || asset.Url || asset.url || ""
  });
  return findArkVirtualAssetByInternalId(row.id);
}

export async function refreshVirtualAsset(id) {
  const row = await findArkVirtualAssetById(id);
  if (!row) return null;
  return mapArkVirtualAsset(await refreshVirtualAssetByRow(row));
}

export async function renameVirtualAsset(id, name, userId) {
  const ownedRow = userId
    ? await findArkVirtualAssetByIdForUser(id, userId)
    : await findArkVirtualAssetById(id);
  // Older AI-custom assets were created before account ownership was unified.
  // Their primary key is still stable, so fall back to it for legacy records.
  const row = ownedRow || await findArkVirtualAssetByInternalId(id);
  if (!row) return null;
  let metadata = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  await updateArkVirtualAssetMetadata(row.id, { ...metadata, name });
  const updated = userId
    ? await findArkVirtualAssetByIdForUser(row.id, userId)
    : await findArkVirtualAssetById(row.id);
  return mapArkVirtualAsset(updated || await findArkVirtualAssetByInternalId(row.id));
}

export async function updateVirtualAssetMetadata(id, patch = {}, userId) {
  const ownedRow = userId
    ? await findArkVirtualAssetByIdForUser(id, userId)
    : await findArkVirtualAssetById(id);
  const row = ownedRow || await findArkVirtualAssetByInternalId(id);
  if (!row) return null;
  let metadata = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  await updateArkVirtualAssetMetadata(row.id, { ...metadata, ...patch });
  const updated = userId
    ? await findArkVirtualAssetByIdForUser(row.id, userId)
    : await findArkVirtualAssetById(row.id);
  return mapArkVirtualAsset(updated || await findArkVirtualAssetByInternalId(row.id));
}

export async function deleteVirtualAsset(id, userId) {
  const deleted = userId
    ? await deleteArkVirtualAssetByIdForUser(id, userId)
    : await deleteArkVirtualAssetById(id);
  return deleted || deleteArkVirtualAssetByInternalId(id);
}

export async function refreshProcessingVirtualAssets() {
  const rows = await findRefreshableArkVirtualAssets();
  await Promise.allSettled(rows.map((row) => refreshVirtualAssetByRow(row)));
}

export async function listVirtualAssets({
  feature = "digital-human",
  userId
} = {}) {
  await refreshProcessingVirtualAssets();
  const rows = await listArkVirtualAssets({
    feature: normalizeFeature(feature),
    projectName: config.ark.projectName,
    userId
  });
  return rows.map(mapArkVirtualAsset);
}

async function ensureLocalVirtualAssetGroup({ userId, feature }) {
  const normalizedFeature = normalizeFeature(feature);
  const existing = await findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName);
  if (existing) return existing;

  const providerGroupId = `local-${normalizedFeature}`;
  const id = await createArkVirtualAssetGroupRow({
    userId,
    feature: normalizedFeature,
    name: getGroupName(normalizedFeature),
    providerGroupId,
    projectName: config.ark.projectName
  });
  return (
    (await findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName)) || {
      id,
      provider_group_id: providerGroupId,
      project_name: config.ark.projectName
    }
  );
}

async function createLocalOnlyVirtualAssetFromLocalFile({
  userId,
  feature = "digital-human",
  localUrl,
  filePath,
  originalName,
  mimeType,
  sizeBytes,
  metadata
}) {
  const normalizedFeature = normalizeFeature(feature);
  const assetType = getAssetTypeFromMime(mimeType);
  if (!assetType) throw createHttpError("unsupported asset file type", 400);

  const sourceHash = await hashFile(filePath);
  const reusable = await findReusableArkVirtualAsset({
    userId,
    feature: normalizedFeature,
    assetType,
    sourceHash,
    projectName: config.ark.projectName,
    providerKind: "local"
  });
  if (reusable) {
    await updateArkVirtualAssetMetadata(reusable.id, metadata);
    const refreshed = await refreshVirtualAssetByRow(reusable, { force: true });
    return mapArkVirtualAsset(refreshed);
  }

  const group = await ensureLocalVirtualAssetGroup({ userId, feature: normalizedFeature });
  const publicUrl = buildPublicMediaUrl(localUrl);
  const providerAssetId = `local-${randomUUID()}`;
  const id = await createArkVirtualAssetRow({
    userId,
    groupId: group.id,
    feature: normalizedFeature,
    assetType,
    localUrl,
    publicUrl,
    filePath,
    originalName,
    mimeType,
    sizeBytes,
    sourceHash,
    providerAssetId,
    metadata
  });
  await updateArkVirtualAssetStatus(id, { status: "active", publicUrl });
  return mapArkVirtualAsset(await findArkVirtualAssetByInternalId(id));
}

export async function createVirtualAssetFromLocalFile({
  userId,
  feature = "digital-human",
  localUrl,
  filePath,
  originalName,
  mimeType,
  sizeBytes,
  localOnly = false,
  metadata
}) {
  const normalizedFeature = normalizeFeature(feature);
  const assetType = getAssetTypeFromMime(mimeType);
  if (!assetType) throw createHttpError("unsupported asset file type", 400);

  if (shouldCreateLocalOnlyVirtualAsset(localOnly)) {
    return createLocalOnlyVirtualAssetFromLocalFile({
      userId,
      feature: normalizedFeature,
      localUrl,
      filePath,
      originalName,
      mimeType,
      sizeBytes,
      metadata
    });
  }

  const sourceHash = await hashFile(filePath);
  const reusable = await findReusableArkVirtualAsset({
    userId,
    feature: normalizedFeature,
    assetType,
    sourceHash,
    projectName: config.ark.projectName,
    providerKind: "ark"
  });
  if (reusable) {
    await updateArkVirtualAssetMetadata(reusable.id, metadata);
    return mapArkVirtualAsset(await refreshVirtualAssetByRow(reusable));
  }

  const group = await ensureVirtualAssetGroup({ userId, feature: normalizedFeature });
  let publicUrl = localUrl;
  let result;
  try {
    publicUrl = buildPublicMediaUrl(localUrl);
    await assertPublicMediaUrlAccessible(
      publicUrl,
      assetType === "Video"
        ? "视频"
        : assetType === "Image"
          ? "图片"
          : "素材"
    );
    result = await createRemoteAssetSafely({
      groupId: group.provider_group_id,
      url: publicUrl,
      assetType,
      name: getProviderAssetName(sourceHash, originalName || path.basename(filePath))
    });
  } catch (error) {
    if (!shouldFallbackToLocalVirtualAsset(error)) throw error;
    console.warn(`[ark-assets] Ark could not download ${publicUrl}; saving local-only virtual asset`);
    return createLocalOnlyVirtualAssetFromLocalFile({
      userId,
      feature: normalizedFeature,
      localUrl,
      filePath,
      originalName,
      mimeType,
      sizeBytes,
      metadata
    });
  }
  const providerAssetId = result.Id || result.id;
  if (!providerAssetId) {
    const error = new Error("CreateAsset response missing asset id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  const id = await createArkVirtualAssetRow({
    userId,
    groupId: group.id,
    feature: normalizedFeature,
    assetType,
    localUrl,
    publicUrl,
    filePath,
    originalName,
    mimeType,
    sizeBytes,
    sourceHash,
    providerAssetId,
    metadata
  });

  return mapArkVirtualAsset(await findArkVirtualAssetByInternalId(id));
}

export async function createVirtualAssetFromRemoteUrl({
  userId,
  feature = "digital-human",
  url,
  originalName,
  mimeType,
  sizeBytes = 0
}) {
  if (!isArkOpenApiConfigured()) {
    throw createHttpError("Ark OpenAPI credentials are required for remote virtual assets", 500);
  }

  const normalizedFeature = normalizeFeature(feature);
  const remoteUrl = String(url || "").trim();
  if (!/^https?:\/\//i.test(remoteUrl)) throw createHttpError("remote asset URL must be HTTP(S)", 400);

  const assetType = getAssetTypeFromMime(mimeType);
  if (!assetType) throw createHttpError("unsupported asset file type", 400);

  await assertPublicMediaUrlAccessible(remoteUrl, assetType === "Video" ? "视频" : assetType === "Image" ? "图片" : "素材");

  const sourceHash = hashText(`${normalizedFeature}:${assetType}:${remoteUrl}`);
  const reusable = await findReusableArkVirtualAsset({
    userId,
    feature: normalizedFeature,
    assetType,
    sourceHash,
    projectName: config.ark.projectName,
    providerKind: "ark"
  });
  if (reusable) return mapArkVirtualAsset(await refreshVirtualAssetByRow(reusable));

  const group = await ensureVirtualAssetGroup({ userId, feature: normalizedFeature });
  const result = await createRemoteAssetSafely({
    groupId: group.provider_group_id,
    url: remoteUrl,
    assetType,
    name: getProviderAssetName(
      sourceHash,
      originalName || path.basename(new URL(remoteUrl).pathname) || `${normalizedFeature}-${assetType.toLowerCase()}`
    )
  });
  const providerAssetId = result.Id || result.id;
  if (!providerAssetId) {
    const error = new Error("CreateAsset response missing asset id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  const id = await createArkVirtualAssetRow({
    userId,
    groupId: group.id,
    feature: normalizedFeature,
    assetType,
    localUrl: remoteUrl,
    publicUrl: remoteUrl,
    filePath: remoteUrl,
    originalName: originalName || path.basename(new URL(remoteUrl).pathname) || remoteUrl,
    mimeType,
    sizeBytes: Number(sizeBytes || 0),
    sourceHash,
    providerAssetId
  });

  return mapArkVirtualAsset(await findArkVirtualAssetByInternalId(id));
}

export async function createVirtualAssetForCurrentUser({ feature, localUrl, filePath, originalName, mimeType, sizeBytes }) {
  const user = await getDemoUser();
  return createVirtualAssetFromLocalFile({
    userId: user.id,
    feature,
    localUrl,
    filePath,
    originalName,
    mimeType,
    sizeBytes
  });
}

export async function waitForVirtualAssetActive(assetId, { attempts, intervalMs } = {}) {
  let row = await findArkVirtualAssetByInternalId(assetId);
  if (!row) throw createHttpError("Ark virtual asset not found", 404);

  const maxAttempts = Number(attempts || config.ark.virtualAssetPollAttempts || 18);
  const delay = Number(intervalMs || config.ark.virtualAssetPollIntervalMs || 10000);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    row = await refreshVirtualAssetByRow(row);
    if (row.status === "active") return mapArkVirtualAsset(row);
    if (row.status === "failed") throw createHttpError(row.error_message || "Ark virtual asset failed", 422);
    if (attempt < maxAttempts - 1) await sleep(delay);
  }

  throw createHttpError("Ark virtual asset is still processing; retry after it becomes Active", 202);
}

export async function waitForVirtualAssetUri(assetId, options = {}) {
  const asset = await waitForVirtualAssetActive(assetId, options);
  if (!asset.assetUri) throw createHttpError("Ark virtual asset missing asset URI", 502);
  return asset.assetUri;
}

export function selectVirtualAssetReference(asset) {
  const assetUri = String(asset?.assetUri || "").trim();
  const publicUrl = String(asset?.publicUrl || "").trim();

  // A real Ark asset URI keeps Seedance on the virtual-asset path. Local-only
  // placeholders cannot be resolved by Ark, so they must retain the HTTP URL.
  if (/^asset:\/\/(?!local-)/i.test(assetUri)) return assetUri;
  return publicUrl || assetUri;
}

export async function waitForVirtualAssetReference(assetId, options = {}) {
  let row = await findArkVirtualAssetByInternalId(assetId);
  if (!row) throw createHttpError("Ark virtual asset not found", 404);

  row = await refreshVirtualAssetByRow(row, { force: true });
  if (row.status !== "active") {
    const asset = await waitForVirtualAssetActive(assetId, options);
    const reference = selectVirtualAssetReference(asset);
    if (!reference) throw createHttpError("Ark virtual asset missing reference URL", 502);
    return reference;
  }

  const asset = mapArkVirtualAsset(row);
  if (asset.status === "failed") {
    throw createHttpError(asset.error || "Ark virtual asset failed", 422);
  }
  const reference = selectVirtualAssetReference(asset);
  if (!reference) throw createHttpError("Ark virtual asset missing reference URL", 502);
  return reference;
}
