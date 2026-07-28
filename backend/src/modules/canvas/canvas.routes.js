import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { config } from "../../config/index.js";
import {
  createCanvasNodeTask,
  createCanvasProject,
  deleteCanvasProject,
  duplicateCanvasProject,
  getCanvasProject,
  listCanvasNodeTasks,
  listCanvasProjects,
  patchCanvasProject,
  saveCanvasProjectGraph,
  uploadCanvasMedia,
} from "./canvas.controller.js";

export const canvasRouter = Router();

const mediaDir = path.resolve(process.cwd(), config.media.storageDir, "canvas", "uploads");
mkdirSync(mediaDir, { recursive: true });

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, mediaDir),
    filename: (_req, file, callback) => {
      const extensions = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
        "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-msvideo": ".avi",
        "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mp4": ".m4a",
        "audio/aac": ".aac", "audio/ogg": ".ogg", "audio/webm": ".webm", "audio/flac": ".flac",
      };
      const ext = extensions[String(file.mimetype || "").toLowerCase()]
        || path.extname(file.originalname || "").toLowerCase();
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const type = String(file.mimetype || "").toLowerCase();
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
      "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4",
      "audio/aac", "audio/ogg", "audio/webm", "audio/flac",
    ]);
    const allowedAudioExtensions = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"]);
    if (!allowedTypes.has(type) && !allowedAudioExtensions.has(extension)) {
      callback(new Error("file must be an image, video, or audio"));
      return;
    }
    callback(null, true);
  },
});

function receiveCanvasMedia(req, res, next) {
  if (req.user?.isGuest) {
    res.status(401).json({ error: "请先登录" });
    return;
  }
  mediaUpload.single("file")(req, res, (error) => {
    if (!error) {
      if (req.file?.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      }
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "file must be 100MB or smaller" : error.message;
    res.status(400).json({ error: message });
  });
}

canvasRouter.post("/uploads/media", receiveCanvasMedia, uploadCanvasMedia);
canvasRouter.get("/projects", listCanvasProjects);
canvasRouter.post("/projects", createCanvasProject);
canvasRouter.get("/projects/:id", getCanvasProject);
canvasRouter.patch("/projects/:id", patchCanvasProject);
canvasRouter.put("/projects/:id/graph", saveCanvasProjectGraph);
canvasRouter.post("/projects/:id/duplicate", duplicateCanvasProject);
canvasRouter.delete("/projects/:id", deleteCanvasProject);
canvasRouter.get("/projects/:id/node-tasks", listCanvasNodeTasks);
canvasRouter.post("/projects/:id/node-tasks", createCanvasNodeTask);
