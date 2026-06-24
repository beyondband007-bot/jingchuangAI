import { Router } from "express";
import { getConfig, getRecent, getTask, generate, syncLyrics, deleteTask } from "./music.controller.js";

export const musicRouter = Router();

musicRouter.get("/config", getConfig);
musicRouter.get("/recent", getRecent);
musicRouter.get("/tasks", getRecent);
musicRouter.get("/tasks/:id", getTask);
musicRouter.delete("/tasks/:id", deleteTask);
musicRouter.post("/generate", generate);
musicRouter.post("/tasks/:id/sync-lyrics", syncLyrics);
