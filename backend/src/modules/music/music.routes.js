import { Router } from "express";
import { getConfig, getRecent, getTask, generate } from "./music.controller.js";

export const musicRouter = Router();

musicRouter.get("/config", getConfig);
musicRouter.get("/recent", getRecent);
musicRouter.get("/tasks", getRecent);
musicRouter.get("/tasks/:id", getTask);
musicRouter.post("/generate", generate);
