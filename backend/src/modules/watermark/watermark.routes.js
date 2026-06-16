import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createWatermarkTask,
  deleteWatermarkTask,
  getWatermarkModels,
  getWatermarkTask,
  listWatermarkTasks,
  toggleWatermarkFavorite,
  uploadWatermarkSource
} from "./watermark.controller.js";

export const watermarkRouter = Router();

const imageDir = path.resolve(process.cwd(), config.media.storageDir, "watermark", "images");
const videoDir = path.resolve(process.cwd(), config.media.storageDir, "watermark", "videos");
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
      callback(new Error("文件类型不支持，请上传图片或视频"));
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
        return res.status(400).json({ error: "图片需小于 10MB" });
      }
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "文件需小于 200MB" : error.message;
    return res.status(400).json({ error: message });
  });
}

watermarkRouter.get("/models", getWatermarkModels);
watermarkRouter.post("/uploads/source", uploadSource, uploadWatermarkSource);
watermarkRouter.get("/tasks", listWatermarkTasks);
watermarkRouter.post("/tasks", createWatermarkTask);
watermarkRouter.get("/tasks/:id", getWatermarkTask);
watermarkRouter.post("/tasks/:id/favorite", toggleWatermarkFavorite);
watermarkRouter.delete("/tasks/:id", deleteWatermarkTask);
