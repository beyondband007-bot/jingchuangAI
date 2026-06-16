import { Router } from "express";
import multer from "multer";
import { createHttpError, sendError } from "../../shared/http.js";
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
        ? "音频文件需小于 50MB"
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

transcribeRouter.get("/config", getConfig);
transcribeRouter.get("/recent", getRecent);
transcribeRouter.get("/tasks", getRecent);
transcribeRouter.post("/", requireCredits, uploadAudioSingle, transcribe);
