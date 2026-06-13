import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";
import {
  createArkAsset,
  createArkAssetGroup,
  getArkAsset,
  getArkAssetError,
  mapArkAssetStatus
} from "../../providers/volcengine/assets.js";
import { buildPublicMediaUrl } from "../../shared/publicMedia.js";
import { getDemoUser } from "../../shared/userService.js";
import { createHttpError } from "../../shared/http.js";
import {
  createArkVirtualAssetGroupRow,
  createArkVirtualAssetRow,
  findArkVirtualAssetById,
  findArkVirtualAssetByInternalId,
  findArkVirtualAssetGroupByFeature,
  findRefreshableArkVirtualAssets,
  findReusableArkVirtualAsset,
  listArkVirtualAssets,
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

function getGroupName(feature) {
  return `${config.ark.virtualAssetGroupName}-${feature}`;
}

export function mapArkVirtualAsset(row) {
  if (!row) return null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function ensureVirtualAssetGroup({ userId, feature }) {
  const normalizedFeature = normalizeFeature(feature);
  const existing = await findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName);
  if (existing) return existing;

  const name = getGroupName(normalizedFeature);
  const result = await createArkAssetGroup({
    projectName: config.ark.projectName,
    name,
    description: `Jingchuang AI AIGC assets for ${normalizedFeature}`
  });
  const providerGroupId = result.Id || result.id;
  if (!providerGroupId) {
    const error = new Error("CreateAssetGroup response missing group id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  const id = await createArkVirtualAssetGroupRow({
    userId,
    feature: normalizedFeature,
    name,
    providerGroupId,
    projectName: config.ark.projectName
  });
  return findArkVirtualAssetGroupByFeature(userId, normalizedFeature, config.ark.projectName) || { id, provider_group_id: providerGroupId };
}

export async function refreshVirtualAssetByRow(row, { force = false } = {}) {
  if (!row?.provider_asset_id || (!force && row.status !== "processing")) return row;

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

export async function refreshProcessingVirtualAssets() {
  const rows = await findRefreshableArkVirtualAssets();
  await Promise.allSettled(rows.map((row) => refreshVirtualAssetByRow(row)));
}

export async function listVirtualAssets({ feature = "digital-human" } = {}) {
  await refreshProcessingVirtualAssets();
  const rows = await listArkVirtualAssets({ feature: normalizeFeature(feature), projectName: config.ark.projectName });
  return rows.map(mapArkVirtualAsset);
}

export async function createVirtualAssetFromLocalFile({
  userId,
  feature = "digital-human",
  localUrl,
  filePath,
  originalName,
  mimeType,
  sizeBytes
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
    projectName: config.ark.projectName
  });
  if (reusable) return mapArkVirtualAsset(await refreshVirtualAssetByRow(reusable));

  const group = await ensureVirtualAssetGroup({ userId, feature: normalizedFeature });
  const publicUrl = buildPublicMediaUrl(localUrl);
  const result = await createArkAsset({
    projectName: config.ark.projectName,
    groupId: group.provider_group_id,
    url: publicUrl,
    assetType,
    name: originalName || path.basename(filePath)
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
    localUrl,
    publicUrl,
    filePath,
    originalName,
    mimeType,
    sizeBytes,
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

export async function waitForVirtualAssetReference(assetId, options = {}) {
  let row = await findArkVirtualAssetByInternalId(assetId);
  if (!row) throw createHttpError("Ark virtual asset not found", 404);

  row = await refreshVirtualAssetByRow(row, { force: true });
  if (row.status !== "active") {
    const asset = await waitForVirtualAssetActive(assetId, options);
    return asset.assetUri || asset.publicUrl;
  }

  const asset = mapArkVirtualAsset(row);
  const referenceUrl = asset.assetUri || asset.publicUrl;
  if (!referenceUrl) throw createHttpError("Ark virtual asset missing reference URL", 502);
  return referenceUrl;
}
