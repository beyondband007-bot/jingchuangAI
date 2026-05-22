export function sendError(res, error, fallbackStatus = 503) {
  res.status(error.status || fallbackStatus).json({ error: error.message });
}

export function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireLoggedIn(user) {
  if (user?.isGuest) {
    throw createHttpError("请先登录", 401);
  }
}
