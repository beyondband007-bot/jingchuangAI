import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import { normalizeUploadOriginalName } from "../../shared/fileName.js";
import {
  createDigitalHumanAvatar,
  createDigitalHumanAiAvatar,
  createDigitalHumanTask,
  createDigitalHumanVoiceClone,
  deleteDigitalHumanAvatar,
  deleteDigitalHumanTask,
  getDigitalHumanAiAvatarTask,
  designDigitalHumanVoice,
  getDigitalHumanAvatars,
  getDigitalHumanModels,
  getDigitalHumanTask,
  getDigitalHumanVoices,
  listDigitalHumanTasks,
  previewDigitalHumanVoice,
  regenerateDigitalHumanTask,
  saveDigitalHumanAiAvatar,
  uploadDigitalHumanAudio,
  uploadDigitalHumanVoiceCloneAudio,
  uploadDigitalHumanScene,
  updateDigitalHumanAvatar
} from "./digitalHuman.controller.js";

export const digitalHumanRouter = Router();

const avatarDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "avatars");
const audioDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "audio-uploads");
const sceneDir = path.resolve(process.cwd(), config.media.storageDir, "digital-human", "scene-uploads");
mkdirSync(avatarDir, { recursive: true });
mkdirSync(audioDir, { recursive: true });
mkdirSync(sceneDir, { recursive: true });

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

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, audioDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".mp3";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mime = String(file.mimetype || "");
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!mime.startsWith("audio/") && ![".mp3", ".m4a", ".wav", ".aac", ".ogg", ".webm"].includes(ext)) {
      callback(new Error("audio must be an audio file"));
      return;
    }
    callback(null, true);
  }
});

const sceneUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, sceneDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || "").startsWith("image/")) {
      callback(new Error("scene must be an image file"));
      return;
    }
    callback(null, true);
  }
});

const voiceCloneUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function uploadAvatar(req, res, next) {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (!error) {
      normalizeUploadOriginalName(req.file);
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "avatar image must be 30MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadAudio(req, res, next) {
  audioUpload.single("audio")(req, res, (error) => {
    if (!error) {
      normalizeUploadOriginalName(req.file);
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "audio file must be 50MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadScene(req, res, next) {
  sceneUpload.single("scene")(req, res, (error) => {
    if (!error) {
      normalizeUploadOriginalName(req.file);
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "scene image must be 30MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadVoiceCloneAudio(req, res, next) {
  voiceCloneUpload.single("audio")(req, res, (error) => {
    if (!error) {
      normalizeUploadOriginalName(req.file);
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "audio file must be 20MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

digitalHumanRouter.get("/models", getDigitalHumanModels);
digitalHumanRouter.get("/avatars", getDigitalHumanAvatars);
digitalHumanRouter.post("/avatars", uploadAvatar, createDigitalHumanAvatar);
digitalHumanRouter.post("/avatars/ai-custom", createDigitalHumanAiAvatar);
digitalHumanRouter.get("/avatars/ai-custom/:id", getDigitalHumanAiAvatarTask);
digitalHumanRouter.post("/avatars/ai-custom/:id/save", saveDigitalHumanAiAvatar);
digitalHumanRouter.put("/avatars/:id", updateDigitalHumanAvatar);
digitalHumanRouter.delete("/avatars/:id", deleteDigitalHumanAvatar);
digitalHumanRouter.get("/voices", getDigitalHumanVoices);
digitalHumanRouter.post("/voices/design", designDigitalHumanVoice);
digitalHumanRouter.post("/voices/preview", previewDigitalHumanVoice);
digitalHumanRouter.post("/voices/uploads/clone-audio", uploadVoiceCloneAudio, uploadDigitalHumanVoiceCloneAudio);
digitalHumanRouter.post("/voices/clones", createDigitalHumanVoiceClone);
digitalHumanRouter.post("/uploads/audio", uploadAudio, uploadDigitalHumanAudio);
digitalHumanRouter.post("/uploads/scene", uploadScene, uploadDigitalHumanScene);
digitalHumanRouter.get("/tasks", listDigitalHumanTasks);
digitalHumanRouter.post("/tasks", createDigitalHumanTask);
digitalHumanRouter.get("/tasks/:id", getDigitalHumanTask);
digitalHumanRouter.post("/tasks/:id/regenerate", regenerateDigitalHumanTask);
digitalHumanRouter.delete("/tasks/:id", deleteDigitalHumanTask);
