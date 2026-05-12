import { sendError } from "../../shared/http.js";
import * as service from "./transcribe.service.js";

export async function getConfig(req, res) {
  try {
    res.json(service.getConfig());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRecent(req, res) {
  try {
    res.json(service.getRecentTranscriptions());
  } catch (error) {
    sendError(res, error);
  }
}

export async function transcribe(req, res) {
  try {
    const result = await service.transcribeAudio({
      file: req.file,
      durationMs: req.body?.durationMs
    });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
