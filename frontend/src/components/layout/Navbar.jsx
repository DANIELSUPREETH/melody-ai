function Navbar() {
  return (
    <nav className="flex items-center justify-between px-10 py-6">
      <h1 className="text-3xl font-bold text-cyan-400">
        MelodyAI
      </h1>

      <button className="bg-cyan-500 px-5 py-2 rounded-lg hover:bg-cyan-600 transition">
        Login
      </button>
    </nav>
  );
}

export default Navbar;