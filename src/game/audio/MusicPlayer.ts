import { BEAT_DUR, LOOP_DURATION, scheduleMelody, scheduleHarmony, scheduleBass, scheduleArp, scheduleDrums } from "./MusicTrack";
import type { AudioBus } from "./AudioBus";

/** How many seconds ahead to schedule notes (protects against JS timer jitter). */
const LOOKAHEAD_SEC = 0.3;
/** How often (ms) the scheduler tick runs. */
const TICK_MS = 100;

/**
 * Clock-lookahead background-music scheduler.
 *
 * Creates a space-echo delay bus wired into the AudioBus music gain, then
 * repeatedly calls MusicTrack schedule functions ahead of time so that note
 * playback is never interrupted by JS garbage collection or timer drift.
 *
 * To swap the song: import different schedule functions from a different track
 * file and pass them in here, or replace the scheduleLoop() body.
 */
export class MusicPlayer {
  private readonly bus: AudioBus;
  /** Melody echo — delay node input; owned by this player. */
  private readonly delayBus: GainNode;

  private running = false;
  private nextStart = 0;
  private tickHandle = 0;

  constructor(bus: AudioBus) {
    this.bus = bus;

    // ── Space-echo delay bus ────────────────────────────────────────────────
    const ctx = bus.ctx;
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = BEAT_DUR * 0.75; // 3/4-beat echo tail

    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;

    const wet = ctx.createGain();
    wet.gain.value = 0.18;

    delay.connect(feedback);
    feedback.connect(delay); // feedback loop
    delay.connect(wet);
    wet.connect(bus.musicGain);

    this.delayBus = ctx.createGain();
    this.delayBus.connect(delay);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Begin the looping background track. Idempotent. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextStart = this.bus.ctx.currentTime;
    this.tick();
  }

  /** Stop scheduling new notes. Already-scheduled notes will finish naturally. */
  stop(): void {
    this.running = false;
    clearTimeout(this.tickHandle);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private tick(): void {
    if (!this.running) return;

    const now = this.bus.ctx.currentTime;
    while (this.nextStart < now + LOOKAHEAD_SEC) {
      this.scheduleLoop(this.nextStart);
      this.nextStart += LOOP_DURATION;
    }

    this.tickHandle = window.setTimeout(() => this.tick(), TICK_MS);
  }

  private scheduleLoop(t: number): void {
    const { ctx, musicGain, snareBuffer, hihatBuffer } = this.bus;
    scheduleMelody(ctx, musicGain, this.delayBus, t);
    scheduleHarmony(ctx, musicGain, t);
    scheduleBass(ctx, musicGain, t);
    scheduleArp(ctx, musicGain, t);
    scheduleDrums(ctx, musicGain, snareBuffer, hihatBuffer, t);
  }
}
