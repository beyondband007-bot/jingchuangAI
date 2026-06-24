import { formatBeijingClock, formatBeijingHistoryTime } from "../../shared/time.js";
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function fixMojibakeName(value) {
  if (typeof value !== "string" || !/[ÃÂåæäçé]/.test(value)) return value;
  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    return decoded && !decoded.includes("�") ? decoded : value;
  } catch {
    return value;
  }
}

function parseAttachments(value) {
  return parseJson(value, []).map((attachment) => ({
    ...attachment,
    originalName: fixMojibakeName(attachment.originalName)
  }));
}

function formatChatModelName(name) {
  const displayName = name || "";
  if (displayName === "GPT 5.4" || displayName === "Codex5.4" || displayName === "gpt-5.4-codex") return "GPT-5.4-codex";
  if (displayName === "GPT 5.5" || displayName === "Codex5.5" || displayName === "gpt-5.5-codex") return "GPT-5.5-codex";
  return displayName;
}

export function mapChatModel(row) {
  return {
    value: row.model_key,
    label: formatChatModelName(row.display_name),
    provider: row.provider_type || "kie",
    providerModel: row.provider_model,
    pointsPerKieCredit: Number(row.points_per_kie_credit || 4),
    reservePoints: Number(row.reserve_points || 1)
  };
}

export function mapChatConversation(row) {
  return {
    id: row.id,
    title: row.title,
    model: formatChatModelName(row.display_name) || row.model_key,
    modelKey: row.model_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    time: formatBeijingHistoryTime(row.updated_at || row.created_at)
  };
}

export function mapChatMessage(row) {
  const points = Number(row.cost_points || 0);
  const kieCreditsConsumed = Number(row.kie_credits_consumed || 0);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    attachments: parseAttachments(row.attachments_json),
    modelKey: row.model_key || null,
    status: row.status,
    points,
    price: points ? `${points} 积分` : null,
    kieCreditsConsumed,
    usage: parseJson(row.usage_json, null),
    error: row.error_message || null,
    time: formatBeijingClock(row.created_at)
  };
}
