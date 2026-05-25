# AI Music MVP

## Goal
Add an AI music generation feature to the existing app.

## Scope
- Text-to-music with MiniMax `POST /v1/music_generation`.
- Default model: `music-2.6-free`.
- Support lyrics mode and instrumental mode.
- Save MiniMax hex audio locally and return a stable `/media/music/...` URL.
- UI follows the existing transcribe page layout.

## Work Split
- Backend implementation: @kimi
- Frontend implementation: @Cindy
- Planning, review, and integration verification: @codex
