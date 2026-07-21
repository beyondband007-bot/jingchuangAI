import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function findEnabledChatModels(connection = getPool()) {
  const [models] = await connection.query(
    `SELECT *
     FROM chat_model_prices
     WHERE enabled = TRUE
     ORDER BY sort_order ASC, id ASC`
  );
  return models;
}

export async function findChatModel(connection, modelKey) {
  const [models] = await connection.query(
    "SELECT * FROM chat_model_prices WHERE model_key = ? AND enabled = TRUE LIMIT 1",
    [modelKey]
  );
  return models[0] || null;
}

export async function ensureUserHasReserveCredits(connection, { userId, reservePoints }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1", [userId]);
  return accounts.length > 0 && Number(accounts[0].balance) >= Number(reservePoints);
}

export async function createChatConversation(connection, { userId, title, modelKey, source = "chat" }) {
  const [result] = await connection.query(
    `INSERT INTO chat_conversations (user_id, source, title, model_key)
     VALUES (?, ?, ?, ?)`,
    [userId, source, title, modelKey]
  );
  return result.insertId;
}

export async function touchChatConversation(connection, id) {
  await connection.query("UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
}

export async function findChatConversation(connection, id) {
  const [rows] = await connection.query(
    `SELECT c.*
     FROM chat_conversations c
     INNER JOIN users u ON u.id = c.user_id
     WHERE u.external_id = ? AND c.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function listChatConversationRows() {
  const [rows] = await getPool().query(
    `SELECT c.*, mp.display_name
     FROM chat_conversations c
     INNER JOIN users u ON u.id = c.user_id
     LEFT JOIN chat_model_prices mp ON mp.model_key = c.model_key
     WHERE u.external_id = ?
       AND COALESCE(c.source, 'chat') <> 'infinite-canvas'
     ORDER BY c.updated_at DESC, c.id DESC
     LIMIT 100`,
    [getCurrentExternalId()]
  );
  return rows;
}

export async function deleteChatConversation(connection, id) {
  const [result] = await connection.query(
    `DELETE c
     FROM chat_conversations c
     INNER JOIN users u ON u.id = c.user_id
     WHERE u.external_id = ? AND c.id = ?`,
    [getCurrentExternalId(), id]
  );
  return result.affectedRows || 0;
}

export async function createChatMessage(connection, {
  conversationId,
  role,
  content,
  attachments = [],
  modelKey = null,
  costPoints = 0,
  kieCreditsConsumed = 0,
  usage = null,
  status = "completed",
  errorMessage = null
}) {
  const [result] = await connection.query(
    `INSERT INTO chat_messages
     (conversation_id, role, content, attachments_json, model_key, cost_points, kie_credits_consumed, usage_json, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversationId,
      role,
      content,
      attachments?.length ? JSON.stringify(attachments) : null,
      modelKey,
      costPoints,
      kieCreditsConsumed,
      usage ? JSON.stringify(usage) : null,
      status,
      errorMessage
    ]
  );
  return result.insertId;
}

export async function updateChatMessage(connection, {
  id,
  content,
  costPoints = 0,
  kieCreditsConsumed = 0,
  usage = null,
  status,
  errorMessage = null
}) {
  await connection.query(
    `UPDATE chat_messages
     SET content = ?, cost_points = ?, kie_credits_consumed = ?,
         usage_json = ?, status = ?, error_message = ?
     WHERE id = ?`,
    [
      content,
      costPoints,
      kieCreditsConsumed,
      usage ? JSON.stringify(usage) : null,
      status,
      errorMessage,
      id
    ]
  );
}

export async function updateChatMessageContent(id, content) {
  await getPool().query(
    "UPDATE chat_messages SET content = ? WHERE id = ? AND status = 'streaming'",
    [content, id]
  );
}

export async function deleteStreamingChatMessage(connection, id) {
  await connection.query(
    "DELETE FROM chat_messages WHERE id = ? AND status = 'streaming'",
    [id]
  );
}

export async function stopOrphanedStreamingChatMessages(createdBefore) {
  const [result] = await getPool().query(
    `UPDATE chat_messages
     SET status = 'stopped', error_message = NULL
     WHERE status = 'streaming' AND created_at < ?`,
    [createdBefore]
  );
  return result.affectedRows || 0;
}

export async function listChatMessageRows(conversationId) {
  const [rows] = await getPool().query(
    `SELECT m.*
     FROM chat_messages m
     INNER JOIN chat_conversations c ON c.id = m.conversation_id
     INNER JOIN users u ON u.id = c.user_id
     WHERE u.external_id = ? AND c.id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
    [getCurrentExternalId(), conversationId]
  );
  return rows;
}

export async function findChatMessageRow(id) {
  const [rows] = await getPool().query("SELECT * FROM chat_messages WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}
