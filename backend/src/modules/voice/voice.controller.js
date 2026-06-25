import { requireLoggedIn, sendError } from "../../shared/http.js";
import * as service from "./voice.service.js";

export function getVoiceConfig(_req, res) {
  res.json(service.getConfig());
}

export async function listVoiceAssets(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await service.listVoices(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listVoiceTasks(req, res) {
  try {
    res.json(await service.listTasks(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadPromptAudio(req, res) {
  try {
    res.status(201).json(await service.uploadAudio({ file: req.file, purpose: "prompt_audio", durationMs: req.body?.durationMs }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadCloneAudio(req, res) {
  try {
    res.status(201).json(await service.uploadAudio({ file: req.file, purpose: "voice_clone", durationMs: req.body?.durationMs, userId: req.user?.id }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createVoiceClone(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.createClone(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function synthesizeVoice(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.synthesize(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
