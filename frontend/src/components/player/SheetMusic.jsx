import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";

// OpenSheetMusicDisplay is loaded from a CDN only when this tab is opened
const OSMD_URL = "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1/build/opensheetmusicdisplay.min.js";

let osmdPromise = null;
function loadOSMD() {
  if (!osmdPromise) {
    osmdPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = OSMD_URL;
      script.onload = () => resolve(window.opensheetmusicdisplay);
      script.onerror = () => {
        osmdPromise = null;
        reject(new Error("Could not load the sheet music viewer."));
      };
      document.head.appendChild(script);
    });
  }
  return osmdPromise;
}

export default function SheetMusic({ url }) {
  const containerRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lib, xml] = await Promise.all([
          loadOSMD(),
          fetch(url).then((r) => {
            if (!r.ok) throw new Error("Could not download the sheet music.");
            return r.text();
          }),
        ]);
        if (cancelled) return;
        containerRef.current.innerHTML = "";
        const osmd = new lib.OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          drawTitle: false,
          backend: "svg",
        });
        await osmd.load(xml);
        osmd.render();
        if (!cancelled) setState("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Card>
      <p className="text-sm text-zinc-400 mb-4">
        Auto-transcribed from the first minute of the song. AI transcription is a starting point, not a perfect score.
      </p>
      {state === "loading" && <p className="text-zinc-400">Rendering sheet music...</p>}
      {state === "error" && <p className="text-red-300">{error}</p>}
      {/* OSMD draws black notes, so give it a white page. The div must stay
          visible while rendering, otherwise OSMD measures a width of 0. */}
      <div
        ref={containerRef}
        className={`rounded-xl bg-white text-black overflow-x-auto p-2 ${state === "error" ? "hidden" : ""}`}
      />
    </Card>
  );
}
