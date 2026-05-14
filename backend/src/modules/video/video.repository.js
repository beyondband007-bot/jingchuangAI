import { getPool } from "../../db/pool.js";

export async function findEnabledVideoModels(connection = getPool()) {
  const [models] = await connection.query(
    `SELECT *
     FROM video_model_prices
     WHERE enabled = TRUE
     ORDER BY sort_order ASC, id ASC`
  );
  return models;
}

export async function findVideoModelPrice(connection, modelKey) {
  const [models] = await connection.query(
    "SELECT * FROM video_model_prices WHERE model_key = ? AND enabled = TRUE LIMIT 1",
    [modelKey]
  );
  return models[0] || null;
}

export async function createVideoTask(connection, { userId, modelKey, prompt, ratio, duration, mode, count, costPoints, rmbCost }) {
  const [result] = await connection.query(
    `INSERT INTO video_generation_tasks
     (user_id, model_key, prompt, ratio, duration, mode, video_count, cost_points, rmb_cost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, modelKey, prompt, ratio, duration, mode, count, costPoints, rmbCost]
  );
  return result.insertId;
}

export async function listVideoTaskRows({ userId, filter = "all" } = {}) {
  const params = [userId];
  let where = "t.user_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  } else if (filter === "recent") {
    where += " AND t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
  }

  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name, mp.provider_type
     FROM video_generation_tasks t
     LEFT JOIN video_model_prices mp ON mp.model_key = t.model_key
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findVideoTaskRow(id, userId) {
  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name, mp.provider_type
     FROM video_generation_tasks t
     LEFT JOIN video_model_prices mp ON mp.model_key = t.model_key
     WHERE t.user_id = ? AND t.id = ?
     LIMIT 1`,
    [userId, id]
  );
  return rows[0] || null;
}

export async function findRefreshableVideoTasks() {
  const [rows] = await getPool().query(
    `SELECT t.id
     FROM video_generation_tasks t
     WHERE t.status IN ('pending', 'processing') AND t.provider_task_id IS NOT NULL
     ORDER BY t.updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findVideoTaskStatus(id) {
  const [rows] = await getPool().query(
    `SELECT t.id, t.provider_task_id, t.status, mp.provider_type
     FROM video_generation_tasks t
     LEFT JOIN video_model_prices mp ON mp.model_key = t.model_key
     WHERE t.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function setVideoTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE video_generation_tasks SET status = 'processing', provider_task_id = ? WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setVideoTaskCompleted(id, urls) {
  await getPool().query("UPDATE video_generation_tasks SET status = 'completed', result_urls = ? WHERE id = ?", [
    JSON.stringify(urls),
    id
  ]);
}

export async function setVideoTaskProcessing(id) {
  await getPool().query("UPDATE video_generation_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setVideoTaskError(id, message) {
  await getPool().query("UPDATE video_generation_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockVideoTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM video_generation_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setVideoTaskFailed(connection, id, message) {
  await connection.query("UPDATE video_generation_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markVideoTaskRefunded(connection, id) {
  await connection.query("UPDATE video_generation_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteVideoTask(id, userId) {
  const [result] = await getPool().query(
    `DELETE FROM video_generation_tasks
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleVideoTaskFavorite(id, userId) {
  await getPool().query(
    `UPDATE video_generation_tasks
     SET favorite = NOT favorite
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
}
