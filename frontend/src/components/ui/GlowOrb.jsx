export default function GlowOrb() {
  return (
    <div className="relative w-[420px] h-[420px] rounded-full">
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 blur-3xl opacity-40 animate-pulse"></div>

      <div className="absolute inset-8 rounded-full border border-white/10 backdrop-blur-xl bg-white/5"></div>

      <div className="absolute inset-16 rounded-full border border-cyan-400/30"></div>
    </div>
  );
}