import { Router } from "express";
import {
  createArticleTask,
  deleteArticleTask,
  getArticleModels,
  getArticleTask,
  listArticleTasks,
  toggleArticleFavorite
} from "./article.controller.js";

export const articleRouter = Router();

articleRouter.get("/models", getArticleModels);
articleRouter.get("/tasks", listArticleTasks);
articleRouter.post("/tasks", createArticleTask);
articleRouter.get("/tasks/:id", getArticleTask);
articleRouter.post("/tasks/:id/favorite", toggleArticleFavorite);
articleRouter.delete("/tasks/:id", deleteArticleTask);
