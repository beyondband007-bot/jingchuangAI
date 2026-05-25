import { formatBeijingClock } from "../../shared/time.js";
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatChatModelName(name) {
  const displayName = name || "";
  if (displayName === "GPT 5.4") return "Codex5.4";
  if (displayName === "GPT 5.5") return "Codex5.5";
  return displayName;
}

export function mapChatModel(row) {
  return {
    value: row.model_key,
    label: formatChatModelName(row.display_name),
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
    time: formatBeijingClock(row.updated_at || row.created_at)
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
