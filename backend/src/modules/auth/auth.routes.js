import { Router } from "express";
import {
  login,
  logout,
  me,
  passwordReset,
  passwordResetChallenge,
  register,
  securityQuestions
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.get("/me", me);
authRouter.get("/security-questions", securityQuestions);
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/password-reset/challenge", passwordResetChallenge);
authRouter.post("/password-reset", passwordReset);
