import { unlink } from "fs/promises";
import { getPool } from "../../db/pool.js";
import { createDeepSeekChatResponse, createDeepSeekChatStream } from "../../providers/deepseek/chat.js";
import { createKieChatResponse, createKieChatStream } from "../../providers/kie/chat.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { createQwenChatResponse, createQwenChatStream } from "../../providers/qwen/chat.js";
import { debitCredits } from "../../shared/creditService.js";
import { createHttpError } from "../../shared/http.js";
import { getUserCredits } from "../../shared/userService.js";
import { mapChatConversation, mapChatMessage, mapChatModel } from "./chat.mapper.js";
import { normalizeMessages, reasoningEffortOptions, validateChatPayload } from "./chat.options.js";
import {
  createChatConversation,
  createChatMessage,
  ensureUserHasReserveCredits,
  findChatConversation,
  findChatMessageRow,
  findChatModel,
  findEnabledChatModels,
  listChatConversationRows,
  listChatMessageRows,
  touchChatConversation
} from "./chat.repository.js";

function buildTitle(messages) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage?.content && lastUserMessage?.attachments?.[0]?.originalName) {
    const attachmentTitle = lastUserMessage.attachments[0].originalName;
    return attachmentTitle.length > 32 ? `${attachmentTitle.slice(0, 32)}...` : attachmentTitle;
  }
  const title = lastUserMessage?.content || "新的对话";
  return title.length > 32 ? `${title.slice(0, 32)}...` : title;
}

function calculatePoints(model, kieCreditsConsumed) {
  const credits = Number(kieCreditsConsumed || 0);
  const multiplier = Number(model.points_per_kie_credit || 4);
  return Math.max(1, Math.ceil(credits * multiplier));
}

async function createProviderChatResponse({ model, messages, reasoningEffort }) {
  if (model.provider_type === "deepseek") {
    return createDeepSeekChatResponse({ model, messages, reasoningEffort });
  }
  if (model.provider_type === "qwen") {
    return createQwenChatResponse({ model, messages, reasoningEffort });
  }
  return createKieChatResponse({ model, messages, reasoningEffort });
}

async function createProviderChatStream({ model, messages, reasoningEffort, onDelta }) {
  if (model.provider_type === "deepseek") {
    return createDeepSeekChatStream({ model, messages, reasoningEffort, onDelta });
  }
  if (model.provider_type === "qwen") {
    return createQwenChatStream({ model, messages, reasoningEffort, onDelta });
  }
  return createKieChatStream({ model, messages, reasoningEffort, onDelta });
}

function getAttachmentKind(file) {
  return String(file?.mimetype || "").startsWith("image/") ? "image" : "file";
}

export async function uploadChatAttachment({ file }) {
  if (!file) {
    throw createHttpError("file is required", 400);
  }

  try {
    const upload = await uploadFileToKie({
      filePath: file.path,
      fileName: file.filename || file.originalname || "chat-attachment",
      mimeType: file.mimetype || "application/octet-stream",
      uploadPath: "chat-uploads"
    });

    return {
      id: upload.raw?.data?.fileId || upload.url,
      url: upload.url,
      originalName: file.originalname || file.filename || "attachment",
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size || 0,
      kind: getAttachmentKind(file)
    };
  } finally {
    if (file.path) {
      await unlink(file.path).catch(() => {});
    }
  }
}

export async function getModels() {
  const rows = await findEnabledChatModels();
  return {
    models: rows.map(mapChatModel),
    reasoningEfforts: reasoningEffortOptions,
    defaultModel: rows[0]?.model_key || ""
  };
}

export async function listConversations() {
  const rows = await listChatConversationRows();
  return rows.map(mapChatConversation);
}

export async function getConversationMessages(conversationId) {
  const rows = await listChatMessageRows(conversationId);
  return rows.map(mapChatMessage);
}

