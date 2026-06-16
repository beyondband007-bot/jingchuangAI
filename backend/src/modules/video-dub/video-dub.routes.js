import { Router } from "express";
import multer from "multer";
import { createHttpError, sendError } from "../../shared/http.js";
import {
  getConfig,
  uploadVideo,
  createTask,
  getTask,
  getTasks,
  deleteTask
} from "./video-dub.controller.js";

export const videoDubRouter = Router();

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

function uploadVideoSingle(req, res, next) {
  videoUpload.single("video")(req, res, (error) => {
    if (!error) {
      // Fix multer latin1 -> utf8 filename encoding for CJK characters
      if (req.file && req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      }
      next();
      return;
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "视频文件需小于 2GB"
        : error.message;
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

videoDubRouter.get("/config", getConfig);
videoDubRouter.post("/upload", requireCredits, uploadVideoSingle, uploadVideo);
videoDubRouter.post("/tasks", requireCredits, createTask);
videoDubRouter.get("/tasks", getTasks);
videoDubRouter.get("/tasks/:taskId", getTask);
videoDubRouter.delete("/tasks/:taskId", deleteTask);
