# AI Music MVP Spec

## Backend
- Provider: `backend/src/providers/minimax/musicGeneration.js`
- Module: `backend/src/modules/music/`
- Route prefix: `/api/music`
- Storage: `storage/music/audio/`

## API Contract
### `GET /api/music/config`
Returns supported models, defaults, audio settings, and limits.

### `GET /api/music/recent`
Returns recent generated music records from backend memory.

### `POST /api/music/generate`
Request body:
```json
{
  "prompt": "pop, bright, energetic",
  "lyrics": "[Verse]\n...",
  "model": "music-2.6-free",
  "isInstrumental": false,
  "lyricsOptimizer": false
}
```

Response body:
```json
{
  "id": "music-...",
  "audioUrl": "/media/music/audio/...",
  "durationMs": 25000,
  "traceId": "...",
  "prompt": "...",
  "lyrics": "...",
  "model": "music-2.6-free",
  "createdAt": "..."
}
```

### `POST /api/music/tasks/:id/sync-lyrics`
Sync lyrics timeline for a completed task. Optional query: `force=1`.

### `DELETE /api/music/tasks/:id`
Delete a music task for the current user.

Response body:
```json
{ "ok": true }
```

## Frontend
- View: `frontend-app/src/features/music/MusicGenerationView.jsx`
- API: `frontend-app/src/features/music/musicApi.js`
- Route: `#/music`
- Layout: match `TranscribeView` with home/recent/favorite tabs, central result panel, and bottom composer.

## Verification
- Backend import check.
- `GET /api/music/config`.
- `POST /api/music/generate` with a short test prompt when MiniMax quota permits.
- `npm run build` in `frontend-app`.
