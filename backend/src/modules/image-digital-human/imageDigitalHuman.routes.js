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
mkdirSync(portraitDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, portraitDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || "").startsWith("image/")) {
      callback(new Error("肖像图片格式不支持，请上传图片文件"));
      return;
    }
    callback(null, true);
  }
});

function uploadPortrait(req, res, next) {
  upload.single("portrait")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "肖像图片需小于 10MB" : error.message;
    res.status(400).json({ error: message });
  });
}

imageDigitalHumanRouter.get("/models", getImageDigitalHumanModels);
imageDigitalHumanRouter.get("/voices", getImageDigitalHumanVoices);
imageDigitalHumanRouter.post("/voices/preview", previewImageDigitalHumanVoice);
imageDigitalHumanRouter.get("/tasks", listImageDigitalHumanTasks);
imageDigitalHumanRouter.post("/tasks", uploadPortrait, createImageDigitalHumanTask);
imageDigitalHumanRouter.get("/tasks/:id", getImageDigitalHumanTask);
imageDigitalHumanRouter.post("/tasks/:id/regenerate", regenerateImageDigitalHumanTask);
imageDigitalHumanRouter.delete("/tasks/:id", deleteImageDigitalHumanTask);
