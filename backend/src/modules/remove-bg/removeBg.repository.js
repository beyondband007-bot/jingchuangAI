import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createRemoveBgAsset(connection, { userId, localUrl, filePath, storedName, originalName, mimeType, sizeBytes }) {
  const [result] = await connection.query(
    `INSERT INTO remove_bg_assets
     (user_id, kind, local_url, file_path, stored_name, original_name, mime_type, size_bytes)
     VALUES (?, 'image', ?, ?, ?, ?, ?, ?)`,
    [userId, localUrl, filePath, storedName, originalName, mimeType, sizeBytes]
  );
  return result.insertId;
}

export async function findRemoveBgAsset(id) {
  const [rows] = await getPool().query(
    `SELECT a.*
     FROM remove_bg_assets a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRemoveBgAssetForUser(id, userId) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM remove_bg_assets
     WHERE user_id = ? AND id = ?
     LIMIT 1`,
    [userId, id]
  );
  return rows[0] || null;
}

export async function setRemoveBgAssetProviderUrl(id, providerUrl) {
  await getPool().query("UPDATE remove_bg_assets SET provider_url = ? WHERE id = ?", [providerUrl, id]);
}

export async function createRemoveBgTask(connection, { userId, sourceAssetId, modelKey, providerModel, costPoints }) {
  const [result] = await connection.query(
    `INSERT INTO remove_bg_tasks
     (user_id, source_asset_id, media_type, model_key, provider_model, cost_points, status)
     VALUES (?, ?, 'image', ?, ?, ?, 'pending')`,
    [userId, sourceAssetId, modelKey, providerModel, costPoints]
  );
  return result.insertId;
}

export async function listRemoveBgTaskRows({ filter = "all" } = {}) {
  const params = [getCurrentExternalId()];
  let where = "u.external_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  }

  const [rows] = await getPool().query(
    `SELECT t.*,
            source.local_url AS source_local_url,
            source.original_name AS source_original_name,
            source.mime_type AS source_mime_type
     FROM remove_bg_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN remove_bg_assets source ON source.id = t.source_asset_id
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findRemoveBgTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*,
            source.local_url AS source_local_url,
            source.original_name AS source_original_name,
            source.mime_type AS source_mime_type
     FROM remove_bg_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN remove_bg_assets source ON source.id = t.source_asset_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableRemoveBgTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM remove_bg_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findRemoveBgTaskStatus(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, status FROM remove_bg_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setRemoveBgTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE remove_bg_tasks SET status = 'processing', provider_task_id = ?, error_message = NULL WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setRemoveBgTaskProcessing(id) {
  await getPool().query("UPDATE remove_bg_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setRemoveBgTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE remove_bg_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setRemoveBgTaskError(id, message) {
  await getPool().query("UPDATE remove_bg_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockRemoveBgTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM remove_bg_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setRemoveBgTaskFailed(connection, id, message) {
  await connection.query("UPDATE remove_bg_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markRemoveBgTaskRefunded(connection, id) {
  await connection.query("UPDATE remove_bg_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteRemoveBgTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM remove_bg_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleRemoveBgTaskFavorite(id) {
  await getPool().query(
    `UPDATE remove_bg_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
}
