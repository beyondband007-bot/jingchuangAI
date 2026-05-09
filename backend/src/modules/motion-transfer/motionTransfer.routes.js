import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createMotionTransferTask,
  deleteMotionTransferTask,
  getMotionTransferModels,
  getMotionTransferTask,
  listMotionTransferTasks,
  toggleMotionTransferFavorite,
  uploadMotionTransferImage,
  uploadMotionTransferVideo
} from "./motionTransfer.controller.js";

export const motionTransferRouter = Router();

const imageDir = path.resolve(process.cwd(), config.media.storageDir, "motion-transfer", "images");
const videoDir = path.resolve(process.cwd(), config.media.storageDir, "motion-transfer", "videos");
mkdirSync(imageDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

function makeStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, destination),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || "";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  });
}

function makeUpload({ destination, maxBytes, expectedPrefix, errorLabel }) {
  return multer({
    storage: makeStorage(destination),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, callback) => {
      if (!String(file.mimetype || "").startsWith(expectedPrefix)) {
        callback(new Error(`${errorLabel} has invalid file type`));
        return;
      }
      callback(null, true);
    }
  });
}

const imageUpload = makeUpload({
  destination: imageDir,
  maxBytes: 10 * 1024 * 1024,
  expectedPrefix: "image/",
  errorLabel: "image"
});

const videoUpload = makeUpload({
  destination: videoDir,
  maxBytes: 200 * 1024 * 1024,
  expectedPrefix: "video/",
  errorLabel: "video"
});

function uploadSingle(upload, fieldName, maxLabel) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        next();
        return;
      }
      const message = error.code === "LIMIT_FILE_SIZE" ? `${fieldName} must be ${maxLabel} or smaller` : error.message;
      res.status(400).json({ error: message });
    });
  };
}

motionTransferRouter.get("/models", getMotionTransferModels);
motionTransferRouter.post("/uploads/image", uploadSingle(imageUpload, "image", "10MB"), uploadMotionTransferImage);
motionTransferRouter.post("/uploads/video", uploadSingle(videoUpload, "video", "200MB"), uploadMotionTransferVideo);
motionTransferRouter.get("/tasks", listMotionTransferTasks);
motionTransferRouter.post("/tasks", createMotionTransferTask);
motionTransferRouter.get("/tasks/:id", getMotionTransferTask);
motionTransferRouter.post("/tasks/:id/favorite", toggleMotionTransferFavorite);
motionTransferRouter.delete("/tasks/:id", deleteMotionTransferTask);
