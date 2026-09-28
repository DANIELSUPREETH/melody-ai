import Button from "../ui/Button";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50">

      <div className="max-w-7xl mx-auto px-6">

        <nav className="mt-5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl">

          <div className="h-16 flex items-center justify-between px-5 sm:px-8">

            <a href="/" className="text-xl font-bold">
              Melody<span className="text-cyan-400">AI</span>
            </a>

            <div className="hidden md:flex gap-10 text-sm text-zinc-300">

              <a href="/#features" className="hover:text-white transition">Features</a>
              <a href="/#how-it-works" className="hover:text-white transition">How it Works</a>
              <a href="/app?demo=1" className="hover:text-white transition">Demo</a>

            </div>

            <a href="/#upload">
              <Button className="text-sm">
                Get Started
              </Button>
            </a>

          </div>

        </nav>

      </div>

    </header>
  );
}