export async function sendMessage(payload, userId) {
  const { conversationId = null, model, reasoningEffort = "none" } = payload;
  const messages = normalizeMessages(payload.messages || []);
  validateChatPayload({ model, messages, reasoningEffort });

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    throw createHttpError("a user message is required", 400);
  }

  const pool = getPool();
  const setupConnection = await pool.getConnection();
  let resolvedConversationId = conversationId;
  let modelPrice;

  try {
    await setupConnection.beginTransaction();
    modelPrice = await findChatModel(setupConnection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }

    const hasReserve = await ensureUserHasReserveCredits(setupConnection, {
      userId,
      reservePoints: modelPrice.reserve_points
    });
    if (!hasReserve) {
      throw createHttpError("积分不够，请充值", 402);
    }

    if (resolvedConversationId) {
      const conversation = await findChatConversation(setupConnection, resolvedConversationId);
      if (!conversation) {
        throw createHttpError("conversation not found", 404);
      }
    } else {
      resolvedConversationId = await createChatConversation(setupConnection, {
        userId,
        title: buildTitle(messages),
        modelKey: model
      });
    }

    await createChatMessage(setupConnection, {
      conversationId: resolvedConversationId,
      role: "user",
      content: latestUserMessage.content,
      attachments: latestUserMessage.attachments,
      modelKey: model
    });
    await touchChatConversation(setupConnection, resolvedConversationId);
    await setupConnection.commit();
  } catch (error) {
    await setupConnection.rollback();
    throw error;
  } finally {
    setupConnection.release();
  }

  let provider;
  try {
    provider = await createProviderChatResponse({
      model: modelPrice,
      messages,
      reasoningEffort
    });
  } catch (error) {
    const failConnection = await pool.getConnection();
    try {
      await failConnection.beginTransaction();
      const failedMessageId = await createChatMessage(failConnection, {
        conversationId: resolvedConversationId,
        role: "assistant",
        content: "",
        modelKey: model,
        status: "failed",
        errorMessage: `对话失败：${error.message}`
      });
      await touchChatConversation(failConnection, resolvedConversationId);
      await failConnection.commit();
      const failedMessage = await findChatMessageRow(failedMessageId);
      return {
        conversationId: resolvedConversationId,
        message: mapChatMessage(failedMessage),
        credits: await getUserCredits(userId)
      };
    } catch (innerError) {
      await failConnection.rollback();
      throw innerError;
    } finally {
      failConnection.release();
    }
  }

  const costPoints = calculatePoints(modelPrice, provider.kieCreditsConsumed);
  const chargeConnection = await pool.getConnection();
  let assistantMessageId;
  try {
    await chargeConnection.beginTransaction();
    assistantMessageId = await createChatMessage(chargeConnection, {
      conversationId: resolvedConversationId,
      role: "assistant",
      content: provider.text,
      modelKey: model,
      costPoints,
      kieCreditsConsumed: provider.kieCreditsConsumed,
      usage: provider.usage,
      status: "completed"
    });
    await debitCredits(chargeConnection, {
      userId,
      taskId: assistantMessageId,
      amount: costPoints,
      memo: "chat completion debit"
    });
    await touchChatConversation(chargeConnection, resolvedConversationId);
    await chargeConnection.commit();
  } catch (error) {
    await chargeConnection.rollback();
    throw error;
  } finally {
    chargeConnection.release();
  }

  const assistantMessage = await findChatMessageRow(assistantMessageId);
  return {
    conversationId: resolvedConversationId,
    message: mapChatMessage(assistantMessage),
    credits: await getUserCredits(userId)
  };
}

async function prepareChatMessage(payload, userId) {
  const { conversationId = null, model, reasoningEffort = "none" } = payload;
  const messages = normalizeMessages(payload.messages || []);
  validateChatPayload({ model, messages, reasoningEffort });

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    throw createHttpError("a user message is required", 400);
  }

  const pool = getPool();
  const setupConnection = await pool.getConnection();
  let resolvedConversationId = conversationId;
  let modelPrice;

  try {
    await setupConnection.beginTransaction();
    modelPrice = await findChatModel(setupConnection, model);
    if (!modelPrice) {
      throw createHttpError("model not found", 400);
    }

    const hasReserve = await ensureUserHasReserveCredits(setupConnection, {
      userId,
      reservePoints: modelPrice.reserve_points
    });
    if (!hasReserve) {
      throw createHttpError("积分不够，请充值", 402);
    }

    if (resolvedConversationId) {
      const conversation = await findChatConversation(setupConnection, resolvedConversationId);
      if (!conversation) {
        throw createHttpError("conversation not found", 404);
      }
    } else {
      resolvedConversationId = await createChatConversation(setupConnection, {
        userId,
        title: buildTitle(messages),
        modelKey: model
      });
    }

    await createChatMessage(setupConnection, {
      conversationId: resolvedConversationId,
      role: "user",
      content: latestUserMessage.content,
      attachments: latestUserMessage.attachments,
      modelKey: model
    });
    await touchChatConversation(setupConnection, resolvedConversationId);
    await setupConnection.commit();
  } catch (error) {
    await setupConnection.rollback();
    throw error;
  } finally {
    setupConnection.release();
  }

  return { conversationId: resolvedConversationId, modelPrice, messages, model, reasoningEffort };
}

async function persistAssistantMessage({ conversationId, model, modelPrice, provider, userId }) {
  const costPoints = calculatePoints(modelPrice, provider.kieCreditsConsumed);
  const chargeConnection = await getPool().getConnection();
  let assistantMessageId;
  try {
    await chargeConnection.beginTransaction();
    assistantMessageId = await createChatMessage(chargeConnection, {
      conversationId,
      role: "assistant",
      content: provider.text,
      modelKey: model,
      costPoints,
      kieCreditsConsumed: provider.kieCreditsConsumed,
      usage: provider.usage,
      status: "completed"
    });
    await debitCredits(chargeConnection, {
      userId,
      taskId: assistantMessageId,
      amount: costPoints,
      memo: "chat completion debit"
    });
    await touchChatConversation(chargeConnection, conversationId);
    await chargeConnection.commit();
  } catch (error) {
    await chargeConnection.rollback();
    throw error;
  } finally {
    chargeConnection.release();
  }

  const assistantMessage = await findChatMessageRow(assistantMessageId);
  return mapChatMessage(assistantMessage);
}

export async function streamMessage(payload, userId, { onDelta }) {
  const prepared = await prepareChatMessage(payload, userId);
  const provider = await createProviderChatStream({
    model: prepared.modelPrice,
    messages: prepared.messages,
    reasoningEffort: prepared.reasoningEffort,
    onDelta
  });
  const message = await persistAssistantMessage({
    conversationId: prepared.conversationId,
    model: prepared.model,
    modelPrice: prepared.modelPrice,
    provider,
    userId
  });

  return {
    conversationId: prepared.conversationId,
    message,
    credits: await getUserCredits(userId)
  };
}
