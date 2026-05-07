import { Router } from "express";
import {
  createImageTask,
  deleteImageTask,
  getImageModels,
  getImageTask,
  listImageTasks,
  toggleImageFavorite
} from "./image.controller.js";

export const imageRouter = Router();

imageRouter.get("/models", getImageModels);
imageRouter.get("/tasks", listImageTasks);
imageRouter.post("/tasks", createImageTask);
imageRouter.get("/tasks/:id", getImageTask);
imageRouter.post("/tasks/:id/favorite", toggleImageFavorite);
imageRouter.delete("/tasks/:id", deleteImageTask);
