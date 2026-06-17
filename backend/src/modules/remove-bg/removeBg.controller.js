import { sendError } from "../../shared/http.js";
import * as service from "./removeBg.service.js";

export function getRemoveBgModels(_req, res) {
  res.json(service.getModels());
}

export async function uploadRemoveBgSource(req, res) {
  try {
    res.status(201).json(await service.createAsset({ file: req.file, user: req.user }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listRemoveBgTasks(req, res) {
  try {
    res.json(await service.listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRemoveBgTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createRemoveBgTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}, req.user));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleRemoveBgFavorite(req, res) {
  try {
    const task = await service.toggleFavorite(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteRemoveBgTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
