import { Router } from "express";
import multer from "multer";
import {
  createVoiceClone,
  getVoiceConfig,
  synthesizeVoice,
  uploadCloneAudio,
  uploadPromptAudio
} from "./voice.controller.js";

export const voiceRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function uploadSingle(req, res, next) {
  upload.single("audio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "audio file must be 20MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

voiceRouter.get("/config", getVoiceConfig);
voiceRouter.post("/uploads/prompt-audio", uploadSingle, uploadPromptAudio);
voiceRouter.post("/uploads/clone-audio", uploadSingle, uploadCloneAudio);
voiceRouter.post("/clones", createVoiceClone);
voiceRouter.post("/synthesize", synthesizeVoice);
