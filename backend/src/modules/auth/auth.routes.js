import { Router } from "express";
import {
  captchaConfig,
  login,
  logout,
  me,
  passwordReset,
  passwordResetChallenge,
  phoneCodeLogin,
  register,
  securityQuestions,
  smsCode
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.get("/me", me);
authRouter.get("/security-questions", securityQuestions);
authRouter.get("/captcha/config", captchaConfig);
authRouter.post("/sms-code", smsCode);
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/login/phone-code", phoneCodeLogin);
authRouter.post("/logout", logout);
authRouter.post("/password-reset/challenge", passwordResetChallenge);
authRouter.post("/password-reset", passwordReset);
