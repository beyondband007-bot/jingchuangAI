import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";
import { config } from "../../config/index.js";
import {
  createVideoTask,
  deleteVideoTask,
  getVideoModels,
  getVideoTask,
  listVideoTasks,
  toggleVideoFavorite,
  uploadVideoReferenceImage,
  uploadVideoReferenceVideo
} from "./video.controller.js";

export const videoRouter = Router();

const referenceDir = path.resolve(process.cwd(), config.media.storageDir, "video", "references");
mkdirSync(referenceDir, { recursive: true });

function createReferenceUpload({ allowedTypes, maxBytes, maxLabel, typeLabel }) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, referenceDir),
      filename: (_req, file, callback) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || "";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
      }
    }),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, callback) => {
      if (!allowedTypes.has(String(file.mimetype || ""))) {
        callback(new Error(`file must be a ${typeLabel}`));
        return;
      }
      callback(null, true);
    }
  });

  return (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) {
        if (req.file?.originalname) {
          req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
        }
        next();
        return;
      }
      const message = error.code === "LIMIT_FILE_SIZE" ? `file must be ${maxLabel} or smaller` : error.message;
      res.status(400).json({ error: message });
    });
  };
}

const uploadReferenceImage = createReferenceUpload({
  allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  maxBytes: 30 * 1024 * 1024,
  maxLabel: "30MB",
  typeLabel: "JPEG, PNG, or WebP image"
});

const uploadReferenceVideo = createReferenceUpload({
  allowedTypes: new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]),
  maxBytes: 100 * 1024 * 1024,
  maxLabel: "100MB",
  typeLabel: "MP4, MOV, WebM, or AVI video"
});

videoRouter.get("/models", getVideoModels);
videoRouter.post("/uploads/reference-image", uploadReferenceImage, uploadVideoReferenceImage);
videoRouter.post("/uploads/reference-video", uploadReferenceVideo, uploadVideoReferenceVideo);
videoRouter.get("/tasks", listVideoTasks);
videoRouter.post("/tasks", createVideoTask);
videoRouter.get("/tasks/:id", getVideoTask);
videoRouter.post("/tasks/:id/favorite", toggleVideoFavorite);
videoRouter.delete("/tasks/:id", deleteVideoTask);
