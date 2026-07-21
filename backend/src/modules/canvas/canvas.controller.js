import { requireLoggedIn, sendError } from "../../shared/http.js";
import {
  addNodeTask,
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  listNodeTasks,
  listProjects,
  patchProject,
  saveProjectGraph,
} from "./canvas.service.js";

function withLoggedIn(handler) {
  return async (req, res) => {
    try {
      requireLoggedIn(req.user);
      await handler(req, res);
    } catch (error) {
      sendError(res, error);
    }
  };
}

export const listCanvasProjects = withLoggedIn(async (req, res) => {
  res.json(await listProjects(req.user.id));
});

export const createCanvasProject = withLoggedIn(async (req, res) => {
  res.status(201).json(await createProject(req.body, req.user.id));
});

export const getCanvasProject = withLoggedIn(async (req, res) => {
  res.json(await getProject(req.params.id, req.user.id));
});

export const patchCanvasProject = withLoggedIn(async (req, res) => {
  res.json(await patchProject(req.params.id, req.body, req.user.id));
});

export const saveCanvasProjectGraph = withLoggedIn(async (req, res) => {
  res.json(await saveProjectGraph(req.params.id, req.body, req.user.id));
});

export const duplicateCanvasProject = withLoggedIn(async (req, res) => {
  res.status(201).json(await duplicateProject(req.params.id, req.user.id));
});

export const deleteCanvasProject = withLoggedIn(async (req, res) => {
  res.json(await deleteProject(req.params.id, req.user.id));
});

export const createCanvasNodeTask = withLoggedIn(async (req, res) => {
  res.status(201).json(await addNodeTask(req.params.id, req.body, req.user.id));
});

export const listCanvasNodeTasks = withLoggedIn(async (req, res) => {
  res.json(await listNodeTasks(req.params.id, req.user.id));
});
