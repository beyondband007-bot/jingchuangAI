import { Router } from "express";
import { me, track } from "./invitation.controller.js";

export const invitationRouter = Router();

invitationRouter.get("/me", me);
invitationRouter.post("/track", track);
