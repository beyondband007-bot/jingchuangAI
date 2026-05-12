# Transcribe MVP Frontend Changes

## Implemented
- Added `frontend-app/src/features/transcribe/TranscribeView.jsx`
- Added `frontend-app/src/features/transcribe/transcribeApi.js`
- Registered `#/transcribe` in `frontend-app/src/main.jsx`
- Added transcribe UI styles in `frontend-app/src/styles.css`

## UI Scope
- Single audio upload, 6 seconds to 6 minutes, 50MB maximum.
- Home, recent results, and disabled favorite tab matching the voice conversion layout.
- Result panel with copy, TXT download, and JSON download actions.
- Local recent-history storage via `localStorage`.

## Verification
- `npm run build` passed in `frontend-app`.
- Backend app import check passed after route registration.
- Dev server check passed on `http://127.0.0.1:5178/#/transcribe`.
- Backend route check passed after restart: `GET /api/transcribe/config`.
