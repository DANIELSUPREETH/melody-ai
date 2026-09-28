---
title: MelodyAI API
emoji: 🎵
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# MelodyAI API

FastAPI backend for MelodyAI: stem separation (Demucs), chord/key/tempo
detection (librosa), MIDI (basic-pitch) and MusicXML (music21).

The block at the top of this file is read by Hugging Face Spaces. See the
main project README for setup and deployment.

Endpoints: `POST /upload`, `GET /status/{job_id}`, `GET /result/{job_id}`,
`GET /files/{job_id}/{filename}`.
