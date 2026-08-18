import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createEnhanceAsset(connection, { userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes }) {
  const [result] = await connection.query(
    `INSERT INTO enhance_assets
     (user_id, kind, local_url, file_path, stored_name, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes]
  );
  return result.insertId;
}

export async function findEnhanceAsset(id, kind) {
  const params = [getCurrentExternalId(), id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND a.kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT a.*
     FROM enhance_assets a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function findEnhanceAssetForUser(id, userId, kind) {
  const params = [userId, id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT *
     FROM enhance_assets
     WHERE user_id = ? AND id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function setEnhanceAssetProviderUrl(id, providerUrl) {
  await getPool().query("UPDATE enhance_assets SET provider_url = ? WHERE id = ?", [providerUrl, id]);
}

export async function createEnhanceTask(connection, { userId, sourceAssetId, mediaType, modelKey, providerModel, upscaleFactor, costPoints }) {
  const [result] = await connection.query(
    `INSERT INTO enhance_tasks
     (user_id, source_asset_id, media_type, model_key, provider_model, upscale_factor, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, sourceAssetId, mediaType, modelKey, providerModel, upscaleFactor, costPoints]
  );
  return result.insertId;
}

export async function listEnhanceTaskRows({ filter = "all" } = {}) {
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
     FROM enhance_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN enhance_assets source ON source.id = t.source_asset_id
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findEnhanceTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*,
            source.local_url AS source_local_url,
            source.original_name AS source_original_name,
            source.mime_type AS source_mime_type
     FROM enhance_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN enhance_assets source ON source.id = t.source_asset_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableEnhanceTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM enhance_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findTimedOutEnhanceTasks(timeoutMinutes) {
  const [rows] = await getPool().query(
    `SELECT id
     FROM enhance_tasks
     WHERE status IN ('pending', 'processing')
       AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY created_at ASC`,
    [timeoutMinutes]
  );
  return rows;
}

export async function findEnhanceTaskStatus(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, provider_model, status, media_type, created_at FROM enhance_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setEnhanceTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE enhance_tasks SET status = 'processing', provider_task_id = ?, error_message = NULL WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setEnhanceTaskProcessing(id) {
  await getPool().query("UPDATE enhance_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setEnhanceTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE enhance_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setEnhanceTaskError(id, message) {
  await getPool().query("UPDATE enhance_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockEnhanceTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM enhance_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setEnhanceTaskFailed(connection, id, message) {
  await connection.query("UPDATE enhance_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markEnhanceTaskRefunded(connection, id) {
  await connection.query("UPDATE enhance_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteEnhanceTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM enhance_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleEnhanceTaskFavorite(id) {
  await getPool().query(
    `UPDATE enhance_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
}
