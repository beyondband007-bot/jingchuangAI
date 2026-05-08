import { sendError } from "../../shared/http.js";
import { getConversationMessages, getModels, listConversations, sendMessage } from "./chat.service.js";

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
    const result = await sendMessage(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
