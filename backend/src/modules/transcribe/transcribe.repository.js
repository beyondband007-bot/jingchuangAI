import { getPool } from "../../db/pool.js";

export async function createTranscribeTaskRow({
  id,
  userId,
  fileName,
  mimeType,
  size,
  durationMs,
  text,
  formattedText,
  segments,
  traceId
}) {
  await getPool().query(
    `INSERT INTO transcribe_tasks
     (id, user_id, file_name, mime_type, size_bytes, duration_ms, text, formatted_text, segments, trace_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      fileName,
      mimeType || null,
      size || 0,
      durationMs || 0,
      text,
      formattedText || null,
      segments ? JSON.stringify(segments) : null,
      traceId || null
    ]
  );
}

export async function listTranscribeTaskRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM transcribe_tasks
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

