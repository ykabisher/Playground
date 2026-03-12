import Phaser from "phaser";
import { SOUND_MASTER_VOLUME, SOUND_SFX_VOLUME, SOUND_MUSIC_VOLUME } from "../constants";

/**
 * Core Web Audio graph shared by all audio subsystems.
 *
 * Owns:
 *  - The AudioContext (borrowed from Phaser's WebAudioSoundManager)
 *  - Master → SFX / Music gain chain
 *  - Pre-baked white-noise buffers for drum synthesis (reused every loop)
 *  - Mute and per-bus volume controls
 *
 * Assumes WebAudio is available — the caller (SoundManager) must check first.
 */
export class AudioBus {
  readonly ctx: AudioContext;
  readonly sfxGain: GainNode;
  readonly musicGain: GainNode;

  /** Pre-baked noise buffers reused by MusicPlayer for every drum hit. */
  readonly snareBuffer: AudioBuffer;
  readonly hihatBuffer: AudioBuffer;

  private readonly masterGain: GainNode;
  private _muted = false;

  constructor(scene: Phaser.Scene) {
    this.ctx = (scene.sound as Phaser.Sound.WebAudioSoundManager).context;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = SOUND_MASTER_VOLUME;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = SOUND_SFX_VOLUME;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = SOUND_MUSIC_VOLUME;
    this.musicGain.connect(this.masterGain);

    // Pre-bake noise buffers used by drum synthesis
    const sr = this.ctx.sampleRate;

    this.snareBuffer = this.ctx.createBuffer(1, Math.floor(sr * 0.15), sr);
    const sd = this.snareBuffer.getChannelData(0);
    for (let i = 0; i < sd.length; i++) sd[i] = Math.random() * 2 - 1;

    this.hihatBuffer = this.ctx.createBuffer(1, Math.floor(sr * 0.05), sr);
    const hd = this.hihatBuffer.getChannelData(0);
    for (let i = 0; i < hd.length; i++) hd[i] = Math.random() * 2 - 1;
  }

  // ── Mute & Volume ──────────────────────────────────────────────────────────

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): void {
    this._muted = !this._muted;
    this.masterGain.gain.setTargetAtTime(this._muted ? 0 : SOUND_MASTER_VOLUME, this.ctx.currentTime, 0.05);
  }

  setMasterVolume(value: number): void {
    if (this._muted) return;
    this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(value: number): void {
    this.sfxGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  setMusicVolume(value: number): void {
    this.musicGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }
}
