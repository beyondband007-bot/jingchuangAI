import { Router } from "express";
import {
  createArticleCopyDraft,
  createArticlePackage,
  createArticleTask,
  deleteArticleTask,
  downloadArticlePackageImages,
  getArticlePackage,
  getArticleModels,
  getArticleTask,
  listArticleTasks,
  toggleArticleFavorite
} from "./article.controller.js";

export const articleRouter = Router();

articleRouter.get("/models", getArticleModels);
articleRouter.post("/copy-draft", createArticleCopyDraft);
articleRouter.post("/packages", createArticlePackage);
articleRouter.get("/packages/:id/images.zip", downloadArticlePackageImages);
articleRouter.get("/packages/:id", getArticlePackage);
articleRouter.get("/tasks", listArticleTasks);
articleRouter.post("/tasks", createArticleTask);
articleRouter.get("/tasks/:id", getArticleTask);
articleRouter.post("/tasks/:id/favorite", toggleArticleFavorite);
articleRouter.delete("/tasks/:id", deleteArticleTask);
