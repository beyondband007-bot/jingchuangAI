import { Router } from "express";
import { getConfig, getRecent, generate } from "./music.controller.js";

export const musicRouter = Router();

musicRouter.get("/config", getConfig);
musicRouter.get("/recent", getRecent);
musicRouter.get("/tasks", getRecent);
musicRouter.post("/generate", generate);
