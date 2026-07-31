export function sendError(res, error, fallbackStatus = 503) {
  const body = { error: error.message };
  const detail = error.errorDetail || error.videoErrorDetail;
  if (error.code) body.code = error.code;
  if (detail) body.errorDetail = detail;
  res.status(error.status || fallbackStatus).json(body);
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
