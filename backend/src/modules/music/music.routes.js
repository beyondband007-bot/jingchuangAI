import { Router } from "express";
import {
  deleteTask,
  generate,
  getConfig,
  getRecent,
  getTask,
  receiveKieCallback,
  syncLyrics,
  updateTaskCover,
  updateTaskTitle
} from "./music.controller.js";

export const musicRouter = Router();
export const musicPublicRouter = Router();

musicPublicRouter.post("/kie-callback", receiveKieCallback);

musicRouter.get("/config", getConfig);
musicRouter.get("/recent", getRecent);
musicRouter.get("/tasks", getRecent);
musicRouter.get("/tasks/:id", getTask);
musicRouter.delete("/tasks/:id", deleteTask);
musicRouter.post("/tasks/:id/cover", updateTaskCover);
musicRouter.patch("/tasks/:id/title", updateTaskTitle);
musicRouter.post("/generate", generate);
musicRouter.post("/tasks/:id/sync-lyrics", syncLyrics);
