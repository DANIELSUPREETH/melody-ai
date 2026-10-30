import { API_BASE_URL } from "../config";

// The backend may be offline or still starting, so the first request can hang
// or fail for a while. We retry a few times before giving up.
const WAKE_TIMEOUT_MS = 10000;
const WAKE_RETRIES = 6;

// ngrok's free plan shows a "you are about to visit" page to browsers unless
// this header is sent. It's harmless on any other host.
const TUNNEL_HEADERS = { "ngrok-skip-browser-warning": "true" };

async function fetchWithTimeout(url, options = {}, timeoutMs = WAKE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      headers: { ...TUNNEL_HEADERS, ...options.headers },
      signal: controller.signal,
    });
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
  if (!API_BASE_URL) {
    throw new Error("Live processing isn't set up on this site yet. Try the demo instead.");
  }
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
  throw new Error(
    "The processing server is offline right now. Please try again later, or open the demo."
  );
}

/** Upload a file. onProgress(percent) reports upload progress. Returns job_id. */
export function uploadSong(file, onProgress) {
  // XMLHttpRequest (not fetch) because it can report upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.open("POST", `${API_BASE_URL}/upload`);
    for (const [k, v] of Object.entries(TUNNEL_HEADERS)) xhr.setRequestHeader(k, v);
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

// Download one result file and return a local blob: URL for it.
// <audio> tags and download links can't send TUNNEL_HEADERS, so we fetch
// the files ourselves and hand them local URLs instead.
async function toBlobUrl(url) {
  const res = await fetch(url, { headers: TUNNEL_HEADERS });
  if (!res.ok) throw new Error("Could not download the results. Please try again.");
  return URL.createObjectURL(await res.blob());
}

export async function getResult(jobId) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/result/${jobId}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  const result = await res.json();

  const stemNames = Object.keys(result.stems);
  const [stemUrls, midiUrl, xmlUrl] = await Promise.all([
    Promise.all(stemNames.map((n) => toBlobUrl(result.stems[n]))),
    toBlobUrl(result.midi_url),
    toBlobUrl(result.musicxml_url),
  ]);
  return {
    ...result,
    stems: Object.fromEntries(stemNames.map((n, i) => [n, stemUrls[i]])),
    midi_url: midiUrl,
    musicxml_url: xmlUrl,
  };
}

/** The demo result ships with the site, so it works even if the backend sleeps. */
export async function getDemoResult() {
  const res = await fetch("/demo/result.json");
  if (!res.ok) throw new Error("Could not load the demo.");
  return res.json();
}
