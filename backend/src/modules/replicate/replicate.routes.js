import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createHttpError, sendError } from "../../shared/http.js";
import {
  analyzeImage,
  analyzeVideo,
  getConfig,
  getRecent,
  getTask
} from "./replicate.controller.js";

export const replicateRouter = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const videoUploadDir = path.resolve(process.cwd(), config.media.storageDir, "replicate", "uploads");
mkdirSync(videoUploadDir, { recursive: true });
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, videoUploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(String(file.originalname || "")).toLowerCase().replace(/[^.a-z0-9]/g, "");
      callback(null, `${Date.now()}-${randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

function uploadImageSingle(req, res, next) {
  imageUpload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "图片文件需小于 20MB" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadVideoSingle(req, res, next) {
  videoUpload.single("video")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "视频文件需小于 100MB" : error.message;
    res.status(400).json({ error: message });
  });
}

function requireCredits(req, res, next) {
  try {
    if (req.user?.isGuest) throw createHttpError("积分不够，请充值", 402);
    next();
  } catch (error) {
    sendError(res, error);
  }
}

replicateRouter.get("/config", getConfig);
replicateRouter.get("/recent", getRecent);
replicateRouter.get("/tasks", getRecent);
replicateRouter.get("/tasks/:id", getTask);
replicateRouter.post("/analyze-image", requireCredits, uploadImageSingle, analyzeImage);
replicateRouter.post("/analyze-video", requireCredits, uploadVideoSingle, analyzeVideo);
