// ── Timing ────────────────────────────────────────────────────────────────────

export const BPM = 120;
export const BEAT_DUR = 60 / BPM; // 0.5 s per beat
export const BASE_FREQ = 261.63; // C4

/** Total beats per loop iteration — all patterns must fit within this. */
export const LOOP_BEATS = 16;
export const LOOP_DURATION = LOOP_BEATS * BEAT_DUR;

// ── Note patterns ─────────────────────────────────────────────────────────────
// Format: [semitones from BASE_FREQ, duration in beats].
// Edit these arrays to change the music without touching any other file.

/** Lead melody — bouncy C-major space-adventure theme, 16 beats */
const MELODY: [number, number][] = [
  // Bar 1 — rise then settle
  [4, 0.5],
  [7, 0.5],
  [9, 1],
  [7, 0.5],
  [4, 0.5],
  [0, 1],
  // Bar 2 — runs
  [2, 0.5],
  [4, 0.5],
  [7, 0.5],
  [9, 0.5],
  [7, 0.5],
  [4, 0.5],
  [2, 1],
  // Bar 3 — ascent to C5
  [4, 0.5],
  [7, 0.5],
  [9, 0.5],
  [12, 0.5],
  [11, 0.5],
  [9, 0.5],
  [7, 1],
  // Bar 4 — cascade back to root
  [12, 0.5],
  [11, 0.5],
  [9, 0.5],
  [7, 0.5],
  [4, 0.5],
  [2, 0.5],
  [0, 1],
]; // 16 beats

/** Soft chord-colour pads, long tones, 16 beats */
const HARMONY: [number, number][] = [
  [-3, 2],
  [0, 2],
  [2, 2],
  [0, 2],
  [-3, 2],
  [-5, 2],
  [0, 2],
  [-5, 2],
]; // 16 beats

/** Sub-bass — root notes 1 octave below, 16 beats */
const BASS: [number, number][] = [
  [-12, 2],
  [-12, 2],
  [-10, 2],
  [-12, 2],
  [-12, 2],
  [-3, 2],
  [-5, 2],
  [-12, 2],
]; // 16 beats

/** Arpeggio — sparkly 8th-note chord tones, 16 beats */
const ARP: [number, number][] = [
  [0, 0.5],
  [4, 0.5],
  [7, 0.5],
  [12, 0.5],
  [7, 0.5],
  [4, 0.5],
  [0, 0.5],
  [4, 0.5],
  [7, 0.5],
  [12, 0.5],
  [7, 0.5],
  [4, 0.5],
  [7, 0.5],
  [9, 0.5],
  [7, 0.5],
  [4, 0.5],
  [0, 0.5],
  [4, 0.5],
  [7, 0.5],
  [9, 0.5],
  [12, 0.5],
  [9, 0.5],
  [7, 0.5],
  [4, 0.5],
  [7, 0.5],
  [12, 0.5],
  [9, 0.5],
  [7, 0.5],
  [4, 0.5],
  [2, 0.5],
  [0, 0.5],
  [4, 0.5],
]; // 16 beats

// ── Drum grids ────────────────────────────────────────────────────────────────
// Beat offsets (in beats) within the 16-beat loop.

const KICK_BEATS = [0, 2, 4, 6, 8, 10, 12, 14]; // beats 1+3 per bar
const SNARE_BEATS = [1, 3, 5, 7, 9, 11, 13, 15]; // beats 2+4 per bar
const HIHAT_BEATS = Array.from({ length: 32 }, (_, i) => i * 0.5); // every 8th note

// ── Schedule functions ────────────────────────────────────────────────────────
// Pure functions: each writes Web Audio nodes into ctx and routes to the
// provided output node(s).  MusicPlayer calls all of them every loop tick.

/**
 * Lead — filtered square wave, also sent to delayBus for the space-echo effect.
 */
export function scheduleMelody(ctx: AudioContext, out: AudioNode, delayBus: AudioNode, startTime: number): void {
  let t = startTime;
  for (const [semi, beats] of MELODY) {
    const freq = BASE_FREQ * Math.pow(2, semi / 12);
    const dur = beats * BEAT_DUR;
    const noteDur = dur * 0.85;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.5;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.13, t + 0.015);
    env.gain.setValueAtTime(0.13, t + noteDur - 0.015);
    env.gain.linearRampToValueAtTime(0, t + noteDur);
    osc.connect(filter);
    filter.connect(env);
    env.connect(out);
    env.connect(delayBus);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);

    t += dur;
  }
}

/** Harmony pads — triangle wave, long sustained tones. */
export function scheduleHarmony(ctx: AudioContext, out: AudioNode, startTime: number): void {
  let t = startTime;
  for (const [semi, beats] of HARMONY) {
    const freq = BASE_FREQ * Math.pow(2, semi / 12);
    const dur = beats * BEAT_DUR;
    const noteDur = dur * 0.95;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.045, t + 0.06);
    env.gain.setValueAtTime(0.045, t + noteDur - 0.06);
    env.gain.linearRampToValueAtTime(0, t + noteDur);
    osc.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);

    t += dur;
  }
}

/** Bass — sawtooth through a lowpass for warmth. */
export function scheduleBass(ctx: AudioContext, out: AudioNode, startTime: number): void {
  let t = startTime;
  for (const [semi, beats] of BASS) {
    const freq = BASE_FREQ * Math.pow(2, semi / 12);
    const dur = beats * BEAT_DUR;
    const noteDur = dur * 0.9;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    filter.type = "lowpass";
    filter.frequency.value = 350;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.14, t + 0.02);
    env.gain.setValueAtTime(0.14, t + noteDur - 0.02);
    env.gain.linearRampToValueAtTime(0, t + noteDur);
    osc.connect(filter);
    filter.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);

    t += dur;
  }
}

/** Arpeggio — quiet triangle sparkle running over the chord tones. */
export function scheduleArp(ctx: AudioContext, out: AudioNode, startTime: number): void {
  let t = startTime;
  for (const [semi, beats] of ARP) {
    const freq = BASE_FREQ * Math.pow(2, semi / 12);
    const dur = beats * BEAT_DUR;
    const noteDur = dur * 0.7;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.028, t + 0.008);
    env.gain.linearRampToValueAtTime(0, t + noteDur);
    osc.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + noteDur + 0.01);

    t += dur;
  }
}

/** Drum kit — kick (sine pitch-drop), snare (bandpass noise), hi-hat (HP noise). */
export function scheduleDrums(ctx: AudioContext, out: AudioNode, snareBuffer: AudioBuffer, hihatBuffer: AudioBuffer, startTime: number): void {
  // Kick — sine with fast pitch drop
  for (const beat of KICK_BEATS) {
    const t = startTime + beat * BEAT_DUR;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    env.gain.setValueAtTime(0.45, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Snare — bandpass-filtered noise
  for (const beat of SNARE_BEATS) {
    const t = startTime + beat * BEAT_DUR;
    const noise = ctx.createBufferSource();
    noise.buffer = snareBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.28, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    noise.connect(filter);
    filter.connect(env);
    env.connect(out);
    noise.start(t);
    noise.stop(t + 0.14);
  }

  // Hi-hat — high-pass filtered noise, very short
  for (const beat of HIHAT_BEATS) {
    const t = startTime + beat * BEAT_DUR;
    const noise = ctx.createBufferSource();
    noise.buffer = hihatBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.1, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(filter);
    filter.connect(env);
    env.connect(out);
    noise.start(t);
    noise.stop(t + 0.04);
  }
}
