import type { AudioBus } from "./AudioBus";

/**
 * Synthesises all one-shot sound effects using the Web Audio API.
 *
 * Every public play*() method creates a short-lived oscillator or noise node,
 * fires it through the SFX gain bus, and self-disposes when done.
 *
 * To add a new effect: add a play*() method following the existing pattern.
 */
export class SfxPlayer {
  private readonly bus: AudioBus;

  constructor(bus: AudioBus) {
    this.bus = bus;
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  /** Short sawtooth blip — player fires a bullet. */
  playPlayerShoot(): void {
    this.sfx((ctx, out) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
      env.gain.setValueAtTime(0.18, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(env);
      env.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    });
  }

  /** Lower-pitched square blip — an enemy fires. */
  playEnemyShoot(): void {
    this.sfx((ctx, out) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
      env.gain.setValueAtTime(0.1, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(env);
      env.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    });
  }

  /** Noise burst + bass thud — anything explodes. */
  playExplosion(): void {
    this.sfx((ctx, out) => {
      // White noise burst
      const bufLen = Math.floor(ctx.sampleRate * 0.4);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 400;
      filter.Q.value = 0.5;
      const noiseEnv = ctx.createGain();
      noiseEnv.gain.setValueAtTime(0.5, ctx.currentTime);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      noise.connect(filter);
      filter.connect(noiseEnv);
      noiseEnv.connect(out);
      noise.start();
      noise.stop(ctx.currentTime + 0.4);

      // Bass thud
      const bass = ctx.createOscillator();
      const bassEnv = ctx.createGain();
      bass.type = "sine";
      bass.frequency.setValueAtTime(120, ctx.currentTime);
      bass.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
      bassEnv.gain.setValueAtTime(0.4, ctx.currentTime);
      bassEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      bass.connect(bassEnv);
      bassEnv.connect(out);
      bass.start();
      bass.stop(ctx.currentTime + 0.2);
    });
  }

  /** Quick sine drop — player hull hit. */
  playPlayerHit(): void {
    this.sfx((ctx, out) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18);
      env.gain.setValueAtTime(0.25, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(env);
      env.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    });
  }

  /** Long descending sawtooth — player dies. */
  playPlayerDeath(): void {
    this.sfx((ctx, out) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.9);
      env.gain.setValueAtTime(0.3, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.connect(env);
      env.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    });
  }

  /** Ascending C-major arpeggio — wave complete / learning item collected. */
  playWaveCleared(): void {
    this.sfx((ctx, out) => {
      const baseFreq = 523.25; // C5
      [0, 4, 7, 12].forEach((semi, i) => {
        const freq = baseFreq * Math.pow(2, semi / 12);
        const t = ctx.currentTime + i * 0.13;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.2, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(env);
        env.connect(out);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    });
  }

  /** Low whoosh + tone swell — rocket launches. */
  playRocketLaunch(): void {
    this.sfx((ctx, out) => {
      // Rising noise whoosh
      const bufLen = Math.floor(ctx.sampleRate * 0.3);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(200, ctx.currentTime);
      lp.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.25);
      const noiseEnv = ctx.createGain();
      noiseEnv.gain.setValueAtTime(0.35, ctx.currentTime);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      noise.connect(lp);
      lp.connect(noiseEnv);
      noiseEnv.connect(out);
      noise.start();
      noise.stop(ctx.currentTime + 0.3);

      // Rising tone
      const osc = ctx.createOscillator();
      const oscEnv = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
      oscEnv.gain.setValueAtTime(0.18, ctx.currentTime);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(oscEnv);
      oscEnv.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    });
  }

  /** Triumphant ascending fanfare — player wins the challenge! */
  playWin(): void {
    this.sfx((ctx, out) => {
      // Rising C-major scale: C4 → C6
      const scale = [261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99, 1046.5];
      scale.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.09;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = i % 2 === 0 ? "square" : "sawtooth";
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.18, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(env);
        env.connect(out);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      // Final sustained C major chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = ctx.currentTime + scale.length * 0.09 + 0.05;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(i === 0 ? 0.25 : 0.18, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(env);
        env.connect(out);
        osc.start(t);
        osc.stop(t + 1.4);
      });
    });
  }

  /** Short ascending arpeggio — rocket pickup collected. */
  playRocketPickup(): void {
    this.sfx((ctx, out) => {
      [0, 7, 12].forEach((semi, i) => {
        const freq = 440 * Math.pow(2, semi / 12);
        const t = ctx.currentTime + i * 0.07;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0.15, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(env);
        env.connect(out);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    });
  }

  // ── Internal helper ────────────────────────────────────────────────────────

  /** Fires `build` with the live AudioContext and SFX output node. */
  private sfx(build: (ctx: AudioContext, out: AudioNode) => void): void {
    build(this.bus.ctx, this.bus.sfxGain);
  }
}
