import { sendError } from "../../shared/http.js";
import * as service from "./digitalHuman.service.js";

export function getDigitalHumanModels(_req, res) {
  res.json(service.getModels());
}

export function getDigitalHumanAvatars(_req, res) {
  res.json(service.getAvatars());
}

export function getDigitalHumanVoices(_req, res) {
  res.json(service.getVoices());
}

export async function designDigitalHumanVoice(req, res) {
  try {
    const result = await service.designVoice(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export function listDigitalHumanTasks(_req, res) {
  res.json(service.listTasks());
}

export function getDigitalHumanTask(req, res) {
  const task = service.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });
  return res.json(task);
}

export function createDigitalHumanTask(req, res) {
  try {
    res.status(201).json(service.createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export function deleteDigitalHumanTask(req, res) {
  res.json(service.deleteTask(req.params.id));
}

export function regenerateDigitalHumanTask(req, res) {
  try {
    const task = service.regenerateTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.status(201).json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export function createDigitalHumanAvatar(req, res) {
  try {
    res.status(201).json(service.createAvatar(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export function updateDigitalHumanAvatar(req, res) {
  const avatar = service.updateAvatar(req.params.id, req.body || {});
  if (!avatar) return res.status(404).json({ error: "avatar not found" });
  return res.json(avatar);
}

export function deleteDigitalHumanAvatar(req, res) {
  res.json(service.deleteAvatar(req.params.id));
}
