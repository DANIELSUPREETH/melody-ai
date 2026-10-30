import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import StemMixer from "../components/player/StemMixer";
import ChordDisplay from "../components/player/ChordDisplay";
import PracticeControls from "../components/player/PracticeControls";
import Downloads from "../components/player/Downloads";
import SheetMusic from "../components/player/SheetMusic";
import { formatTime } from "../components/player/format";
import useStemPlayer from "../hooks/useStemPlayer";
import { getDemoResult, getResult, wakeServer } from "../services/api";

const MIXER_STEMS = ["vocals", "drums", "bass", "other"];

export default function Results() {
  const [params] = useSearchParams();
  const jobId = params.get("job");
  const isDemo = params.get("demo") !== null;

  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("Loading your song...");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (isDemo) {
          setResult(await getDemoResult());
        } else if (jobId) {
          await wakeServer(() => setMessage("Connecting to the processing server..."));
          setResult(await getResult(jobId));
        } else {
          setError("No song selected. Upload a song or try the demo.");
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [jobId, isDemo]);

  return (
    <main className="min-h-screen text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-10">
        {error ? (
          <div className="text-center py-20">
            <p className="text-red-300 text-lg">{error}</p>
            <Link to="/#upload" className="inline-block mt-6 px-6 py-3 rounded-full border border-white/15 hover:border-cyan-400">
              Back to upload
            </Link>
          </div>
        ) : !result ? (
          <p className="text-center text-zinc-400 py-20">{message}</p>
        ) : (
          <ResultView result={result} isDemo={isDemo} />
        )}
      </div>
      <Footer />
    </main>
  );
}

// Separate component so the player hook only runs once we have a result
function ResultView({ result, isDemo }) {
  const stems = Object.fromEntries(MIXER_STEMS.map((n) => [n, result.stems[n]]));
  const player = useStemPlayer(stems);
  const [tab, setTab] = useState("practice");

  const tabClass = (t) =>
    `px-5 py-2 rounded-full text-sm transition ${
      tab === t ? "bg-gradient-to-r from-cyan-500 to-violet-600" : "border border-white/10 hover:border-cyan-400"
    }`;

  return (
    <>
      {/* Song info */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          {isDemo && <div className="text-xs tracking-widest text-cyan-300 mb-2">DEMO</div>}
          <h1 className="text-3xl md:text-4xl font-extrabold">{result.title || "Your song"}</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Info label="Key" value={result.key} />
          <Info label="Tempo" value={`${Math.round(result.tempo)} BPM`} />
          <Info label="Length" value={formatTime(result.duration)} />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button className={tabClass("practice")} onClick={() => setTab("practice")}>Mixer & Practice</button>
        <button className={tabClass("sheet")} onClick={() => setTab("sheet")}>Sheet music</button>
      </div>

      {tab === "practice" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ChordDisplay chords={result.chords} currentTime={player.currentTime} onSeek={player.seek} />
            <StemMixer player={player} />
          </div>
          <div className="space-y-6">
            <PracticeControls player={player} />
            <Downloads result={result} />
          </div>
        </div>
      ) : (
        <SheetMusic url={result.musicxml_url} />
      )}
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
