import { getPool } from "../../db/pool.js";
import { config } from "../../config/index.js";
import { DEMO_USER } from "../../shared/userService.js";

let sourceColumnPromise;

async function hasSourceColumn(connection = getPool()) {
  sourceColumnPromise ||= connection
    .query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'source'`,
      [config.db.database]
    )
    .then(([rows]) => rows.length > 0)
    .catch(() => false);
  return sourceColumnPromise;
}

export async function findEnabledImageModels(connection = getPool()) {
  const [models] = await connection.query(
    `SELECT model_key AS value, display_name AS label, base_points AS basePoints
     FROM image_model_prices
     WHERE enabled = TRUE
     ORDER BY id ASC`
  );
  return models;
}

export async function findImageModelPrice(connection, modelKey) {
  const [models] = await connection.query(
    "SELECT model_key, base_points FROM image_model_prices WHERE model_key = ? AND enabled = TRUE LIMIT 1",
    [modelKey]
  );
  return models[0] || null;
}

export async function createImageTask(connection, { userId, modelKey, prompt, ratio, quality, count, costPoints, source }) {
  if (source && await hasSourceColumn(connection)) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, source, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, source, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  const [result] = await connection.query(
    `INSERT INTO image_generation_tasks
     (user_id, model_key, prompt, ratio, quality, image_count, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, modelKey, prompt, ratio, quality, count, costPoints]
  );
  return result.insertId;
}

export async function listImageTaskRows({ filter = "all", source } = {}) {
  const params = [DEMO_USER];
  let where = "u.external_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  }
  if (source && await hasSourceColumn()) {
    where += " AND t.source = ?";
    params.push(source);
  }

  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findImageTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [DEMO_USER, id]
  );
  return rows[0] || null;
}

export async function findRefreshableImageTasks() {
  const [rows] = await getPool().query(
    `SELECT id FROM image_generation_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findImageTaskStatus(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, status FROM image_generation_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setImageTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE image_generation_tasks SET status = 'processing', provider_task_id = ? WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setImageTaskCompleted(id, urls) {
  await getPool().query("UPDATE image_generation_tasks SET status = 'completed', result_urls = ? WHERE id = ?", [
    JSON.stringify(urls),
    id
  ]);
}

export async function setImageTaskProcessing(id) {
  await getPool().query("UPDATE image_generation_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setImageTaskError(id, message) {
  await getPool().query("UPDATE image_generation_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockImageTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM image_generation_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setImageTaskFailed(connection, id, message) {
  await connection.query("UPDATE image_generation_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markImageTaskRefunded(connection, id) {
  await connection.query("UPDATE image_generation_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteImageTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [DEMO_USER, id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleImageTaskFavorite(id) {
  await getPool().query(
    `UPDATE image_generation_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [DEMO_USER, id]
  );
}
