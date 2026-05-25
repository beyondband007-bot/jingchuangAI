import { getPool } from "../../db/pool.js";

export async function createReplicateTaskRow({
  id,
  userId,
  source,
  fileName
}) {
  await getPool().query(
    `INSERT INTO replicate_tasks
     (id, user_id, source, file_name, status)
     VALUES (?, ?, ?, ?, 'processing')`,
    [id, userId, source, fileName]
  );
}

export async function completeReplicateTaskRow({
  id,
  prompt,
  description,
  style,
  mood,
  tags,
  model,
  frameCount
}) {
  await getPool().query(
    `UPDATE replicate_tasks
     SET status = 'completed',
         prompt = ?,
         description = ?,
         style = ?,
         mood = ?,
         tags = ?,
         model = ?,
         frame_count = ?,
         error_message = NULL
     WHERE id = ?`,
    [
      prompt || null,
      description || null,
      style || null,
      mood || null,
      tags ? JSON.stringify(tags) : null,
      model || null,
      frameCount || null,
      id
    ]
  );
}

export async function failReplicateTaskRow(id, errorMessage) {
  await getPool().query(
    `UPDATE replicate_tasks
     SET status = 'failed', error_message = ?
     WHERE id = ?`,
    [String(errorMessage || "analysis failed").slice(0, 1000), id]
  );
}

export async function findReplicateTaskRow({ id, userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM replicate_tasks
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [id, userId]
  );
  return rows[0] || null;
}

export async function listReplicateTaskRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM replicate_tasks
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}
