import { Router } from "express";
import {
  getGenerationNotificationSummary,
  getGenerationRunningSummary,
  getNotificationCenterItems,
  markAllNotificationCenterItemsRead,
  markNotificationCenterItemsRead,
  markGenerationNotificationResultRead,
} from "./generationNotification.controller.js";

export const generationNotificationRouter = Router();

generationNotificationRouter.get("/running-summary", getGenerationRunningSummary);
generationNotificationRouter.get("/summary", getGenerationNotificationSummary);
generationNotificationRouter.post("/results/read", markGenerationNotificationResultRead);
generationNotificationRouter.get("/center", getNotificationCenterItems);
generationNotificationRouter.post("/center/read", markNotificationCenterItemsRead);
generationNotificationRouter.post("/center/read-all", markAllNotificationCenterItemsRead);
