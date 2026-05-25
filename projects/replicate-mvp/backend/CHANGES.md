# Replicate Backend Changes

## Files

- `backend/src/providers/minimax/vision.js`
  - Wraps MiniMax vision analysis through `/v1/chat/completions`.
  - Uses `MiniMax-Text-01` because the real image upload test showed `MiniMax-M2.5` did not receive image content in the current request format.
  - Requests strict JSON and falls back to section extraction when needed.

- `backend/src/modules/replicate/replicate.service.js`
  - Validates image uploads up to 20MB: jpg, jpeg, png, webp, gif.
  - Validates video uploads up to 100MB: mp4, webm, mov, avi.
  - Extracts 3 video frames with Python OpenCV at 25%, 50%, and 75%.
  - Cleans temporary script and video files after extraction.

- `backend/src/modules/replicate/replicate.controller.js`
  - `GET /api/replicate/config`
  - `GET /api/replicate/recent`
  - `POST /api/replicate/analyze-image`
  - `POST /api/replicate/analyze-video`

- `backend/src/modules/replicate/replicate.routes.js`
  - Express router with multer memory uploads.

- `backend/src/app.js`
  - Registers `app.use("/api/replicate", replicateRouter)`.

## Verified

- `GET /api/replicate/config`
- `GET /api/replicate/recent`
- `POST /api/replicate/analyze-image` with `frontend/gallery-1.jpg`
- `POST /api/replicate/analyze-video` with `frontend/水下柯基.webm`
