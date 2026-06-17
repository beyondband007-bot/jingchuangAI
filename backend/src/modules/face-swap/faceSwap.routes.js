import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import { normalizeUploadOriginalName } from "../../shared/fileName.js";
import {
  createFaceSwapTask,
  deleteFaceSwapTask,
  getFaceSwapModels,
  getFaceSwapTask,
  listFaceSwapTasks,
  toggleFaceSwapFavorite,
  uploadFaceSwapImage,
  uploadFaceSwapVideo
} from "./faceSwap.controller.js";

export const faceSwapRouter = Router();

const imageDir = path.resolve(process.cwd(), config.media.storageDir, "face-swap", "images");
const videoDir = path.resolve(process.cwd(), config.media.storageDir, "face-swap", "videos");
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
  maxBytes: 50 * 1024 * 1024,
  expectedPrefix: "video/",
  errorLabel: "video"
});

function uploadSingle(upload, fieldName, maxLabel) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        normalizeUploadOriginalName(req.file);
        next();
        return;
      }
      const message = error.code === "LIMIT_FILE_SIZE" ? `${fieldName} must be ${maxLabel} or smaller` : error.message;
      res.status(400).json({ error: message });
    });
  };
}

faceSwapRouter.get("/models", getFaceSwapModels);
faceSwapRouter.post("/uploads/image", uploadSingle(imageUpload, "image", "10MB"), uploadFaceSwapImage);
faceSwapRouter.post("/uploads/video", uploadSingle(videoUpload, "video", "50MB"), uploadFaceSwapVideo);
faceSwapRouter.get("/tasks", listFaceSwapTasks);
faceSwapRouter.post("/tasks", createFaceSwapTask);
faceSwapRouter.get("/tasks/:id", getFaceSwapTask);
faceSwapRouter.post("/tasks/:id/favorite", toggleFaceSwapFavorite);
faceSwapRouter.delete("/tasks/:id", deleteFaceSwapTask);
