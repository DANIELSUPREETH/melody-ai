import { Download } from "lucide-react";
import Card from "../ui/Card";

export default function Downloads({ result }) {
  const files = [
    ...Object.entries(result.stems).map(([name, url]) => ({
      label: name === "instrumental" ? "Instrumental (no vocals)" : name[0].toUpperCase() + name.slice(1),
      url,
      ext: "mp3",
    })),
    { label: "MIDI", url: result.midi_url, ext: "mid" },
    { label: "Sheet music", url: result.musicxml_url, ext: "musicxml" },
  ];

  return (
    <Card>
      <h3 className="font-semibold mb-4">Downloads</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {files.map((f) => (
          <a
            key={f.label}
            href={f.url}
            download={`melodyai-${f.label.split(" ")[0].toLowerCase()}.${f.ext}`}
            className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-cyan-400/60 transition text-sm"
          >
            <span>{f.label}</span>
            <span className="flex items-center gap-1 text-zinc-500">
              .{f.ext} <Download size={16} />
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}
