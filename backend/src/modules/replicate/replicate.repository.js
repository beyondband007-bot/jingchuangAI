import { getPool } from "../../db/pool.js";

export async function createReplicateTaskRow({
  id,
  userId,
  source,
  fileName,
  prompt,
  description,
  style,
  mood,
  tags,
  model,
  frameCount
}) {
  await getPool().query(
    `INSERT INTO replicate_tasks
     (id, user_id, source, file_name, prompt, description, style, mood, tags, model, frame_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      source,
      fileName,
      prompt || null,
      description || null,
      style || null,
      mood || null,
      tags ? JSON.stringify(tags) : null,
      model || null,
      frameCount || null
    ]
  );
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

