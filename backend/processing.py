"""
MelodyAI audio processing pipeline.

Steps (each one reports progress through the `update` callback):
  1. Convert the upload to a standard WAV with ffmpeg
  2. Demucs (htdemucs) -> vocals, drums, bass, other
  3. Mix drums + bass + other -> instrumental
  4. librosa -> tempo, key, chords
  5. basic-pitch -> MIDI
  6. music21 -> MusicXML (first ~60 seconds)
  7. Encode every stem to MP3 and delete the big WAV files
"""

import os
import shutil
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

STEM_NAMES = ["vocals", "drums", "bass", "other"]
SHEET_MUSIC_SECONDS = 60  # only engrave the start of the song so it renders fast
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_ffmpeg():
    """Return the ffmpeg executable, from FFMPEG_PATH or the system PATH."""
    path = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg")
    if not path:
        raise RuntimeError("ffmpeg was not found. Install it and make sure it is on your PATH.")
    return path


def run_ffmpeg(*args):
    """Run ffmpeg quietly and raise a readable error if it fails."""
    cmd = [find_ffmpeg(), "-y", "-loglevel", "error", *args]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()[:300]}")


def to_wav(src, dst):
    """Decode any MP3/WAV/FLAC into 44.1 kHz stereo WAV (what Demucs expects)."""
    run_ffmpeg("-i", str(src), "-ac", "2", "-ar", "44100", str(dst))


def to_mp3(src, dst):
    run_ffmpeg("-i", str(src), "-b:a", "192k", str(dst))


# ---------------------------------------------------------------------------
# 1. Stem separation
# ---------------------------------------------------------------------------

_demucs_model = None  # loaded once, then reused for every song


def separate_stems(wav_path, work_dir):
    """Run Demucs (htdemucs) and return {stem_name: wav_path}.

    We call the model directly instead of the `demucs` command line tool,
    because the CLI saves files through torchaudio, which in recent versions
    needs extra packages. Reading/writing with soundfile avoids that.
    """
    global _demucs_model
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model

    if _demucs_model is None:
        _demucs_model = get_model("htdemucs")  # downloads ~80 MB the first time
        _demucs_model.eval()
    model = _demucs_model

    # soundfile gives (samples, channels); Demucs wants (channels, samples)
    audio, sr = sf.read(wav_path, dtype="float32", always_2d=True)
    if sr != model.samplerate:
        raise RuntimeError(f"Expected {model.samplerate} Hz audio, got {sr} Hz.")
    wav = torch.from_numpy(audio.T.copy())

    # Normalize like the Demucs CLI does, separate, then undo the normalization
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    with torch.no_grad():
        sources = apply_model(model, ((wav - mean) / std)[None], device="cpu", split=True, overlap=0.25)[0]
    sources = sources * std + mean

    stems = {}
    for name, source in zip(model.sources, sources):  # drums, bass, other, vocals
        path = work_dir / f"{name}.wav"
        sf.write(path, source.numpy().T, model.samplerate)
        stems[name] = path
    return stems


def mix_instrumental(stems, dst):
    """Instrumental = drums + bass + other (everything except vocals)."""
    mix = None
    sr = None
    for name in ["drums", "bass", "other"]:
        audio, sr = sf.read(stems[name], dtype="float32")
        mix = audio if mix is None else mix + audio
    # Prevent clipping if the summed signal goes above 1.0
    peak = np.max(np.abs(mix))
    if peak > 1.0:
        mix = mix / peak
    sf.write(dst, mix, sr)
    return dst


# ---------------------------------------------------------------------------
# 2. Tempo, key and chords (librosa)
# ---------------------------------------------------------------------------

# Krumhansl-Schmuckler key profiles (how "important" each scale degree is)
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def detect_key(chroma):
    """Correlate the average chroma with all 24 rotated key profiles."""
    avg = chroma.mean(axis=1)
    best_score, best_key = -2.0, "C major"
    for i in range(12):
        for profile, mode in [(MAJOR_PROFILE, "major"), (MINOR_PROFILE, "minor")]:
            score = np.corrcoef(avg, np.roll(profile, i))[0, 1]
            if score > best_score:
                best_score, best_key = score, f"{NOTE_NAMES[i]} {mode}"
    return best_key


def chord_templates():
    """Build 24 triad templates: C, C#, ... B (major) and Cm, C#m, ... Bm (minor)."""
    names, templates = [], []
    for root in range(12):
        for suffix, intervals in [("", (0, 4, 7)), ("m", (0, 3, 7))]:
            t = np.zeros(12)
            for iv in intervals:
                t[(root + iv) % 12] = 1
            names.append(NOTE_NAMES[root] + suffix)
            templates.append(t / np.linalg.norm(t))
    return names, np.array(templates)


def detect_chords(chroma, beat_frames, sr, hop_length, duration):
    """Pick the best-matching chord for each beat, then merge repeats."""
    import librosa

    # Median chroma between consecutive beats
    beat_chroma = librosa.util.sync(chroma, beat_frames, aggregate=np.median)
    boundaries = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop_length)
    boundaries = np.concatenate([[0.0], boundaries, [duration]])

    names, templates = chord_templates()
    energy_threshold = 0.1 * np.max(np.linalg.norm(beat_chroma, axis=0))

    chords = []
    for i in range(beat_chroma.shape[1]):
        vec = beat_chroma[:, i]
        norm = np.linalg.norm(vec)
        chord = "N" if norm < energy_threshold else names[int(np.argmax(templates @ (vec / norm)))]
        start, end = float(boundaries[i]), float(boundaries[i + 1])
        if end <= start:
            continue
        if chords and chords[-1]["chord"] == chord:
            chords[-1]["end"] = round(end, 3)  # same chord continues
        else:
            chords.append({"start": round(start, 3), "end": round(end, 3), "chord": chord})
    return chords


