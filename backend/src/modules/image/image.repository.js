import { getPool } from "../../db/pool.js";
import { config } from "../../config/index.js";

let sourceColumnPromise;
let threadIdColumnPromise;
let referenceImageUrlColumnPromise;
let providerResultUrlsColumnAvailable;

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

async function hasReferenceImageUrlColumn(connection = getPool()) {
  referenceImageUrlColumnPromise ||= connection
    .query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'reference_image_url'`,
      [config.db.database]
    )
    .then(([rows]) => rows.length > 0)
    .catch(() => false);
  return referenceImageUrlColumnPromise;
}

async function hasThreadIdColumn(connection = getPool()) {
  threadIdColumnPromise ||= connection
    .query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'thread_id'`,
      [config.db.database]
    )
    .then(([rows]) => rows.length > 0)
    .catch(() => false);
  return threadIdColumnPromise;
}

async function hasProviderResultUrlsColumn(connection = getPool()) {
  if (providerResultUrlsColumnAvailable === true) return true;
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_generation_tasks' AND COLUMN_NAME = 'provider_result_urls'`,
    [config.db.database]
  );
  providerResultUrlsColumnAvailable = rows.length > 0;
  return providerResultUrlsColumnAvailable;
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

export async function createImageTask(connection, { userId, modelKey, prompt, ratio, quality, count, costPoints, source, threadId, referenceImageUrl }) {
  const supportsSource = source && await hasSourceColumn(connection);
  const supportsThreadId = threadId && await hasThreadIdColumn(connection);
  const supportsReferenceImageUrl = referenceImageUrl && await hasReferenceImageUrlColumn(connection);

  if (supportsSource && supportsThreadId && supportsReferenceImageUrl) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, source, thread_id, reference_image_url, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, source, threadId, referenceImageUrl, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsSource && supportsThreadId) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, source, thread_id, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, source, threadId, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsThreadId && supportsReferenceImageUrl) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, thread_id, reference_image_url, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, threadId, referenceImageUrl, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsThreadId) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, thread_id, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, threadId, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsSource && supportsReferenceImageUrl) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, source, reference_image_url, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, source, referenceImageUrl, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsSource) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, source, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, source, modelKey, prompt, ratio, quality, count, costPoints]
    );
    return result.insertId;
  }

  if (supportsReferenceImageUrl) {
    const [result] = await connection.query(
      `INSERT INTO image_generation_tasks
       (user_id, reference_image_url, model_key, prompt, ratio, quality, image_count, cost_points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, referenceImageUrl, modelKey, prompt, ratio, quality, count, costPoints]
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

export async function assignImageTasksThread(connection, { userId, taskIds, threadId }) {
  if (!threadId || !Array.isArray(taskIds) || taskIds.length === 0 || !(await hasThreadIdColumn(connection))) {
    return;
  }
  const ids = [...new Set(taskIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  await connection.query(
    `UPDATE image_generation_tasks
     SET thread_id = ?
     WHERE user_id = ? AND id IN (${placeholders})`,
    [threadId, userId, ...ids]
  );
}

export async function listImageTaskRows({ userId, filter = "all", source } = {}) {
  const params = [userId];
  let where = "t.user_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  }
  if (await hasSourceColumn()) {
    if (source) {
      where += " AND t.source = ?";
      params.push(source);
    } else {
      where += " AND COALESCE(t.source, 'image') <> 'infinite-canvas'";
    }
  }

  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findImageTaskRow(id, userId) {
  const [rows] = await getPool().query(
    `SELECT t.*, mp.display_name
     FROM image_generation_tasks t
     LEFT JOIN image_model_prices mp ON mp.model_key = t.model_key
     WHERE t.user_id = ? AND t.id = ?
     LIMIT 1`,
    [userId, id]
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
    "SELECT id, user_id, provider_task_id, status FROM image_generation_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setImageTaskProviderTaskId(id, providerTaskId, { modelKey } = {}) {
  if (modelKey) {
    await getPool().query(
      "UPDATE image_generation_tasks SET status = 'processing', provider_task_id = ?, model_key = ? WHERE id = ?",
      [providerTaskId, modelKey, id]
    );
    return;
  }
  await getPool().query("UPDATE image_generation_tasks SET status = 'processing', provider_task_id = ? WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setImageTaskCompleted(id, urls, { providerUrls = [] } = {}) {
  if (await hasProviderResultUrlsColumn()) {
    const [result] = await getPool().query(
      "UPDATE image_generation_tasks SET status = 'completed', result_urls = ?, provider_result_urls = ?, error_message = NULL WHERE id = ? AND status <> 'completed'",
      [JSON.stringify(urls), JSON.stringify(providerUrls), id]
    );
    return result.affectedRows > 0;
  }
  const [result] = await getPool().query(
    "UPDATE image_generation_tasks SET status = 'completed', result_urls = ?, error_message = NULL WHERE id = ? AND status <> 'completed'",
    [JSON.stringify(urls), id]
  );
  return result.affectedRows > 0;
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

export async function deleteImageTask(id, userId) {
  const [result] = await getPool().query(
    `DELETE FROM image_generation_tasks
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleImageTaskFavorite(id, userId) {
  await getPool().query(
    `UPDATE image_generation_tasks
     SET favorite = NOT favorite
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
}

export async function listInspirationFavorites(userId) {
  const [rows] = await getPool().query(
    `SELECT inspiration_id, created_at
     FROM inspiration_favorites
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.inspiration_id,
    createdAt: row.created_at,
  }));
}

export async function findInspirationFavorite(userId, inspirationId) {
  const [rows] = await getPool().query(
    `SELECT id
     FROM inspiration_favorites
     WHERE user_id = ? AND inspiration_id = ?
     LIMIT 1`,
    [userId, inspirationId]
  );
  return rows[0] || null;
}

export async function addInspirationFavorite(userId, inspirationId) {
  await getPool().query(
    `INSERT IGNORE INTO inspiration_favorites (user_id, inspiration_id)
     VALUES (?, ?)`,
    [userId, inspirationId]
  );
}

export async function removeInspirationFavorite(userId, inspirationId) {
  await getPool().query(
    `DELETE FROM inspiration_favorites
     WHERE user_id = ? AND inspiration_id = ?`,
    [userId, inspirationId]
  );
}
