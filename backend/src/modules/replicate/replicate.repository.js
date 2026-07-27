import { getPool } from "../../db/pool.js";

export async function createReplicateTaskRow({
  id,
  userId,
  source,
  fileName,
  stage = "queued",
  inputDurationSeconds,
  inputSizeBytes
}) {
  await getPool().query(
    `INSERT INTO replicate_tasks
     (id, user_id, source, file_name, status, stage, input_duration_seconds, input_size_bytes)
     VALUES (?, ?, ?, ?, 'processing', ?, ?, ?)`,
    [id, userId, source, fileName, stage, inputDurationSeconds || null, inputSizeBytes || null]
  );
}

export async function updateReplicateTaskProgress(id, updates = {}) {
  const columnMap = {
    stage: "stage",
    provider: "provider",
    model: "model",
    analysisMode: "analysis_mode",
    attemptCount: "attempt_count",
    providerRequestId: "provider_request_id",
    providerStatusCode: "provider_status_code",
    latencyMs: "latency_ms",
    fallbackReason: "fallback_reason",
    qualityWarning: "quality_warning",
    errorCode: "error_code"
  };
  const assignments = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] === undefined) continue;
    assignments.push(`${column} = ?`);
    values.push(updates[key] === "" ? null : updates[key]);
  }
  if (!assignments.length) return;
  values.push(id);
  await getPool().query(
    `UPDATE replicate_tasks SET ${assignments.join(", ")} WHERE id = ?`,
    values
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
  frameCount,
  provider,
  analysisMode,
  attemptCount,
  providerRequestId,
  providerStatusCode,
  latencyMs,
  inputTokens,
  outputTokens,
  fallbackReason,
  qualityWarning,
  analysis
}) {
  const status = qualityWarning ? "completed_with_warning" : "completed";
  await getPool().query(
    `UPDATE replicate_tasks
     SET status = ?,
         stage = 'completed',
         prompt = ?,
         description = ?,
         style = ?,
         mood = ?,
         tags = ?,
         model = ?,
         frame_count = ?,
         provider = ?,
         analysis_mode = ?,
         attempt_count = ?,
         provider_request_id = ?,
         provider_status_code = ?,
         latency_ms = ?,
         input_tokens = ?,
         output_tokens = ?,
         fallback_reason = ?,
         quality_warning = ?,
         analysis_json = ?,
         error_code = NULL,
         error_message = NULL
     WHERE id = ?`,
    [
      status,
      prompt || null,
      description || null,
      style || null,
      mood || null,
      tags ? JSON.stringify(tags) : null,
      model || null,
      frameCount || null,
      provider || null,
      analysisMode || null,
      attemptCount || 0,
      providerRequestId || null,
      providerStatusCode || null,
      latencyMs || null,
      inputTokens || null,
      outputTokens || null,
      fallbackReason || null,
      qualityWarning || null,
      analysis ? JSON.stringify(analysis) : null,
      id
    ]
  );
}

export async function failReplicateTaskRow(id, errorMessage, {
  errorCode,
  stage = "failed",
  provider,
  model,
  analysisMode,
  attemptCount,
  providerStatusCode,
  latencyMs,
  fallbackReason
} = {}) {
  await getPool().query(
    `UPDATE replicate_tasks
     SET status = 'failed',
         stage = ?,
         error_message = ?,
         error_code = ?,
         provider = COALESCE(?, provider),
         model = COALESCE(?, model),
         analysis_mode = COALESCE(?, analysis_mode),
         attempt_count = COALESCE(?, attempt_count),
         provider_status_code = COALESCE(?, provider_status_code),
         latency_ms = COALESCE(?, latency_ms),
         fallback_reason = COALESCE(?, fallback_reason)
     WHERE id = ?`,
    [
      stage,
      String(errorMessage || "analysis failed").slice(0, 1000),
      errorCode || null,
      provider || null,
      model || null,
      analysisMode || null,
      attemptCount ?? null,
      providerStatusCode ?? null,
      latencyMs ?? null,
      fallbackReason || null,
      id
    ]
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
