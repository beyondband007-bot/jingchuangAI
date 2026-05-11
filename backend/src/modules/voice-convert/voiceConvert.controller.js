import { sendError } from "../../shared/http.js";
import * as service from "./voiceConvert.service.js";

export async function uploadTargetAudio(req, res) {
  try {
    res.status(201).json(await service.uploadTargetAudio({ file: req.file, durationMs: req.body?.durationMs }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function convertVoice(req, res) {
  try {
    res.status(201).json(await service.convert(req.body || {}, req.file));
  } catch (error) {
    sendError(res, error);
  }
}
