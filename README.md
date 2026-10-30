# MelodyAI

Upload a song (MP3/WAV/FLAC) and get:

- **Vocal removal**: an instrumental / karaoke track
- **Stem separation**: vocals, drums, bass, other
- **Chord detection** synced to playback
- **MIDI** generated from the notes
- **Sheet music** (MusicXML, rendered in the browser)
- **Practice mode**: slow down without changing pitch, A-B loop, live chords

Live site: https://melodymusic-ai.netlify.app (the demo always works; real uploads work while the backend is running)

| Part     | Tech                                                      | Hosted on |
| -------- | --------------------------------------------------------- | --------- |
| Frontend | React + Vite + Tailwind (`frontend/`)                     | Netlify   |
| Backend  | Python 3.11, FastAPI, Demucs, librosa, basic-pitch, music21 (`backend/`) | My Mac, made public through an ngrok tunnel |

```
melody-ai/
├── frontend/                 React app
│   ├── public/demo/          pre-processed demo (works without the backend)
│   └── src/
│       ├── config.js         API_BASE_URL (localhost in dev, VITE_API_URL in prod)
│       ├── services/api.js   upload, status polling, retries, ngrok header, result downloads
│       ├── pages/            Home (landing + upload), Results (player)
│       ├── hooks/useStemPlayer.js   keeps all stems in sync, speed, A-B loop
│       └── components/
├── backend/
│   ├── app.py                FastAPI routes
│   ├── processing.py         Demucs → librosa → basic-pitch → music21
│   ├── requirements.txt
│   ├── start-melody.sh       one command: install, start the API, open the ngrok tunnel (macOS)
│   └── Dockerfile            optional, for running the backend on a cloud host instead
└── netlify.toml
```

## How it's hosted

The AI models need about 3 GB of RAM, which no free cloud host offers anymore, so
the backend runs on my own laptop:

```
Browser ──▶ melodymusic-ai.netlify.app (React, static)
   │
   └──▶ https://<my-domain>.ngrok-free.dev ──tunnel──▶ my Mac: FastAPI on 127.0.0.1:8765
```

- **ngrok** gives the laptop a permanent public HTTPS address (free plan: one fixed domain,
  about 1 GB of downloads a month).
- The frontend sends an `ngrok-skip-browser-warning` header so ngrok's warning page
  doesn't get in the way, and downloads the result files itself (as blobs) because
  `<audio>` tags and download links can't send that header.
- The backend only works while the Mac is on and `start-melody.sh` is running. When
  it's off, the site says live processing is offline and points visitors to the demo.

## Run the backend (macOS)

You need [Homebrew](https://brew.sh). The script installs Python 3.11, ffmpeg and ngrok
if they're missing.

**First time only**

1. Make a free account at https://ngrok.com.
2. Connect ngrok to your account (copy the command from *Getting Started → Your Authtoken*):
   ```bash
   ngrok config add-authtoken <your-token>
   ```
3. Copy your free domain from the ngrok dashboard (*Domains*) and save it:
   ```bash
   echo "your-domain.ngrok-free.dev" > backend/.ngrok-domain
   ```
   (This file is git-ignored.)

**Every time**

```bash
cd melody-ai
./backend/start-melody.sh
```

The first run installs the Python packages and downloads the Demucs model
(5–10 minutes). After that it starts in a few seconds. Wait for
`MelodyAI is live: https://...` and keep the window open. Press **Ctrl+C** to stop.

- It uses port **8765** so it doesn't clash with other local apps. Use another port with
  `PORT=8766 ./backend/start-melody.sh`.
- It keeps the Mac awake (`caffeinate`) while running.
- If ngrok says the endpoint is *already online*, an old tunnel is still running:
  `pkill ngrok`, then start again.

## Run everything locally (development)

You need **Python 3.11**, **Node.js 20+** and **ffmpeg** on your PATH
(macOS: `brew install python@3.11 ffmpeg`; Windows: `winget install --id Gyan.FFmpeg -e`).

### Backend

```bash
cd backend
python3.11 -m venv .venv        # Windows: py -3.11 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt # large: includes PyTorch
uvicorn app:app --reload --port 8000
```

Open http://localhost:8000/docs to try the API by hand.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. On localhost the app talks to `http://localhost:8000`
automatically (see `src/config.js`).

## Deploy the frontend (Netlify)

1. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → pick `melody-ai`.
   The build settings come from `netlify.toml` (base `frontend`, build `npm run build`, publish `dist`).
2. **Site configuration → Environment variables**, add:
   ```
   VITE_API_URL = https://your-domain.ngrok-free.dev
   ```
3. **Deploys → Trigger deploy → Deploy site.** Vite reads `VITE_API_URL` at build time, so
   any change to it needs a new deploy. After that, every push to `main` redeploys automatically.

Without `VITE_API_URL` the site still builds and the demo works; uploads show
"Live processing isn't set up on this site yet".

## API

| Method | Path                           | Returns |
| ------ | ------------------------------ | ------- |
| GET    | `/`                            | `{ "ok": true }` (health check) |
| POST   | `/upload` (form field `file`)  | `{ job_id }`, with MP3/WAV/FLAC up to 20 MB |
| GET    | `/status/{job_id}`             | `{ status, progress, message }`, with status `queued, separating, analyzing, generating_midi, done, error` |
| GET    | `/result/{job_id}`             | `{ tempo, key, duration, chords, stems, midi_url, musicxml_url }` |
| GET    | `/files/{job_id}/{filename}`   | a generated file |

Jobs live in memory, and their files are deleted after 1 hour.

Backend environment variables (all optional; `start-melody.sh` sets the first two):

| Variable | Purpose |
| --- | --- |
| `PUBLIC_URL` | Base for the file links in `/result`, e.g. `https://your-domain.ngrok-free.dev`. Needed behind a tunnel, otherwise links would point to `localhost`. |
| `PORT` | Port for `start-melody.sh` (default 8765). |
| `ALLOWED_ORIGINS` | Extra frontend origins allowed by CORS, comma-separated. `*.netlify.app` and localhost are already allowed. |
| `JOBS_DIR` | Where uploads and results are stored (default `backend/jobs`). |
| `FFMPEG_PATH` | Path to ffmpeg if it isn't on the PATH. |

## Good to know

- Processing time on an Apple Silicon Mac: about 1.5 minutes for a 2-minute song (Demucs is the slow step).
- Several uploads at once run in parallel and each one slows the others down.
- ngrok's free plan allows about 1 GB of downloads a month, roughly 40–50 processed songs.
- Jobs are stored in memory, so restarting the backend forgets them.
- Chords are detected as major/minor triads only, and the sheet music is an automatic
  transcription of the first 60 seconds. Treat both as a starting point.
- To move the backend to a cloud host later (one with 4 GB+ RAM), use `backend/Dockerfile`
  and set `VITE_API_URL` in Netlify to the new address.
