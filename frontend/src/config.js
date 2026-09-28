// Where the backend lives.
// - Local dev: http://localhost:8000 (run `uvicorn app:app --reload --port 8000`)
// - Production: your Hugging Face Space URL (update after deploying)
// You can also override it with VITE_API_URL in a .env file.
const PRODUCTION_API = "https://YOUR-HF-USERNAME-melodyai.hf.space";

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocal ? "http://localhost:8000" : PRODUCTION_API);

export const MAX_FILE_MB = 20;
export const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".flac"];
