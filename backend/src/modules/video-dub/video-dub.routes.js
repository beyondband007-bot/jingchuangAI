import { Router } from "express";
import multer from "multer";
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
        ? "video file must be 2GB or smaller"
        : error.message;
    res.status(400).json({ error: message });
  });
}

videoDubRouter.get("/config", getConfig);
videoDubRouter.post("/upload", uploadVideoSingle, uploadVideo);
videoDubRouter.post("/tasks", createTask);
videoDubRouter.get("/tasks", getTasks);
videoDubRouter.get("/tasks/:taskId", getTask);
videoDubRouter.delete("/tasks/:taskId", deleteTask);
