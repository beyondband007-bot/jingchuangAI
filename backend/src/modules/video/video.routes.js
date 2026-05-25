import { Router } from "express";
import {
  createVideoTask,
  deleteVideoTask,
  getVideoModels,
  getVideoTask,
  listVideoTasks,
  toggleVideoFavorite
} from "./video.controller.js";

export const videoRouter = Router();

videoRouter.get("/models", getVideoModels);
videoRouter.get("/tasks", listVideoTasks);
videoRouter.post("/tasks", createVideoTask);
videoRouter.get("/tasks/:id", getVideoTask);
videoRouter.post("/tasks/:id/favorite", toggleVideoFavorite);
videoRouter.delete("/tasks/:id", deleteVideoTask);
