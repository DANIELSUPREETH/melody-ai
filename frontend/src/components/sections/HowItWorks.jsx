const STEPS = [
  { n: "1", title: "Upload", text: "Drop an MP3, WAV or FLAC file (up to 20 MB)." },
  { n: "2", title: "AI processing", text: "Demucs splits the stems, then we detect chords and transcribe notes." },
  { n: "3", title: "Play & practice", text: "Mix stems, slow down, loop sections and download everything." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center">How it Works</h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center px-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-lg">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold mt-5">{s.title}</h3>
              <p className="text-zinc-400 mt-2 text-sm leading-6">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
