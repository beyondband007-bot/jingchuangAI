import { sendError } from "../../shared/http.js";
import { SESSION_COOKIE_NAME } from "../../shared/userService.js";
import {
  changeAccountPassword,
  changeAccountPhone,
  createPasswordResetChallenge,
  getCaptchaClientConfig,
  getAuthState,
  getSecurityQuestions,
  loginUserWithPhoneCode,
  loginUser,
  logoutUser,
  registerUser,
  resetPasswordWithSecurityAnswer,
  selectAccountAvatar,
  sendSmsCode,
  updateAccountProfile,
  uploadAccountAvatar,
  verifyAccountCurrentPhone
} from "./auth.service.js";

function isSecureRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return req.secure || forwardedProto === "https";
}

function cookieOptions(req, expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    expires: expiresAt
  };
}

function setSessionCookie(req, res, session) {
  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOptions(req, session.expiresAt));
}

function clearSessionCookie(req, res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/"
  });
}

export async function me(req, res) {
  try {
    res.json(await getAuthState(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function register(req, res) {
  try {
    const result = await registerUser(req.body);
    setSessionCookie(req, res, result.session);
    res.status(201).json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function login(req, res) {
  try {
    const result = await loginUser(req.body);
    setSessionCookie(req, res, result.session);
    res.json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function phoneCodeLogin(req, res) {
  try {
    const result = await loginUserWithPhoneCode(req.body);
    setSessionCookie(req, res, result.session);
    res.json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function smsCode(req, res) {
  try {
    res.json(await sendSmsCode(req.body, req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function captchaConfig(_req, res) {
  try {
    res.json(getCaptchaClientConfig());
  } catch (error) {
    sendError(res, error);
  }
}

export async function logout(req, res) {
  try {
    await logoutUser(req);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}

export async function securityQuestions(_req, res) {
  try {
    res.json(getSecurityQuestions());
  } catch (error) {
    sendError(res, error);
  }
}

export async function passwordResetChallenge(req, res) {
  try {
    res.json(await createPasswordResetChallenge(req.body));
  } catch (error) {
    sendError(res, error);
  }
}

export async function passwordReset(req, res) {
  try {
    res.json(await resetPasswordWithSecurityAnswer(req.body));
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateProfile(req, res) {
  try {
    res.json(await updateAccountProfile(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function selectAvatar(req, res) {
  try {
    res.json(await selectAccountAvatar(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadAvatar(req, res) {
  try {
    res.status(201).json(await uploadAccountAvatar(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function changePhone(req, res) {
  try {
    res.json(await changeAccountPhone(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function verifyCurrentPhone(req, res) {
  try {
    res.json(await verifyAccountCurrentPhone(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function changePassword(req, res) {
  try {
    res.json(await changeAccountPassword(req));
  } catch (error) {
    sendError(res, error);
  }
}
