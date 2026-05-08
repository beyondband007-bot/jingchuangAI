import { Router } from "express";
import { createChatMessage, getChatModels, listChatConversations, listChatMessages } from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.get("/models", getChatModels);
chatRouter.get("/conversations", listChatConversations);
chatRouter.get("/conversations/:id/messages", listChatMessages);
chatRouter.post("/messages", createChatMessage);
