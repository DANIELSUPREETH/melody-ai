// Credits the open-source tools that do the heavy lifting
const TOOLS = ["Demucs", "librosa", "basic-pitch", "music21", "OpenSheetMusicDisplay"];

export default function TrustedBy() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-xs tracking-widest text-zinc-500 mb-6">POWERED BY OPEN-SOURCE AI</p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-zinc-400 font-semibold">
          {TOOLS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
