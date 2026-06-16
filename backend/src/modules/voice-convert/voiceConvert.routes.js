import { Router } from "express";
import multer from "multer";
import { convertVoice, listVoiceConvertTasks, uploadTargetAudio } from "./voiceConvert.controller.js";

export const voiceConvertRouter = Router();

const targetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const sourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

function uploadTargetSingle(req, res, next) {
  targetUpload.single("audio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "目标音频文件需小于 20MB" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadSourceSingle(req, res, next) {
  sourceUpload.single("sourceAudio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "源音频文件需小于 50MB" : error.message;
    res.status(400).json({ error: message });
  });
}

voiceConvertRouter.post("/uploads/target-audio", uploadTargetSingle, uploadTargetAudio);
voiceConvertRouter.get("/tasks", listVoiceConvertTasks);
voiceConvertRouter.post("/convert", uploadSourceSingle, convertVoice);
