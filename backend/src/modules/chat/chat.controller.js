import { requireLoggedIn, sendError } from "../../shared/http.js";
import { deleteConversation, getConversationMessages, getModels, listConversations, sendMessage, streamMessage, uploadChatAttachment } from "./chat.service.js";

export async function getChatModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listChatConversations(_req, res) {
  try {
    res.json(await listConversations());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listChatMessages(req, res) {
  try {
    res.json(await getConversationMessages(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteChatConversation(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await deleteConversation(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createChatMessage(req, res) {
  try {
    requireLoggedIn(req.user);
    const result = await sendMessage(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadChatFile(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await uploadChatAttachment({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

function writeStreamEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function streamChatMessage(req, res) {
  if (req.user?.isGuest) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const abortController = new AbortController();
  const abortUpstream = () => {
    if (!res.writableEnded) abortController.abort();
  };
  req.once("aborted", abortUpstream);
  res.once("close", abortUpstream);

  try {
    const result = await streamMessage(req.body, req.user.id, {
      signal: abortController.signal,
      onStarted: async ({ conversationId }) => {
        if (!res.destroyed) writeStreamEvent(res, "started", { conversationId });
      },
      onDelta: async (delta) => {
        if (!res.destroyed) writeStreamEvent(res, "delta", { delta });
      }
    });
    if (!res.destroyed) writeStreamEvent(res, "done", result);
  } catch (error) {
    if (!abortController.signal.aborted && !res.destroyed) {
      writeStreamEvent(res, "error", {
        error: error.message || "stream failed"
      });
    }
  } finally {
    req.removeListener("aborted", abortUpstream);
    res.removeListener("close", abortUpstream);
    if (!res.writableEnded && !res.destroyed) res.end();
  }
}
