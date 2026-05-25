import { requireLoggedIn, sendError } from "../../shared/http.js";
import { getConversationMessages, getModels, listConversations, sendMessage, streamMessage } from "./chat.service.js";

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

export async function createChatMessage(req, res) {
  try {
    requireLoggedIn(req.user);
    const result = await sendMessage(req.body, req.user.id);
    res.status(201).json(result);
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

  try {
    const result = await streamMessage(req.body, req.user.id, {
      onDelta: async (delta) => {
        writeStreamEvent(res, "delta", { delta });
      }
    });
    writeStreamEvent(res, "done", result);
  } catch (error) {
    writeStreamEvent(res, "error", {
      error: error.message || "stream failed"
    });
  } finally {
    res.end();
  }
}
