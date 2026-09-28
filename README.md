# MelodyAI

Upload a song (MP3/WAV/FLAC) and get:

- **Vocal removal**: an instrumental / karaoke track
- **Stem separation**: vocals, drums, bass, other
- **Chord detection** synced to playback
- **MIDI** generated from the notes
- **Sheet music** (MusicXML, rendered in the browser)
- **Practice mode**: slow down without changing pitch, A-B loop, live chords

| Part     | Tech                                                      | Hosted on                    |
| -------- | --------------------------------------------------------- | ---------------------------- |
| Frontend | React + Vite + Tailwind (`frontend/`)                     | Netlify                      |
| Backend  | Python 3.11, FastAPI, Demucs, librosa, basic-pitch, music21 (`backend/`) | Hugging Face Spaces (Docker) |

```
melody-ai/
├── frontend/                 React app
│   ├── public/demo/          pre-processed demo (works without the backend)
│   └── src/
│       ├── config.js         API_BASE_URL (localhost in dev, HF Space in prod)
│       ├── services/api.js   upload, status polling, "waking up server" retries
│       ├── pages/            Home (landing + upload), Results (player)
│       ├── hooks/useStemPlayer.js   keeps all stems in sync, speed, A-B loop
│       └── components/
├── backend/
│   ├── app.py                FastAPI routes
│   ├── processing.py         Demucs → librosa → basic-pitch → music21
│   ├── requirements.txt
│   └── Dockerfile            for Hugging Face Spaces (port 7860)
└── netlify.toml
```

## Run locally

You need **Python 3.11**, **Node.js 20+** and **ffmpeg** on your PATH
(Windows: `winget install --id Gyan.FFmpeg -e`, then restart your terminal).

### Backend

```bash
cd backend
py -3.11 -m venv .venv          # macOS/Linux: python3.11 -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt # large: PyTorch + TensorFlow (~3 GB)
uvicorn app:app --reload --port 8000
```

Open http://localhost:8000/docs to try the API by hand.
The first upload downloads the Demucs model (~80 MB).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app talks to `http://localhost:8000` automatically
when running on localhost (see `src/config.js`).

## API

| Method | Path                           | Returns |
| ------ | ------------------------------ | ------- |
| POST   | `/upload` (form field `file`)  | `{ job_id }`, with MP3/WAV/FLAC up to 20 MB |
| GET    | `/status/{job_id}`             | `{ status, progress, message }`, with status `queued, separating, analyzing, generating_midi, done, error` |
| GET    | `/result/{job_id}`             | `{ tempo, key, duration, chords, stems, midi_url, musicxml_url }` |
| GET    | `/files/{job_id}/{filename}`   | a generated file |

Jobs live in memory, and their files are deleted after 1 hour.

## Deploy

### 1. GitHub

```bash
git add .
git commit -m "MelodyAI: backend, upload flow, player, deployment"
gh repo create melodyai --public --source=. --push
```

Without the `gh` CLI: create an empty repo named `melodyai` on github.com, then

```bash
git remote add origin https://github.com/<your-username>/melodyai.git
git push -u origin main
```

### 2. Hugging Face Spaces (backend)

1. Create a free account at https://huggingface.co and an access token with
   **write** permission (Settings → Access Tokens).
2. Create a new Space: **SDK = Docker**, template **Blank**, hardware **CPU basic (free)**,
   name `melodyai`.
3. Push only the `backend/` folder to the Space (from the repo root):

   ```bash
   git remote add hf https://huggingface.co/spaces/<your-hf-username>/melodyai
   git subtree push --prefix backend hf main
   ```

   When asked for a password, paste your HF token.
4. In the Space → Settings → Variables, add
   `ALLOWED_ORIGINS = https://<your-site>.netlify.app`
   (`*.netlify.app` is already allowed, so this is only needed for a custom domain).
5. Wait for the build (~10 min the first time). Your API is at
   `https://<your-hf-username>-melodyai.hf.space`.

To update the backend later, run the same `git subtree push` command again.

### 3. Point the frontend at the Space

Edit `PRODUCTION_API` in `frontend/src/config.js`, then commit and push to GitHub.

### 4. Netlify (frontend)

1. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → pick `melodyai`.
2. The settings come from `netlify.toml` (base `frontend`, build `npm run build`, publish `dist`).
   Click **Deploy**.
3. Every push to `main` now redeploys automatically.

## Good to know

- Free Hugging Face Spaces **sleep after ~48 h of inactivity** and restart slowly, so the
  frontend shows "Waking up server..." and retries.
- On the free 2-vCPU machine, a 3–4 minute song takes a few minutes to process. Demucs is the slow step.
- Jobs are stored in memory, so a restart of the Space forgets them.
- Chords are detected as major/minor triads only, and the sheet music is an automatic
  transcription of the first 60 seconds. Treat both as a starting point.
