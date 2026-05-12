import { sendError } from "../../shared/http.js";
import { createTask, deleteTask, getModels, getTask, listTasks, toggleFavorite } from "./article.service.js";

export async function getArticleModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listArticleTasks(req, res) {
  try {
    res.json(await listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createArticleTask(req, res) {
  try {
    res.status(201).json(await createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getArticleTask(req, res) {
  try {
    const task = await getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleArticleFavorite(req, res) {
  try {
    const task = await toggleFavorite(req.params.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteArticleTask(req, res) {
  try {
    res.json(await deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
