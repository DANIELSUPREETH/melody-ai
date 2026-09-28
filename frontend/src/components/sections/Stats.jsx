const STATS = [
  { value: "Free", label: "No payment, ever" },
  { value: "No signup", label: "Just upload a song" },
  { value: "Open-source", label: "AI models" },
  { value: "MP3 · WAV · FLAC", label: "Up to 20 MB" },
];

export default function Stats() {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.value} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-sm text-zinc-400 mt-2">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
