# AI Replicate MVP

This project tracks the "replicate" feature: upload an image or video and reverse-engineer a reusable AI generation prompt.

## Structure

```text
projects/replicate/
├── docs/
├── backend/
├── frontend/
└── test/
```

## Implementation

- Frontend: `frontend-app/src/features/replicate/`
- Backend: `backend/src/modules/replicate/`
- MiniMax provider: `backend/src/providers/minimax/vision.js`

## Runtime

- Backend: `http://127.0.0.1:3006`
- Frontend route: `#/replicate`
