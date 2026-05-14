import { Router } from "express";
import multer from "multer";
import { getConfig, getRecent, transcribe } from "./transcribe.controller.js";

export const transcribeRouter = Router();

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

function uploadAudioSingle(req, res, next) {
  audioUpload.single("audio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "audio file must be 50MB or smaller"
        : error.message;
    res.status(400).json({ error: message });
  });
}

transcribeRouter.get("/config", getConfig);
transcribeRouter.get("/recent", getRecent);
transcribeRouter.get("/tasks", getRecent);
transcribeRouter.post("/", uploadAudioSingle, transcribe);
