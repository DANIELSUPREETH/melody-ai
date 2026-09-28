export default function GlowOrb() {
  return (
    // Shrinks on phones so the orb doesn't overflow the screen
    <div className="relative w-[420px] h-[420px] shrink-0 scale-[0.7] sm:scale-100 -my-16 sm:my-0">

      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 blur-3xl opacity-30 animate-pulse"></div>

      <div className="absolute inset-8 rounded-full border border-cyan-400/30"></div>

      <div className="absolute inset-16 rounded-full border border-violet-500/40"></div>

      <div className="absolute inset-24 rounded-full border border-white/10"></div>

      <div className="absolute inset-[130px] rounded-full bg-white/5 backdrop-blur-2xl flex items-center justify-center text-7xl">
        🎵
      </div>

    </div>
  );
}