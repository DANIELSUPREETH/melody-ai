import { AudioLines, FileMusic, Gauge, Layers, MicOff, Music } from "lucide-react";
import Card from "../ui/Card";

const FEATURES = [
  { icon: MicOff, title: "Vocal removal", text: "Get a clean instrumental or karaoke track of any song." },
  { icon: Layers, title: "Stem separation", text: "Split into vocals, drums, bass and other instruments." },
  { icon: Music, title: "Chord detection", text: "See the chords live, synced to playback." },
  { icon: AudioLines, title: "MIDI generation", text: "Turn the notes into a MIDI file for your DAW." },
  { icon: FileMusic, title: "Sheet music", text: "View and download the notes as MusicXML." },
  { icon: Gauge, title: "Practice mode", text: "Slow down without changing pitch and loop any section." },
];

export default function Features() {
  return (
    <section id="features" className="py-20 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center">
          Features
        </h2>

        <p className="text-zinc-400 text-center mt-4">
          Powerful AI tools for musicians.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="hover:border-cyan-400/40 transition">
              <Icon className="text-cyan-400 mb-4" size={28} />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-zinc-400 mt-2 text-sm leading-6">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
