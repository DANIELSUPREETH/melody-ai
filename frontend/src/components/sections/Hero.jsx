import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import GlowOrb from "../ui/GlowOrb";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-36 pb-28">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <div className="inline-flex px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs tracking-widest text-cyan-300 mb-8">
              AI POWERED MUSIC INTELLIGENCE
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">

              Transform any song

              <br />

              into{" "}

              <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
                pure music
              </span>

            </h1>

            <p className="mt-8 text-zinc-400 text-lg max-w-xl leading-8">

              Remove vocals, isolate instruments,
              generate MIDI, chords and sheet music
              using advanced AI.

            </p>

            <div className="flex flex-wrap gap-5 mt-10">

              <a href="#upload">
                <Button>
                  Upload Song
                </Button>
              </a>

              <Link
                to="/app?demo=1"
                className="px-6 py-3 rounded-full border border-white/10 hover:border-cyan-400 transition duration-300"
              >
                Try Demo
              </Link>

            </div>

          </motion.div>

          {/* RIGHT */}

          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: .8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <GlowOrb />
          </motion.div>

        </div>

      </div>
    </section>
  );
}