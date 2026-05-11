import { sendError } from "../../shared/http.js";
import * as service from "./watermark.service.js";

export function getWatermarkModels(_req, res) {
  res.json(service.getModels());
}

export async function uploadWatermarkSource(req, res) {
  try {
    res.status(201).json(await service.createAsset({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listWatermarkTasks(req, res) {
  try {
    res.json(await service.listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getWatermarkTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createWatermarkTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleWatermarkFavorite(req, res) {
  try {
    const task = await service.toggleFavorite(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteWatermarkTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
