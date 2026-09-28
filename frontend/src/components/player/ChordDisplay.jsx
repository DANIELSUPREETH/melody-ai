import { useEffect, useRef } from "react";
import Card from "../ui/Card";

// "N" means no chord was detected (silence or just drums)
const show = (chord) => (chord === "N" ? "–" : chord);

export default function ChordDisplay({ chords, currentTime, onSeek }) {
  const index = chords.findIndex((c) => currentTime >= c.start && currentTime < c.end);
  const current = chords[index];
  const next = chords[index + 1];
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Keep the active chord centered in the timeline (scrolls only the strip, not the page)
  useEffect(() => {
    const strip = stripRef.current;
    const chip = activeRef.current;
    if (!strip || !chip) return;
    const target = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  return (
    <Card>
      <div className="flex items-end justify-center gap-8">
        <div className="text-center">
          <div className="text-xs tracking-widest text-zinc-500">NOW</div>
          <div className="text-6xl md:text-7xl font-extrabold text-cyan-400 min-w-24">{current ? show(current.chord) : "–"}</div>
        </div>
        <div className="text-center pb-2">
          <div className="text-xs tracking-widest text-zinc-500">NEXT</div>
          <div className="text-3xl font-bold text-zinc-400">{next ? show(next.chord) : "–"}</div>
        </div>
      </div>

      {/* Scrollable timeline; click a chord to jump there */}
      <div ref={stripRef} className="relative mt-6 flex gap-2 overflow-x-auto pb-2">
        {chords.map((c, i) => (
          <button
            key={i}
            ref={i === index ? activeRef : null}
            onClick={() => onSeek(c.start)}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
              i === index ? "bg-cyan-400 text-black border-cyan-400" : "border-white/10 text-zinc-300 hover:border-cyan-400/50"
            }`}
          >
            {show(c.chord)}
          </button>
        ))}
      </div>
    </Card>
  );
}
