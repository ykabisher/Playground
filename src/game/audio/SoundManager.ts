import Phaser from "phaser";
import { AudioBus } from "./AudioBus";
import { SfxPlayer } from "./SfxPlayer";
import { MusicPlayer } from "./MusicPlayer";

/**
 * Public facade for all game audio.
 *
 * Wires together AudioBus → SfxPlayer + MusicPlayer and exposes a single,
 * stable API to the rest of the game. All methods are no-ops when WebAudio is
 * unavailable so callers never need to null-check.
 *
 * Extending audio:
 *  - New SFX         → add play*() to SfxPlayer and delegate here
 *  - Music changes   → edit MusicTrack (patterns) or MusicPlayer (scheduler)
 *  - Second music layer → create a second MusicPlayer with a different track
 */
export class SoundManager {
  private readonly bus: AudioBus | null = null;
  private readonly sfx: SfxPlayer | null = null;
  private readonly music: MusicPlayer | null = null;

  constructor(scene: Phaser.Scene) {
    if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) {
      console.warn("[SoundManager] WebAudio unavailable — sound disabled.");
      return;
    }
    this.bus = new AudioBus(scene);
    this.sfx = new SfxPlayer(this.bus);
    this.music = new MusicPlayer(this.bus);
  }

  // ── Volume & Mute ──────────────────────────────────────────────────────────

  get muted(): boolean {
    return this.bus?.muted ?? false;
  }

  toggleMute(): void {
    this.bus?.toggleMute();
  }
  setMasterVolume(v: number): void {
    this.bus?.setMasterVolume(v);
  }
  setSfxVolume(v: number): void {
    this.bus?.setSfxVolume(v);
  }
  setMusicVolume(v: number): void {
    this.bus?.setMusicVolume(v);
  }

  // ── Music ──────────────────────────────────────────────────────────────────

  startMusic(): void {
    this.music?.start();
  }
  stopMusic(): void {
    this.music?.stop();
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  playPlayerShoot(): void {
    this.sfx?.playPlayerShoot();
  }
  playEnemyShoot(): void {
    this.sfx?.playEnemyShoot();
  }
  playExplosion(): void {
    this.sfx?.playExplosion();
  }
  playPlayerHit(): void {
    this.sfx?.playPlayerHit();
  }
  playPlayerDeath(): void {
    this.sfx?.playPlayerDeath();
  }
  playWaveCleared(): void {
    this.sfx?.playWaveCleared();
  }
  playRocketLaunch(): void {
    this.sfx?.playRocketLaunch();
  }
  playRocketPickup(): void {
    this.sfx?.playRocketPickup();
  }
  playWin(): void {
    this.sfx?.playWin();
  }
}
