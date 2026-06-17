import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createRemoveBgTask,
  deleteRemoveBgTask,
  getRemoveBgModels,
  getRemoveBgTask,
  listRemoveBgTasks,
  toggleRemoveBgFavorite,
  uploadRemoveBgSource
} from "./removeBg.controller.js";

export const removeBgRouter = Router();

const imageDir = path.resolve(process.cwd(), config.media.storageDir, "remove-bg", "images");
mkdirSync(imageDir, { recursive: true });

const sourceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, imageDir);
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || "";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mimeType = String(file.mimetype || "");
    if (!mimeType.startsWith("image/")) {
      callback(new Error("文件类型不支持，请上传图片"));
      return;
    }
    callback(null, true);
  }
});

function uploadSource(req, res, next) {
  sourceUpload.single("file")(req, res, (error) => {
    if (!error) {
      if (req.file?.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      }
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "图片需小于 10MB" : error.message;
    return res.status(400).json({ error: message });
  });
}

removeBgRouter.get("/models", getRemoveBgModels);
removeBgRouter.post("/uploads/source", uploadSource, uploadRemoveBgSource);
removeBgRouter.get("/tasks", listRemoveBgTasks);
removeBgRouter.post("/tasks", createRemoveBgTask);
removeBgRouter.get("/tasks/:id", getRemoveBgTask);
removeBgRouter.post("/tasks/:id/favorite", toggleRemoveBgFavorite);
removeBgRouter.delete("/tasks/:id", deleteRemoveBgTask);
