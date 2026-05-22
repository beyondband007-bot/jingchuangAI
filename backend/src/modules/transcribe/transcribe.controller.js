import { createHttpError, sendError } from "../../shared/http.js";
import * as service from "./transcribe.service.js";

function requireCredits(user) {
  if (user?.isGuest) throw createHttpError("积分不够，请充值", 402);
}

export async function getConfig(req, res) {
  try {
    res.json(service.getConfig());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRecent(req, res) {
  try {
    res.json(await service.getRecentTranscriptions(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function transcribe(req, res) {
  try {
    requireCredits(req.user);
    const result = await service.transcribeAudio({
      file: req.file,
      durationMs: req.body?.durationMs,
      userId: req.user.id
    });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
