"""
MelodyAI backend (FastAPI).

Run locally:
    uvicorn app:app --reload --port 8000
"""

import os
import shutil
import time
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from processing import process_song

JOBS_DIR = Path(os.environ.get("JOBS_DIR", Path(__file__).parent / "jobs"))
JOBS_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac"}
JOB_MAX_AGE_SECONDS = 60 * 60  # delete jobs after 1 hour

# Frontend origins allowed to call the API. Add your Netlify URL via env var,
# e.g. ALLOWED_ORIGINS="https://melodyai.netlify.app"
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    *[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]

app = FastAPI(title="MelodyAI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.netlify\.app",  # Netlify preview + production URLs
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store: { job_id: {status, progress, message, result} }
# (Lost on restart, which is fine because job files expire after 1 hour anyway.)
jobs = {}


def cleanup_old_jobs():
    """Delete job folders older than JOB_MAX_AGE_SECONDS."""
    now = time.time()
    for folder in JOBS_DIR.iterdir():
        if folder.is_dir() and now - folder.stat().st_mtime > JOB_MAX_AGE_SECONDS:
            shutil.rmtree(folder, ignore_errors=True)
            jobs.pop(folder.name, None)


def run_job(job_id, input_path):
    """Background task: process the song and store the result on the job."""

    def update(status, progress, message):
        jobs[job_id].update(status=status, progress=progress, message=message)

    try:
        result = process_song(input_path, JOBS_DIR / job_id, update)
        jobs[job_id]["result"] = result
        update("done", 100, "Done!")
    except Exception as e:  # show a readable message instead of crashing
        print(f"[job {job_id}] failed: {e!r}")
        update("error", jobs[job_id]["progress"], f"Processing failed: {e}")


@app.on_event("startup")
def on_startup():
    cleanup_old_jobs()


@app.get("/")
def health():
    """Simple check the frontend uses to wake up a sleeping server."""
    return {"ok": True}


@app.post("/upload")
async def upload(file: UploadFile, background_tasks: BackgroundTasks):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported format. Please upload an MP3, WAV or FLAC file.")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is too large. The maximum size is 20 MB.")
    if not data:
        raise HTTPException(400, "The file is empty.")

    cleanup_old_jobs()

    job_id = uuid.uuid4().hex
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir()
    input_path = job_dir / f"original{ext}"
    input_path.write_bytes(data)

    jobs[job_id] = {"status": "queued", "progress": 0, "message": "Waiting to start...", "result": None}
    background_tasks.add_task(run_job, job_id, input_path)
    return {"job_id": job_id}


def get_job(job_id):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found. It may have expired, please upload the song again.")
    return job


@app.get("/status/{job_id}")
def status(job_id: str):
    job = get_job(job_id)
    return {k: job[k] for k in ("status", "progress", "message")}


@app.get("/result/{job_id}")
def result(job_id: str, request: Request):
    job = get_job(job_id)
    if job["status"] != "done":
        raise HTTPException(409, "This job is not finished yet.")

    r = job["result"]
    base = str(request.base_url).rstrip("/")
    file_url = lambda name: f"{base}/files/{job_id}/{name}"
    return {
        "tempo": r["tempo"],
        "key": r["key"],
        "duration": r["duration"],
        "chords": r["chords"],
        "stems": {name: file_url(f) for name, f in r["stem_files"].items()},
        "midi_url": file_url(r["midi_file"]),
        "musicxml_url": file_url(r["musicxml_file"]),
    }


@app.get("/files/{job_id}/{filename}")
def files(job_id: str, filename: str):
    # Block path tricks like "../../etc/passwd"
    if "/" in filename or "\\" in filename or ".." in filename or ".." in job_id:
        raise HTTPException(400, "Invalid file name.")
    path = JOBS_DIR / job_id / filename
    if not path.is_file() or filename.startswith("original"):
        raise HTTPException(404, "File not found.")
    return FileResponse(path, filename=filename)
