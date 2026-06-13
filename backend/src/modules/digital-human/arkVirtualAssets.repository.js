import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function findArkVirtualAssetGroupByFeature(userId, feature, projectName) {
  const [rows] = await getPool().query(
    "SELECT * FROM ark_virtual_asset_groups WHERE user_id = ? AND feature = ? AND project_name = ? LIMIT 1",
    [userId, feature, projectName]
  );
  return rows[0] || null;
}

export async function createArkVirtualAssetGroupRow({ userId, feature, name, providerGroupId, projectName }) {
  const [result] = await getPool().query(
    `INSERT INTO ark_virtual_asset_groups
     (user_id, feature, name, provider_group_id, project_name, status)
     VALUES (?, ?, ?, ?, ?, 'ready')`,
    [userId, feature, name, providerGroupId, projectName]
  );
  return result.insertId;
}

export async function findArkVirtualAssetGroupById(id) {
  const [rows] = await getPool().query(
    `SELECT g.*
     FROM ark_virtual_asset_groups g
     INNER JOIN users u ON u.id = g.user_id
     WHERE u.external_id = ? AND g.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findReusableArkVirtualAsset({ userId, feature, assetType, sourceHash, projectName }) {
  if (!sourceHash) return null;
  const [rows] = await getPool().query(
    `SELECT a.*, g.provider_group_id, g.project_name
     FROM ark_virtual_assets a
     INNER JOIN ark_virtual_asset_groups g ON g.id = a.group_id
     WHERE a.user_id = ? AND a.feature = ? AND a.asset_type = ? AND a.source_hash = ?
       AND a.status IN ('active','processing') AND g.project_name = ?
     ORDER BY a.status = 'active' DESC, a.id DESC
     LIMIT 1`,
    [userId, feature, assetType, sourceHash, projectName]
  );
  return rows[0] || null;
}

export async function createArkVirtualAssetRow({
  userId,
  groupId,
  feature,
  assetType,
  localUrl,
  publicUrl,
  filePath,
  originalName,
  mimeType,
  sizeBytes,
  sourceHash,
  providerAssetId
}) {
  const assetUri = `asset://${providerAssetId}`;
  const [result] = await getPool().query(
    `INSERT INTO ark_virtual_assets
     (user_id, group_id, feature, asset_type, local_url, public_url, file_path, original_name, mime_type,
      size_bytes, source_hash, provider_asset_id, asset_uri, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
    [
      userId,
      groupId,
      feature,
      assetType,
      localUrl,
      publicUrl,
      filePath,
      originalName,
      mimeType,
      sizeBytes,
      sourceHash,
      providerAssetId,
      assetUri
    ]
  );
  return result.insertId;
}

export async function findArkVirtualAssetById(id) {
  const [rows] = await getPool().query(
    `SELECT a.*, g.provider_group_id, g.project_name
     FROM ark_virtual_assets a
     INNER JOIN ark_virtual_asset_groups g ON g.id = a.group_id
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findArkVirtualAssetByInternalId(id) {
  const [rows] = await getPool().query(
    `SELECT a.*, g.provider_group_id, g.project_name
     FROM ark_virtual_assets a
     INNER JOIN ark_virtual_asset_groups g ON g.id = a.group_id
     WHERE a.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function listArkVirtualAssets({ feature = "digital-human", projectName, limit = 100 } = {}) {
  const [rows] = await getPool().query(
    `SELECT a.*, g.provider_group_id, g.project_name
     FROM ark_virtual_assets a
     INNER JOIN ark_virtual_asset_groups g ON g.id = a.group_id
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.feature = ? AND g.project_name = ?
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ?`,
    [getCurrentExternalId(), feature, projectName, limit]
  );
  return rows;
}

export async function findRefreshableArkVirtualAssets() {
  const [rows] = await getPool().query(
    `SELECT id
     FROM ark_virtual_assets
     WHERE status = 'processing' AND provider_asset_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 20`
  );
  return rows;
}

export async function updateArkVirtualAssetStatus(id, { status, errorMessage = "", publicUrl = "" }) {
  await getPool().query(
    `UPDATE ark_virtual_assets
     SET status = ?, error_message = ?, public_url = COALESCE(NULLIF(?, ''), public_url)
     WHERE id = ?`,
    [status, errorMessage, publicUrl, id]
  );
}
