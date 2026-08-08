import { requireLoggedIn, sendError } from "../../shared/http.js";
import * as service from "./digitalHuman.service.js";

export function getDigitalHumanModels(_req, res) {
  res.json(service.getModels());
}

export async function getDigitalHumanAvatars(req, res) {
  try {
    res.json(
      await service.getAvatars(req.user?.isGuest ? null : req.user?.id)
    );
  } catch (error) {
    sendError(res, error);
  }
}

export async function getDigitalHumanVoices(req, res) {
  try {
    res.json(await service.getVoices(req.user?.isGuest ? null : req.user?.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function designDigitalHumanVoice(req, res) {
  try {
    const result = await service.designVoice(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function previewDigitalHumanVoice(req, res) {
  try {
    const result = await service.previewVoice(req.body || {}, req.user?.isGuest ? null : req.user?.id);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadDigitalHumanVoiceCloneAudio(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.uploadVoiceCloneAudio(req.body || {}, req.file, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createDigitalHumanVoiceClone(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.createVoiceClone(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listDigitalHumanTasks(_req, res) {
  try {
    res.json(await service.listTasks());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getDigitalHumanTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createDigitalHumanTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}, req.user));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadDigitalHumanAudio(req, res) {
  try {
    res.status(201).json(await service.uploadDriveAudio(req.body || {}, req.file));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadDigitalHumanScene(req, res) {
  try {
    res.status(201).json(await service.uploadSceneImage(req.body || {}, req.file));
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteDigitalHumanTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function regenerateDigitalHumanTask(req, res) {
  try {
    const task = await service.regenerateTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.status(201).json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createDigitalHumanAvatar(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(
      await service.createArkAvatar(req.body || {}, req.file, req.user.id)
    );
  } catch (error) {
    sendError(res, error);
  }
}

export async function createDigitalHumanAiAvatar(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.createAiCustomAvatarTask(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getDigitalHumanAiAvatarTask(req, res) {
  try {
    requireLoggedIn(req.user);
    const task = await service.getAiCustomAvatarTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: "AI avatar task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function saveDigitalHumanAiAvatar(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await service.saveAiCustomAvatarTask(req.params.id, req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateDigitalHumanAvatar(req, res) {
  try {
    requireLoggedIn(req.user);
    const avatar = await service.updateAvatar(req.params.id, req.body || {}, req.user.id);
    if (!avatar) return res.status(404).json({ error: "avatar not found" });
    return res.json(avatar);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteDigitalHumanAvatar(req, res) {
  try {
    requireLoggedIn(req.user);
    const result = await service.deleteAvatar(req.params.id, req.user.id);
    if (!result.ok) return res.status(404).json({ error: "avatar not found" });
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateDigitalHumanVoice(req, res) {
  try {
    requireLoggedIn(req.user);
    const voice = await service.updateVoice(req.params.id, req.body || {}, req.user.id);
    if (!voice) return res.status(404).json({ error: "voice not found" });
    return res.json(voice);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteDigitalHumanVoice(req, res) {
  try {
    requireLoggedIn(req.user);
    const result = await service.deleteVoice(req.params.id, req.user.id);
    if (!result.ok) return res.status(404).json({ error: "voice not found" });
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
}
