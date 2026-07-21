import { Router } from "express";
import {
  createCanvasNodeTask,
  createCanvasProject,
  deleteCanvasProject,
  duplicateCanvasProject,
  getCanvasProject,
  listCanvasNodeTasks,
  listCanvasProjects,
  patchCanvasProject,
  saveCanvasProjectGraph,
} from "./canvas.controller.js";

export const canvasRouter = Router();

canvasRouter.get("/projects", listCanvasProjects);
canvasRouter.post("/projects", createCanvasProject);
canvasRouter.get("/projects/:id", getCanvasProject);
canvasRouter.patch("/projects/:id", patchCanvasProject);
canvasRouter.put("/projects/:id/graph", saveCanvasProjectGraph);
canvasRouter.post("/projects/:id/duplicate", duplicateCanvasProject);
canvasRouter.delete("/projects/:id", deleteCanvasProject);
canvasRouter.get("/projects/:id/node-tasks", listCanvasNodeTasks);
canvasRouter.post("/projects/:id/node-tasks", createCanvasNodeTask);
