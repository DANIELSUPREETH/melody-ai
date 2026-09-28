import Card from "../ui/Card";
import { formatTime } from "./format";

export default function PracticeControls({ player }) {
  const { rate, loop, currentTime } = player;

  // Set A, then B. Setting A again after a full loop starts a new loop.
  const setA = () => player.setLoop({ a: currentTime, b: null });
  const setB = () => {
    if (loop.a !== null && currentTime > loop.a) player.setLoop({ a: loop.a, b: currentTime });
  };
  const clear = () => player.setLoop({ a: null, b: null });

  const btn = "px-4 py-2 rounded-full border border-white/15 hover:border-cyan-400 transition text-sm disabled:opacity-40";

  return (
    <Card>
      <h3 className="font-semibold mb-4">Practice mode</h3>

      <label className="block text-sm text-zinc-400">
        Speed: <span className="text-white font-semibold">{rate.toFixed(2)}x</span> (pitch stays the same)
      </label>
      <input
        type="range"
        min={0.5}
        max={1.25}
        step={0.05}
        value={rate}
        onChange={(e) => player.setRate(Number(e.target.value))}
        className="w-full accent-cyan-400 mt-2"
      />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>0.5x</span>
        <button onClick={() => player.setRate(1)} className="hover:text-white">1x</button>
        <span>1.25x</span>
      </div>

      <div className="mt-6 text-sm text-zinc-400">A-B loop</div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button onClick={setA} className={btn}>
          Set A {loop.a !== null && `(${formatTime(loop.a)})`}
        </button>
        <button onClick={setB} disabled={loop.a === null} className={btn}>
          Set B {loop.b !== null && `(${formatTime(loop.b)})`}
        </button>
        <button onClick={clear} disabled={loop.a === null} className={btn}>
          Clear
        </button>
      </div>
      {loop.a !== null && loop.b === null && (
        <p className="text-xs text-zinc-500 mt-2">Play to the end of the section, then press “Set B”.</p>
      )}
    </Card>
  );
}
