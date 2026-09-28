import { Pause, Play } from "lucide-react";
import Card from "../ui/Card";
import { formatTime } from "./format";

const LABELS = { vocals: "Vocals", drums: "Drums", bass: "Bass", other: "Other" };

export default function StemMixer({ player }) {
  const { names, playing, currentTime, duration, volumes, muted, soloed, loop } = player;

  return (
    <Card>
      {/* Transport: play/pause + seek bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={playing ? player.pause : player.play}
          className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 flex items-center justify-center hover:scale-105 transition"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="relative">
            {/* Highlight the A-B loop region behind the seek bar */}
            {loop.a !== null && loop.b !== null && duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 rounded bg-violet-500/40 pointer-events-none"
                style={{ left: `${(loop.a / duration) * 100}%`, width: `${((loop.b - loop.a) / duration) * 100}%` }}
              />
            )}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="w-full accent-cyan-400 relative"
              aria-label="Seek"
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* One row per stem */}
      <div className="mt-6 space-y-3">
        {names.map((name) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium">{LABELS[name] || name}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volumes[name] ?? 1}
              onChange={(e) => player.setVolume(name, Number(e.target.value))}
              className="flex-1 min-w-0 accent-violet-500"
              aria-label={`${name} volume`}
            />
            <button
              onClick={() => player.toggleMute(name)}
              className={`w-9 h-9 rounded-lg text-xs font-bold border transition ${
                muted[name] ? "bg-red-500/80 border-red-500" : "border-white/15 hover:border-white/40"
              }`}
              title="Mute"
            >
              M
            </button>
            <button
              onClick={() => player.toggleSolo(name)}
              className={`w-9 h-9 rounded-lg text-xs font-bold border transition ${
                soloed[name] ? "bg-yellow-400 text-black border-yellow-400" : "border-white/15 hover:border-white/40"
              }`}
              title="Solo"
            >
              S
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
