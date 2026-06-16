import { sendError } from "../../shared/http.js";
import * as service from "./enhance.service.js";

export function getEnhanceModels(_req, res) {
  res.json(service.getModels());
}

export async function uploadEnhanceSource(req, res) {
  try {
    res.status(201).json(await service.createAsset({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listEnhanceTasks(req, res) {
  try {
    res.json(await service.listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getEnhanceTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createEnhanceTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleEnhanceFavorite(req, res) {
  try {
    const task = await service.toggleFavorite(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteEnhanceTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