def analyze(instrumental_path):
    """Return tempo (BPM), key, duration (s) and chord list."""
    import librosa

    y, sr = librosa.load(instrumental_path, sr=22050, mono=True)
    duration = float(len(y) / sr)
    hop = 512

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
    tempo = float(np.atleast_1d(tempo)[0])

    # Use only the harmonic part so drums don't confuse the chord detection
    harmonic = librosa.effects.harmonic(y)
    chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr, hop_length=hop)

    return {
        "tempo": round(tempo, 1),
        "key": detect_key(chroma),
        "duration": round(duration, 2),
        "chords": detect_chords(chroma, beat_frames, sr, hop, duration),
    }


# ---------------------------------------------------------------------------
# 3. MIDI (basic-pitch) and MusicXML (music21)
# ---------------------------------------------------------------------------

def generate_midi(audio_path, midi_path, tempo):
    """Transcribe notes with basic-pitch and save a MIDI file at the song's tempo."""
    import pretty_midi
    from basic_pitch import ICASSP_2022_MODEL_PATH
    from basic_pitch.inference import predict

    # Use the ONNX version of the model: it runs with the small onnxruntime
    # package, while the TensorFlow version fails to load with newer libraries.
    onnx_model = Path(ICASSP_2022_MODEL_PATH).with_suffix(".onnx")
    _, midi_data, _ = predict(str(audio_path), str(onnx_model))

    # basic-pitch always writes 120 BPM; copy the notes into a MIDI with the
    # detected tempo so the sheet music lines up with the real beats.
    out = pretty_midi.PrettyMIDI(initial_tempo=tempo or 120)
    for inst in midi_data.instruments:
        new_inst = pretty_midi.Instrument(program=0, name="Piano")
        new_inst.notes = list(inst.notes)
        out.instruments.append(new_inst)
    out.write(str(midi_path))
    return midi_path


def midi_to_musicxml(midi_path, xml_path, tempo):
    """Convert the first ~60 s of the MIDI to quantized MusicXML."""
    import pretty_midi
    from music21 import converter, metadata

    # Trim to the first SHEET_MUSIC_SECONDS so the score stays readable
    pm = pretty_midi.PrettyMIDI(str(midi_path))
    trimmed = pretty_midi.PrettyMIDI(initial_tempo=tempo or 120)
    for inst in pm.instruments:
        new_inst = pretty_midi.Instrument(program=inst.program, name=inst.name)
        new_inst.notes = [n for n in inst.notes if n.start < SHEET_MUSIC_SECONDS]
        for n in new_inst.notes:
            n.end = min(n.end, SHEET_MUSIC_SECONDS)
        trimmed.instruments.append(new_inst)
    trimmed_path = Path(midi_path).with_name("sheet_source.mid")
    trimmed.write(str(trimmed_path))

    # Quantize to a 16th-note grid (no triplets: AI transcription produces lots
    # of odd tuplets that make the score hard to read), then export
    score = converter.parse(str(trimmed_path), quantizePost=True, quarterLengthDivisors=(4,))
    score.metadata = metadata.Metadata(title="", composer="")  # hide the default "Music21" credit
    score.write("musicxml", fp=str(xml_path))
    trimmed_path.unlink(missing_ok=True)
    return xml_path


def pick_midi_source(stems, instrumental_path):
    """Use the 'other' stem (piano/guitar/synths) unless it is nearly silent."""
    audio, _ = sf.read(stems["other"], dtype="float32")
    rms = float(np.sqrt(np.mean(audio ** 2)))
    return stems["other"] if rms > 0.01 else instrumental_path


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

def process_song(input_path, job_dir, update):
    """Run every step for one uploaded song.

    `update(status, progress, message)` is called as work progresses.
    Returns a dict with the analysis and the names of the generated files.
    """
    job_dir = Path(job_dir)
    work_dir = job_dir / "work"
    work_dir.mkdir(parents=True, exist_ok=True)

    update("separating", 5, "Preparing audio...")
    wav_path = work_dir / "input.wav"
    to_wav(input_path, wav_path)

    update("separating", 10, "Separating stems with Demucs (this is the slow part)...")
    stems = separate_stems(wav_path, work_dir)

    update("separating", 55, "Creating instrumental track...")
    instrumental = mix_instrumental(stems, work_dir / "instrumental.wav")

    update("analyzing", 60, "Detecting tempo, key and chords...")
    analysis = analyze(instrumental)

    update("generating_midi", 70, "Transcribing notes to MIDI...")
    midi_path = job_dir / "notes.mid"
    bpm = round(analysis["tempo"])  # whole-number tempo reads better in notation
    generate_midi(pick_midi_source(stems, instrumental), midi_path, bpm)

    update("generating_midi", 85, "Creating sheet music...")
    xml_path = job_dir / "sheet.musicxml"
    midi_to_musicxml(midi_path, xml_path, bpm)

    update("generating_midi", 90, "Encoding MP3 files...")
    for name, path in {**stems, "instrumental": instrumental}.items():
        to_mp3(path, job_dir / f"{name}.mp3")

    # WAV files are large; only keep the MP3s
    shutil.rmtree(work_dir, ignore_errors=True)

    return {
        **analysis,
        "stem_files": {name: f"{name}.mp3" for name in STEM_NAMES + ["instrumental"]},
        "midi_file": midi_path.name,
        "musicxml_file": xml_path.name,
    }
