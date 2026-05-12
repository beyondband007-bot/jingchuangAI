import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createEnhanceTask,
  deleteEnhanceTask,
  getEnhanceModels,
  getEnhanceTask,
  listEnhanceTasks,
  toggleEnhanceFavorite,
  uploadEnhanceSource
} from "./enhance.controller.js";

export const enhanceRouter = Router();

const imageDir = path.resolve(process.cwd(), config.media.storageDir, "enhance", "images");
const videoDir = path.resolve(process.cwd(), config.media.storageDir, "enhance", "videos");
mkdirSync(imageDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

const sourceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, callback) => {
      const mimeType = String(file.mimetype || "");
      callback(null, mimeType.startsWith("video/") ? videoDir : imageDir);
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || "";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mimeType = String(file.mimetype || "");
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      callback(new Error("file has invalid file type"));
      return;
    }
    callback(null, true);
  }
});

function uploadSource(req, res, next) {
  sourceUpload.single("file")(req, res, (error) => {
    if (!error) {
      const mimeType = String(req.file?.mimetype || "");
      if (mimeType.startsWith("image/") && req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "image must be 10MB or smaller" });
      }
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "file must be 200MB or smaller" : error.message;
    return res.status(400).json({ error: message });
  });
}

enhanceRouter.get("/models", getEnhanceModels);
enhanceRouter.post("/uploads/source", uploadSource, uploadEnhanceSource);
enhanceRouter.get("/tasks", listEnhanceTasks);
enhanceRouter.post("/tasks", createEnhanceTask);
enhanceRouter.get("/tasks/:id", getEnhanceTask);
enhanceRouter.post("/tasks/:id/favorite", toggleEnhanceFavorite);
enhanceRouter.delete("/tasks/:id", deleteEnhanceTask);
