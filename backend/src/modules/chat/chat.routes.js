import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import { createChatMessage, getChatModels, listChatConversations, listChatMessages, streamChatMessage, uploadChatFile } from "./chat.controller.js";

export const chatRouter = Router();

const uploadDir = path.resolve(process.cwd(), config.media.storageDir, "chat", "uploads");
mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(String(file.mimetype || "").toLowerCase())) {
      callback(new Error("当前仅支持图片、PDF、TXT、DOC、DOCX 附件"));
      return;
    }
    callback(null, true);
  }
});

function uploadSingleChatFile(req, res, next) {
  if (req.user?.isGuest) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  chatUpload.single("file")(req, res, (error) => {
    if (!error) {
      if (req.file?.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      }
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "附件不能超过 20MB" : error.message;
    return res.status(400).json({ error: message });
  });
}

chatRouter.get("/models", getChatModels);
chatRouter.get("/conversations", listChatConversations);
chatRouter.get("/conversations/:id/messages", listChatMessages);
chatRouter.post("/uploads", uploadSingleChatFile, uploadChatFile);
chatRouter.post("/messages", createChatMessage);
chatRouter.post("/messages/stream", streamChatMessage);
