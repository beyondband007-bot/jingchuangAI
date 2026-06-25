import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createImageDigitalHumanTask,
  deleteImageDigitalHumanTask,
  getImageDigitalHumanModels,
  getImageDigitalHumanTask,
  getImageDigitalHumanVoices,
  listImageDigitalHumanTasks,
  previewImageDigitalHumanVoice,
  regenerateImageDigitalHumanTask
} from "./imageDigitalHuman.controller.js";

export const imageDigitalHumanRouter = Router();

const portraitDir = path.resolve(process.cwd(), config.media.storageDir, "image-digital-human", "portraits");
const audioDir = path.resolve(process.cwd(), config.media.storageDir, "image-digital-human", "audio");
mkdirSync(portraitDir, { recursive: true });
mkdirSync(audioDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, callback) =>
      callback(null, file.fieldname === "audio" ? audioDir : portraitDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = String(file.mimetype || "");
    if (file.fieldname === "portrait" && !mimeType.startsWith("image/")) {
      callback(new Error("肖像图片格式不支持，请上传图片文件"));
      return;
    }
    if (file.fieldname === "audio" && !mimeType.startsWith("audio/")) {
      callback(new Error("音频格式不支持，请上传音频文件"));
      return;
    }
    callback(null, true);
  }
});

function uploadTaskMedia(req, res, next) {
  upload.fields([
    { name: "portrait", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ])(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "上传文件大小不能超过 20MB" : error.message;
    res.status(400).json({ error: message });
  });
}

imageDigitalHumanRouter.get("/models", getImageDigitalHumanModels);
imageDigitalHumanRouter.get("/voices", getImageDigitalHumanVoices);
imageDigitalHumanRouter.post("/voices/preview", previewImageDigitalHumanVoice);
imageDigitalHumanRouter.get("/tasks", listImageDigitalHumanTasks);
imageDigitalHumanRouter.post("/tasks", uploadTaskMedia, createImageDigitalHumanTask);
imageDigitalHumanRouter.get("/tasks/:id", getImageDigitalHumanTask);
imageDigitalHumanRouter.post("/tasks/:id/regenerate", regenerateImageDigitalHumanTask);
imageDigitalHumanRouter.delete("/tasks/:id", deleteImageDigitalHumanTask);
