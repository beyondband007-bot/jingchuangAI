import { unlink } from "fs/promises";
import { getPool } from "../../db/pool.js";
import { createDeepSeekChatResponse, createDeepSeekChatStream } from "../../providers/deepseek/chat.js";
import { createKieChatResponse, createKieChatStream } from "../../providers/kie/chat.js";
import { uploadFileToKie } from "../../providers/kie/upload.js";
import { createQwenChatResponse, createQwenChatStream } from "../../providers/qwen/chat.js";
import { debitCredits } from "../../shared/creditService.js";
import { calculateTextPoints } from "../../shared/billingRules.js";
import { createHttpError } from "../../shared/http.js";
import { getUserCredits } from "../../shared/userService.js";
import { mapChatConversation, mapChatMessage, mapChatModel } from "./chat.mapper.js";
import { normalizeMessages, reasoningEffortOptions, validateChatPayload } from "./chat.options.js";
import {
  createChatConversation,
  createChatMessage,
  deleteChatConversation,
  deleteStreamingChatMessage,
  ensureUserHasReserveCredits,
  findChatConversation,
  findChatMessageRow,
  findChatModel,
  findEnabledChatModels,
  listChatConversationRows,
  listChatMessageRows,
  stopOrphanedStreamingChatMessages,
  touchChatConversation,
  updateChatMessage,
  updateChatMessageContent
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

function calculatePoints(_model, _kieCreditsConsumed, text, messages = []) {
  return calculateTextPoints({
    outputChars: String(text || "").length,
    conversationRound: messages.filter((message) => message.role === "user").length
  });
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

async function createProviderChatStream({ model, messages, reasoningEffort, onDelta, signal }) {
  if (model.provider_type === "deepseek") {
    return createDeepSeekChatStream({ model, messages, reasoningEffort, onDelta, signal });
  }
  if (model.provider_type === "qwen") {
    return createQwenChatStream({ model, messages, reasoningEffort, onDelta, signal });
  }
  return createKieChatStream({ model, messages, reasoningEffort, onDelta, signal });
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

export async function deleteConversation(conversationId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const deleted = await deleteChatConversation(connection, conversationId);
    if (!deleted) {
      throw createHttpError("conversation not found", 404);
    }
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  const costPoints = calculatePoints(modelPrice, provider.kieCreditsConsumed, provider.text, messages);
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

async function createStreamingAssistantMessage({ conversationId, model }) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const messageId = await createChatMessage(connection, {
      conversationId,
      role: "assistant",
      content: "",
      modelKey: model,
      status: "streaming"
    });
    await touchChatConversation(connection, conversationId);
    await connection.commit();
    return messageId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function recoverStreamingChatMessages() {
  const configuredStaleAfterMs = Number(process.env.CHAT_STREAM_RECOVERY_STALE_MS);
  const staleAfterMs = Number.isFinite(configuredStaleAfterMs)
    ? Math.max(60_000, configuredStaleAfterMs)
    : 10 * 60 * 1000;
  return stopOrphanedStreamingChatMessages(new Date(Date.now() - staleAfterMs));
}

async function persistAssistantMessage({ messageId, conversationId, modelPrice, provider, userId, messages }) {
  const costPoints = calculatePoints(modelPrice, provider.kieCreditsConsumed, provider.text, messages);
  const chargeConnection = await getPool().getConnection();
  try {
    await chargeConnection.beginTransaction();
    await updateChatMessage(chargeConnection, {
      id: messageId,
      content: provider.text,
      costPoints,
      kieCreditsConsumed: provider.kieCreditsConsumed,
      usage: provider.usage,
      status: "completed"
    });
    await debitCredits(chargeConnection, {
      userId,
      taskId: messageId,
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

  const assistantMessage = await findChatMessageRow(messageId);
  return mapChatMessage(assistantMessage);
}

export async function streamMessage(payload, userId, { onStarted, onDelta, signal }) {
  const prepared = await prepareChatMessage(payload, userId);
  const assistantMessageId = await createStreamingAssistantMessage({
    conversationId: prepared.conversationId,
    model: prepared.model
  });
  await onStarted?.({
    conversationId: prepared.conversationId,
    messageId: assistantMessageId
  });

  let streamedText = "";
  let lastPersistedLength = 0;
  let lastPersistedAt = Date.now();
  let persistenceQueue = Promise.resolve();

  function queuePartialPersistence() {
    const snapshot = streamedText;
    lastPersistedLength = snapshot.length;
    lastPersistedAt = Date.now();
    persistenceQueue = persistenceQueue
      .then(() => updateChatMessageContent(assistantMessageId, snapshot))
      .catch((error) => {
        console.error("Failed to persist partial chat response", error);
      });
  }

  let provider;
  try {
    provider = await createProviderChatStream({
      model: prepared.modelPrice,
      messages: prepared.messages,
      reasoningEffort: prepared.reasoningEffort,
      onDelta: async (delta) => {
        streamedText += delta;
        if (
          streamedText.length - lastPersistedLength >= 500 ||
          Date.now() - lastPersistedAt >= 1000
        ) {
          queuePartialPersistence();
        }
        await onDelta(delta);
      },
      signal
    });
    await persistenceQueue;
  } catch (error) {
    await persistenceQueue;
    const stopped = signal?.aborted || error?.name === "AbortError";
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      if (stopped && !streamedText.trim()) {
        await deleteStreamingChatMessage(connection, assistantMessageId);
      } else {
        const costPoints = stopped
          ? calculatePoints(prepared.modelPrice, 0, streamedText, prepared.messages)
          : 0;
        await updateChatMessage(connection, {
          id: assistantMessageId,
          content: streamedText,
          costPoints,
          status: stopped ? "stopped" : "failed",
          errorMessage: stopped ? null : error.message || "stream failed"
        });
        if (stopped && costPoints > 0) {
          await debitCredits(connection, {
            userId,
            taskId: assistantMessageId,
            amount: costPoints,
            memo: "chat completion debit"
          });
        }
      }
      await touchChatConversation(connection, prepared.conversationId);
      await connection.commit();
    } catch (persistError) {
      await connection.rollback();
      throw persistError;
    } finally {
      connection.release();
    }
    throw error;
  }

  let message;
  try {
    message = await persistAssistantMessage({
      messageId: assistantMessageId,
      conversationId: prepared.conversationId,
      modelPrice: prepared.modelPrice,
      provider,
      userId,
      messages: prepared.messages
    });
  } catch (error) {
    let connection;
    try {
      connection = await getPool().getConnection();
      await connection.beginTransaction();
      await updateChatMessage(connection, {
        id: assistantMessageId,
        content: provider.text || streamedText,
        status: "failed",
        errorMessage: error.message || "failed to persist chat response"
      });
      await touchChatConversation(connection, prepared.conversationId);
      await connection.commit();
    } catch (persistError) {
      if (connection) {
        await connection.rollback().catch(() => {});
      }
      console.error("Failed to mark chat response as failed", persistError);
    } finally {
      connection?.release();
    }
    throw error;
  }

  return {
    conversationId: prepared.conversationId,
    message,
    credits: await getUserCredits(userId)
  };
}
