import { sendError } from "../../shared/http.js";
import { createTask, deleteTask, getModels, getTask, listTasks, toggleFavorite } from "./video.service.js";

export async function getVideoModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listVideoTasks(req, res) {
  try {
    res.json(await listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createVideoTask(req, res) {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getVideoTask(req, res) {
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

export async function toggleVideoFavorite(req, res) {
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

export async function deleteVideoTask(req, res) {
  try {
    res.json(await deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
