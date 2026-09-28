import { useCallback, useEffect, useRef, useState } from "react";

// If a stem drifts more than this many seconds from the others, snap it back
const MAX_DRIFT = 0.15;

/**
 * Plays several audio files (stems) together as if they were one track.
 * Each stem gets its own <audio> element; the first stem is the "master"
 * clock and the others are kept in sync with it.
 *
 * stems: { vocals: url, drums: url, ... }
 */
export default function useStemPlayer(stems) {
  const names = Object.keys(stems);
  const audiosRef = useRef({});
  const rafRef = useRef(null);
  const loopRef = useRef({ a: null, b: null });

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumes, setVolumes] = useState(() => Object.fromEntries(names.map((n) => [n, 1])));
  const [muted, setMuted] = useState({});
  const [soloed, setSoloed] = useState({});
  const [rate, setRateState] = useState(1);
  const [loop, setLoopState] = useState({ a: null, b: null });

  // Create one <audio> element per stem
  const stemsKey = JSON.stringify(stems);
  useEffect(() => {
    const audios = {};
    for (const [name, url] of Object.entries(stems)) {
      const el = new Audio(url);
      el.preload = "auto";
      el.preservesPitch = true; // keep the pitch when slowing down
      el.webkitPreservesPitch = true; // older Safari
      audios[name] = el;
    }
    audiosRef.current = audios;

    const master = Object.values(audios)[0];
    const onMeta = () => setDuration(master.duration);
    const onEnded = () => setPlaying(false);
    master.addEventListener("loadedmetadata", onMeta);
    master.addEventListener("ended", onEnded);

    return () => {
      master.removeEventListener("loadedmetadata", onMeta);
      master.removeEventListener("ended", onEnded);
      Object.values(audios).forEach((el) => {
        el.pause();
        el.src = "";
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemsKey]);

  // Apply volume / mute / solo whenever they change
  useEffect(() => {
    const anySolo = Object.values(soloed).some(Boolean);
    for (const [name, el] of Object.entries(audiosRef.current)) {
      const audible = anySolo ? soloed[name] : !muted[name];
      el.volume = audible ? volumes[name] ?? 1 : 0;
    }
  }, [volumes, muted, soloed, stemsKey]);

  const seek = useCallback((t) => {
    for (const el of Object.values(audiosRef.current)) el.currentTime = t;
    setCurrentTime(t);
  }, []);

  // While playing: update the time display, keep stems in sync, handle A-B loop
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const els = Object.values(audiosRef.current);
      const t = els[0].currentTime;
      for (const el of els.slice(1)) {
        if (Math.abs(el.currentTime - t) > MAX_DRIFT) el.currentTime = t;
      }
      const { a, b } = loopRef.current;
      if (a !== null && b !== null && t >= b) seek(a);
      else setCurrentTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, seek]);

  const play = useCallback(async () => {
    const els = Object.values(audiosRef.current);
    const t = els[0].currentTime;
    els.forEach((el) => (el.currentTime = t));
    try {
      await Promise.all(els.map((el) => el.play()));
      setPlaying(true);
    } catch (e) {
      console.error("Playback failed", e);
    }
  }, []);

  const pause = useCallback(() => {
    Object.values(audiosRef.current).forEach((el) => el.pause());
    setPlaying(false);
  }, []);

  const setRate = useCallback((r) => {
    Object.values(audiosRef.current).forEach((el) => (el.playbackRate = r));
    setRateState(r);
  }, []);

  const setLoop = useCallback((next) => {
    loopRef.current = next;
    setLoopState(next);
  }, []);

  return {
    names,
    playing,
    currentTime,
    duration,
    volumes,
    muted,
    soloed,
    rate,
    loop,
    play,
    pause,
    seek,
    setRate,
    setLoop,
    setVolume: (name, v) => setVolumes((s) => ({ ...s, [name]: v })),
    toggleMute: (name) => setMuted((s) => ({ ...s, [name]: !s[name] })),
    toggleSolo: (name) => setSoloed((s) => ({ ...s, [name]: !s[name] })),
  };
}
