import { sendError } from "../../shared/http.js";
import * as service from "./imageDigitalHuman.service.js";

export function getImageDigitalHumanModels(_req, res) {
  res.json(service.getModels());
}

export function getImageDigitalHumanVoices(_req, res) {
  res.json(service.getVoices());
}

export async function previewImageDigitalHumanVoice(req, res) {
  try {
    const result = await service.previewVoice(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function listImageDigitalHumanTasks(_req, res) {
  try {
    res.json(await service.listTasks());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getImageDigitalHumanTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createImageDigitalHumanTask(req, res) {
  try {
    const portraitFile = req.files?.portrait?.[0] || req.file;
    const audioFile = req.files?.audio?.[0];
    res.status(201).json(await service.createTask(req.body || {}, portraitFile, audioFile));
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteImageDigitalHumanTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function regenerateImageDigitalHumanTask(req, res) {
  try {
    const task = await service.regenerateTask(req.params.id);
    if (!task) return res.status(404).json({ error: "任务不存在" });
    return res.status(201).json(task);
  } catch (error) {
    return sendError(res, error);
  }
}
