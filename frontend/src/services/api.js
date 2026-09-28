import { API_BASE_URL } from "../config";

// Free Hugging Face Spaces go to sleep when idle. The first request after that
// can hang or fail for ~30s while the server boots, so we retry a few times.
const WAKE_TIMEOUT_MS = 10000;
const WAKE_RETRIES = 6;

async function fetchWithTimeout(url, options = {}, timeoutMs = WAKE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Read the error message FastAPI sends back ({ detail: "..." })
async function errorMessage(res) {
  try {
    const body = await res.json();
    return body.detail || `Server error (${res.status})`;
  } catch {
    return `Server error (${res.status})`;
  }
}

/**
 * Ping the server until it answers. Calls onWaking() the first time it
 * doesn't respond so the UI can show "Waking up server...".
 */
export async function wakeServer(onWaking) {
  for (let attempt = 0; attempt < WAKE_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/`);
      if (res.ok) return;
    } catch {
      // timeout or network error: server is probably asleep
    }
    if (attempt === 0 && onWaking) onWaking();
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("The server is not responding. Please try again in a minute.");
}

/** Upload a file. onProgress(percent) reports upload progress. Returns job_id. */
export function uploadSong(file, onProgress) {
  // XMLHttpRequest (not fetch) because it can report upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.open("POST", `${API_BASE_URL}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body.job_id);
      else reject(new Error(body.detail || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Could not reach the server. Check your connection."));
    xhr.send(form);
  });
}

export async function getStatus(jobId) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/status/${jobId}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function getResult(jobId) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/result/${jobId}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

/** The demo result ships with the site, so it works even if the backend sleeps. */
export async function getDemoResult() {
  const res = await fetch("/demo/result.json");
  if (!res.ok) throw new Error("Could not load the demo.");
  return res.json();
}
