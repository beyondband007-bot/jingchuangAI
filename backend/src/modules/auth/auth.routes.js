import { Router } from "express";
import { login, logout, me, register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.get("/me", me);
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
