# MelodyAI backend

FastAPI service for MelodyAI: stem separation (Demucs), chord/key/tempo detection
(librosa), MIDI (basic-pitch) and MusicXML (music21).

## Start it

On macOS, from the repo root:

```bash
./backend/start-melody.sh
```

This installs what's missing (Python 3.11, ffmpeg, ngrok, Python packages, the Demucs
model), starts the API on `127.0.0.1:8765` and opens the ngrok tunnel at the domain in
`backend/.ngrok-domain`. See the main [README](../README.md#run-the-backend-macos) for the
one-time ngrok setup.

For development without a tunnel:

```bash
source .venv/bin/activate
uvicorn app:app --reload --port 8000
```

## Files

| File | What it does |
| --- | --- |
| `app.py` | Routes, CORS, in-memory job store, background jobs, cleanup after 1 hour |
| `processing.py` | ffmpeg → Demucs → instrumental mix → librosa (tempo, key, chords) → basic-pitch (MIDI) → music21 (MusicXML) → MP3s |
| `start-melody.sh` | Install + run + tunnel, in one command (macOS) |
| `requirements.txt` | Python dependencies (CPU PyTorch) |
| `Dockerfile` | Optional container for a cloud host with 4 GB+ RAM |

Endpoints: `GET /`, `POST /upload`, `GET /status/{job_id}`, `GET /result/{job_id}`,
`GET /files/{job_id}/{filename}`. Environment variables are listed in the main README.
