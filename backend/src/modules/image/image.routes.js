import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createImageTask,
  deleteImageTask,
  deleteImageTasks,
  getImageModels,
  getImageTask,
  listImageInspirationFavorites,
  listImageTasks,
  toggleImageInspirationFavorite,
  toggleImageFavorite,
  uploadImageReference
} from "./image.controller.js";

export const imageRouter = Router();

const referenceDir = path.resolve(process.cwd(), config.media.storageDir, "image", "references");
mkdirSync(referenceDir, { recursive: true });

const referenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, referenceDir);
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || "";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(String(file.mimetype || ""))) {
      callback(new Error("file must be a JPEG, PNG, or WebP image"));
      return;
    }
    callback(null, true);
  }
});

function uploadReference(req, res, next) {
  referenceUpload.single("file")(req, res, (error) => {
    if (!error) {
      if (req.file?.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      }
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "image must be 30MB or smaller" : error.message;
    return res.status(400).json({ error: message });
  });
}

imageRouter.get("/models", getImageModels);
imageRouter.post("/uploads/reference", uploadReference, uploadImageReference);
imageRouter.get("/inspiration-favorites", listImageInspirationFavorites);
imageRouter.post("/inspiration-favorites/:id", toggleImageInspirationFavorite);
imageRouter.get("/tasks", listImageTasks);
imageRouter.post("/tasks", createImageTask);
imageRouter.delete("/tasks", deleteImageTasks);
imageRouter.get("/tasks/:id", getImageTask);
imageRouter.post("/tasks/:id/favorite", toggleImageFavorite);
imageRouter.delete("/tasks/:id", deleteImageTask);
