import { Router } from "express";
import { getGenerationRunningSummary } from "./generationNotification.controller.js";

export const generationNotificationRouter = Router();

generationNotificationRouter.get("/running-summary", getGenerationRunningSummary);
