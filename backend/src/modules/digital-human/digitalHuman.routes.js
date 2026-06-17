import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createDigitalHumanAvatar,
  createDigitalHumanTask,
  deleteDigitalHumanAvatar,
  deleteDigitalHumanTask,
  designDigitalHumanVoice,
  getDigitalHumanAvatars,
  getDigitalHumanModels,
  getDigitalHumanTask,
  getDigitalHumanVoices,
  listDigitalHumanTasks,
  previewDigitalHumanVoice,
  regenerateDigitalHumanTask,
  updateDigitalHumanAvatar
} from "./digitalHuman.controller.js";

export const digitalHumanRouter = Router();

const avatarDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "avatars");
mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, avatarDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || "").startsWith("image/")) {
      callback(new Error("avatar must be an image file"));
      return;
    }
    callback(null, true);
  }
});

function uploadAvatar(req, res, next) {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "avatar image must be 30MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

digitalHumanRouter.get("/models", getDigitalHumanModels);
digitalHumanRouter.get("/avatars", getDigitalHumanAvatars);
digitalHumanRouter.post("/avatars", uploadAvatar, createDigitalHumanAvatar);
digitalHumanRouter.put("/avatars/:id", updateDigitalHumanAvatar);
digitalHumanRouter.delete("/avatars/:id", deleteDigitalHumanAvatar);
digitalHumanRouter.get("/voices", getDigitalHumanVoices);
digitalHumanRouter.post("/voices/design", designDigitalHumanVoice);
digitalHumanRouter.post("/voices/preview", previewDigitalHumanVoice);
digitalHumanRouter.get("/tasks", listDigitalHumanTasks);
digitalHumanRouter.post("/tasks", createDigitalHumanTask);
digitalHumanRouter.get("/tasks/:id", getDigitalHumanTask);
digitalHumanRouter.post("/tasks/:id/regenerate", regenerateDigitalHumanTask);
digitalHumanRouter.delete("/tasks/:id", deleteDigitalHumanTask);
