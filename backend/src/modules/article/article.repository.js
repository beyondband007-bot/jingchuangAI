import { getPool } from "../../db/pool.js";

export async function createArticlePackage(connection, {
  userId,
  threadId,
  title,
  body,
  tags,
  imagePromptPlan,
  modelKey,
  ratio,
  quality
}) {
  const [result] = await connection.query(
    `INSERT INTO article_generation_packages
     (user_id, thread_id, title, body, tags_json, image_prompt_plan_json, image_task_ids_json, model_key, ratio, quality, status)
     VALUES (?, ?, ?, ?, ?, ?, JSON_ARRAY(), ?, ?, ?, 'pending')`,
    [
      userId,
      threadId,
      title,
      body,
      JSON.stringify(tags || []),
      JSON.stringify(imagePromptPlan || null),
      modelKey,
      ratio,
      quality
    ]
  );
  return result.insertId;
}

export async function updateArticlePackageTaskIds(connection, id, taskIds) {
  await connection.query(
    "UPDATE article_generation_packages SET image_task_ids_json = ?, status = 'processing' WHERE id = ?",
    [JSON.stringify(taskIds || []), id]
  );
}

export async function updateArticlePackageStatus(id, status) {
  await getPool().query("UPDATE article_generation_packages SET status = ? WHERE id = ?", [status, id]);
}

export async function findArticlePackageRow(id, userId) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM article_generation_packages
     WHERE user_id = ? AND id = ?
     LIMIT 1`,
    [userId, id]
  );
  return rows[0] || null;
}

export async function listArticlePackageRows({ userId, filter = "all" } = {}) {
  let where = "user_id = ?";
  const params = [userId];
  if (filter === "favorite") {
    where += " AND favorite = TRUE";
  }
  const [rows] = await getPool().query(
    `SELECT *
     FROM article_generation_packages
     WHERE ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function deleteArticlePackageRow(id, userId) {
  const [result] = await getPool().query(
    "DELETE FROM article_generation_packages WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleArticlePackageFavorite(id, userId) {
  await getPool().query(
    `UPDATE article_generation_packages
     SET favorite = NOT favorite
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
}
