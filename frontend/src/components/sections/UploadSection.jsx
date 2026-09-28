import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { ALLOWED_EXTENSIONS, MAX_FILE_MB } from "../../config";
import { getStatus, uploadSong, wakeServer } from "../../services/api";

const POLL_MS = 2000;

// Check the file before sending it, so users get instant feedback
function validate(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Wrong format. Please choose an MP3, WAV or FLAC file.";
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is ${MAX_FILE_MB} MB.`;
  }
  return null;
}

export default function UploadSection() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleFile(file) {
    const problem = validate(file);
    if (problem) return setError(problem);

    setError("");
    setBusy(true);
    setProgress(0);

    try {
      setMessage("Connecting to server...");
      await wakeServer(() => setMessage("Waking up server, this can take ~30s..."));

      setMessage("Uploading...");
      // Upload counts as the first 5% of the bar
      const jobId = await uploadSong(file, (pct) => setProgress(Math.round(pct * 0.05)));

      // Poll the backend until processing finishes
      while (true) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await getStatus(jobId);
        setProgress(Math.max(5, s.progress));
        setMessage(s.message);
        if (s.status === "done") return navigate(`/app?job=${jobId}`);
        if (s.status === "error") throw new Error(s.message);
      }
    } catch (e) {
      setError(e.name === "AbortError" ? "The server took too long to respond. Please try again." : e.message);
      setBusy(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    disabled: busy,
    onDrop: (files) => files[0] && handleFile(files[0]),
  });

  return (
    <section id="upload" className="py-20 scroll-mt-28">
      <div className="max-w-3xl mx-auto px-6">
        <div
          {...getRootProps()}
          className={`rounded-3xl border-2 border-dashed p-10 md:p-14 text-center transition cursor-pointer
            ${isDragActive ? "border-cyan-400 bg-cyan-400/5" : "border-white/15 bg-white/5 hover:border-cyan-400/60"}
            ${busy ? "cursor-default" : ""}`}
        >
          <input {...getInputProps()} />

          <UploadCloud className="mx-auto mb-5 text-cyan-400" size={48} />

          {!busy ? (
            <>
              <h2 className="text-2xl md:text-3xl font-bold">Drop your song here</h2>
              <p className="text-zinc-400 mt-3">or click to browse · MP3, WAV or FLAC · max {MAX_FILE_MB} MB</p>
            </>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-bold">Processing your song</h2>
              <p className="text-zinc-400 mt-3 min-h-6">{message}</p>
              <div className="mt-6 h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500 mt-2">{progress}% · usually 1–3 minutes</p>
            </>
          )}

          {error && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
