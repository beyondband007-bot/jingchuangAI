import { Router } from "express";
import multer from "multer";
import { convertVoice, uploadTargetAudio } from "./voiceConvert.controller.js";

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
    const message = error.code === "LIMIT_FILE_SIZE" ? "target audio file must be 20MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

function uploadSourceSingle(req, res, next) {
  sourceUpload.single("sourceAudio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "source audio file must be 50MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

voiceConvertRouter.post("/uploads/target-audio", uploadTargetSingle, uploadTargetAudio);
voiceConvertRouter.post("/convert", uploadSourceSingle, convertVoice);
