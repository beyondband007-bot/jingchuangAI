import { createHttpError } from "../../shared/http.js";

export const reasoningEffortOptions = [
  { value: "none", label: "标准" },
  { value: "low", label: "快速" },
  { value: "medium", label: "均衡" },
  { value: "high", label: "深入" }
];

const allowedRoles = new Set(["system", "user", "assistant"]);
const allowedReasoning = new Set(reasoningEffortOptions.map((item) => item.value));
const allowedAttachmentKinds = new Set(["image", "file"]);
const allowedAttachmentMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const maxAttachmentsPerMessage = 5;
const maxAttachmentSize = 20 * 1024 * 1024;

function normalizeAttachment(attachment) {
  const url = typeof attachment?.url === "string" ? attachment.url.trim() : "";
  const originalName = typeof attachment?.originalName === "string" ? attachment.originalName.trim() : "";
  const mimeType = typeof attachment?.mimeType === "string" ? attachment.mimeType.trim().toLowerCase() : "";
  const size = Number(attachment?.size || 0);
  const kind = attachment?.kind === "image" ? "image" : "file";

  return {
    id: typeof attachment?.id === "string" && attachment.id.trim() ? attachment.id.trim() : url,
    url,
    originalName: originalName || "attachment",
    mimeType,
    size: Number.isFinite(size) && size > 0 ? size : 0,
    kind
  };
}

export function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map(normalizeAttachment)
    .filter((attachment) => attachment.url && attachment.mimeType && allowedAttachmentKinds.has(attachment.kind));
}

export function validateChatAttachments(attachments) {
  if (!Array.isArray(attachments)) return;
  if (attachments.length > maxAttachmentsPerMessage) {
    throw createHttpError("最多只能上传 5 个附件", 400);
  }

  for (const attachment of attachments) {
    if (!attachment.url || !/^https?:\/\//i.test(attachment.url)) {
      throw createHttpError("附件地址无效", 400);
    }
    if (!allowedAttachmentKinds.has(attachment.kind)) {
      throw createHttpError("附件类型无效", 400);
    }
    if (!allowedAttachmentMimeTypes.has(attachment.mimeType)) {
      throw createHttpError("当前仅支持图片、PDF、TXT、DOC、DOCX 附件", 400);
    }
    if (attachment.size > maxAttachmentSize) {
      throw createHttpError("附件不能超过 20MB", 400);
    }
  }
}

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
    const attachments = normalizeAttachments(message.attachments);
    if ((typeof message.content !== "string" || !message.content.trim()) && attachments.length === 0) {
      throw createHttpError("message content is required", 400);
    }
    if (typeof message.content === "string" && message.content.length > 12000) {
      throw createHttpError("message content is too long", 400);
    }
    validateChatAttachments(attachments);
  }

  if (!allowedReasoning.has(reasoningEffort)) {
    throw createHttpError("invalid reasoning effort", 400);
  }
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => {
      const attachments = normalizeAttachments(message.attachments);
      return {
        role: message.role,
        content: typeof message.content === "string" ? message.content.trim() : "",
        attachments
      };
    })
    .filter((message) => allowedRoles.has(message.role) && (message.content || message.attachments.length > 0));
}
