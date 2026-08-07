import { Router } from "express";
import {
  getGenerationNotificationSummary,
  getGenerationRunningSummary,
  markGenerationNotificationResultRead,
} from "./generationNotification.controller.js";

export const generationNotificationRouter = Router();

generationNotificationRouter.get("/running-summary", getGenerationRunningSummary);
generationNotificationRouter.get("/summary", getGenerationNotificationSummary);
generationNotificationRouter.post("/results/read", markGenerationNotificationResultRead);
