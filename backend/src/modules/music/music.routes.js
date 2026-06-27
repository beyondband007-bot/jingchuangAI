import { Router } from "express";
import { getConfig, getRecent, getTask, generate, syncLyrics, deleteTask, updateTaskCover } from "./music.controller.js";

export const musicRouter = Router();

musicRouter.get("/config", getConfig);
musicRouter.get("/recent", getRecent);
musicRouter.get("/tasks", getRecent);
musicRouter.get("/tasks/:id", getTask);
musicRouter.delete("/tasks/:id", deleteTask);
musicRouter.post("/tasks/:id/cover", updateTaskCover);
musicRouter.post("/generate", generate);
musicRouter.post("/tasks/:id/sync-lyrics", syncLyrics);
