import { createHttpError } from "../../shared/http.js";

export const reasoningEffortOptions = [
  { value: "none", label: "标准" },
  { value: "low", label: "快速" },
  { value: "medium", label: "均衡" },
  { value: "high", label: "深入" }
];

const allowedRoles = new Set(["system", "user", "assistant"]);
const allowedReasoning = new Set(reasoningEffortOptions.map((item) => item.value));

export function validateChatPayload({ model, messages, reasoningEffort = "none" }) {
  if (!model || typeof model !== "string") {
    throw createHttpError("model is required", 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw createHttpError("messages are required", 400);
  }

  if (messages.length > 30) {
    throw createHttpError("too many messages", 400);
  }

  for (const message of messages) {
    if (!allowedRoles.has(message?.role)) {
      throw createHttpError("invalid message role", 400);
    }
    if (typeof message.content !== "string" || !message.content.trim()) {
      throw createHttpError("message content is required", 400);
    }
    if (message.content.length > 12000) {
      throw createHttpError("message content is too long", 400);
    }
  }

  if (!allowedReasoning.has(reasoningEffort)) {
    throw createHttpError("invalid reasoning effort", 400);
  }
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content.trim() : ""
    }))
    .filter((message) => allowedRoles.has(message.role) && message.content);
}
