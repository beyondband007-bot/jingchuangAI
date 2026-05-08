import { Router } from "express";
import {
  createDigitalHumanAvatar,
  createDigitalHumanTask,
  deleteDigitalHumanAvatar,
  deleteDigitalHumanTask,
  designDigitalHumanVoice,
  getDigitalHumanAvatars,
  getDigitalHumanModels,
  getDigitalHumanTask,
  getDigitalHumanVoices,
  listDigitalHumanTasks,
  previewDigitalHumanVoice,
  regenerateDigitalHumanTask,
  updateDigitalHumanAvatar
} from "./digitalHuman.controller.js";

export const digitalHumanRouter = Router();

digitalHumanRouter.get("/models", getDigitalHumanModels);
digitalHumanRouter.get("/avatars", getDigitalHumanAvatars);
digitalHumanRouter.post("/avatars", createDigitalHumanAvatar);
digitalHumanRouter.put("/avatars/:id", updateDigitalHumanAvatar);
digitalHumanRouter.delete("/avatars/:id", deleteDigitalHumanAvatar);
digitalHumanRouter.get("/voices", getDigitalHumanVoices);
digitalHumanRouter.post("/voices/design", designDigitalHumanVoice);
digitalHumanRouter.post("/voices/preview", previewDigitalHumanVoice);
digitalHumanRouter.get("/tasks", listDigitalHumanTasks);
digitalHumanRouter.post("/tasks", createDigitalHumanTask);
digitalHumanRouter.get("/tasks/:id", getDigitalHumanTask);
digitalHumanRouter.post("/tasks/:id/regenerate", regenerateDigitalHumanTask);
digitalHumanRouter.delete("/tasks/:id", deleteDigitalHumanTask);
