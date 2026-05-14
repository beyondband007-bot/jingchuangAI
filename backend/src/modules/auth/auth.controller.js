import { sendError } from "../../shared/http.js";
import { SESSION_COOKIE_NAME } from "../../shared/userService.js";
import { getAuthState, loginUser, logoutUser, registerUser } from "./auth.service.js";

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  };
}

function setSessionCookie(res, session) {
  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOptions(session.expiresAt));
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
    setSessionCookie(res, result.session);
    res.status(201).json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function login(req, res) {
  try {
    const result = await loginUser(req.body);
    setSessionCookie(res, result.session);
    res.json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function logout(req, res) {
  try {
    await logoutUser(req);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
