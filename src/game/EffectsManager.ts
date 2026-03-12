import Phaser from "phaser";

type ParticleEmitter = Phaser.GameObjects.Particles.ParticleEmitter;

/**
 * Central visual-effects engine.
 *
 * Provides:
 *  – Enemy / asteroid explosions (sparks, shockwave ring, screen flash)
 *  – Player hit sparks & player death bloom
 *  – Player respawn ring pulse
 *  – Muzzle flash at gun tip
 *  – Engine exhaust trail (call updateEngineTrail() every frame)
 *  – Rocket exhaust (call updateRocketExhausts() every frame)
 *  – Wave-clear celebration firework burst
 *  – Pickup collect gold sparkle
 */
export class EffectsManager {
  private readonly scene: Phaser.Scene;

  // Persistent continuous emitters
  private engineEmitter!: ParticleEmitter;
  private rocketSharedEmitter!: ParticleEmitter;

  // Closure variable for engine exhaust direction, updated each frame
  private exhaustAngleDeg = 90;

  // Win celebration timer
  private winTimerEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createPersistentEmitters();
  }

  // ── Initialization ────────────────────────────────────────────────────────

  private createPersistentEmitters(): void {
    // ── Engine exhaust trail — lives as long as the scene ──────────────────
    // Multi-particle trail: an outer wide glow + inner bright core.
    this.engineEmitter = this.scene.add.particles(0, 0, "particle_spark", {
      speed: { min: 30, max: 110 },
      angle: {
        onEmit: () => this.exhaustAngleDeg + Phaser.Math.FloatBetween(-20, 20),
      },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 180, max: 340 },
      frequency: 12,
      quantity: 3,
      tint: [0xff9900, 0xffcc33, 0xffffff, 0xff6600, 0xffe066, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.engineEmitter.setDepth(-2);
    this.engineEmitter.stop();

    // ── Shared rocket exhaust emitter — emitParticleAt() called per rocket ──
    // Direction doesn't matter much: rockets move at 380 px/s so particles
    // naturally fall behind the rocket regardless of emission angle.
    this.rocketSharedEmitter = this.scene.add.particles(0, 0, "particle_spark", {
      speed: { min: 15, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.38, end: 0 },
      alpha: { start: 0.85, end: 0 },
      lifespan: 190,
      tint: [0xff6600, 0xff9900, 0xffcc44, 0xffee88],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.rocketSharedEmitter.setDepth(2);
  }

  // ── Per-frame updates ─────────────────────────────────────────────────────

  /**
   * Call every frame from GameScene.update().
   * @param x               player world X
   * @param y               player world Y
   * @param spriteRotation  player sprite.rotation in radians
   *                        (= aimAngle + π/2, so exhaust = spriteRotation + π/2 rad)
   * @param active          false while the player is dead (trail stops)
   */
  updateEngineTrail(x: number, y: number, spriteRotation: number, active: boolean): void {
    if (!active) {
      this.engineEmitter.stop();
      return;
    }
    this.exhaustAngleDeg = Phaser.Math.RadToDeg(spriteRotation + Math.PI / 2);
    this.engineEmitter.setPosition(x, y);
    if (!this.engineEmitter.emitting) this.engineEmitter.start();
  }

  /**
   * Call every frame from GameScene.update().
   * Emits a small cluster of orange fire particles at each active rocket.
   */
  updateRocketExhausts(rockets: Phaser.Physics.Arcade.Group): void {
    rockets.children.each((child) => {
      const r = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!r.active) return true;
      this.rocketSharedEmitter.emitParticleAt(r.x, r.y, 3);
      return true;
    });
  }

  // ── Explosions ────────────────────────────────────────────────────────────

  /** Big orange/red/yellow explosion for enemy (UFO) kills. */
  explodeEnemy(x: number, y: number): void {
    // 1. Outer orange flash bloom
    this.spawnFlash(x, y, 0.3, 7.0, 300, 0xff9933);
    // 2. Inner white-hot core flash
    this.spawnFlash(x, y, 0.1, 3.5, 140, 0xffffff);
    // 3. Two staggered shockwave rings
    this.spawnRing(x, y, 0.15, 8.0, 500, 0xff8840);
    this.scene.time.delayedCall(80, () => this.spawnRing(x, y, 0.1, 5.5, 380, 0xffcc44));

    // 4. Large burst of hot sparks
    const sparks = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 160, max: 620 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 900 },
      quantity: 60,
      tint: [0xff3300, 0xff7700, 0xffcc00, 0xffffff, 0xff5511, 0xffee44],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    sparks.setDepth(9);
    sparks.explode(60);
    this.scene.time.delayedCall(1000, () => sparks.destroy());

    // 5. Green alien debris (matches UFO colour)
    const alienDebris = this.scene.add.particles(x, y, "particle_debris", {
      speed: { min: 80, max: 280 },
      scale: { start: 1.6, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 800 },
      quantity: 14,
      rotate: { min: 0, max: 360 },
      tint: [0x27ae60, 0x2dcc71, 0x7de9a5, 0x00bcd4],
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    alienDebris.setDepth(8);
    alienDebris.explode(14);
    this.scene.time.delayedCall(900, () => alienDebris.destroy());

    // 6. Thick smoke plume
    const smoke = this.scene.add.particles(x, y, "particle_smoke", {
      speed: { min: 20, max: 70 },
      scale: { start: 0.4, end: 2.2 },
      alpha: { start: 0.55, end: 0 },
      lifespan: { min: 800, max: 1400 },
      quantity: 16,
      tint: [0x445544, 0x667766, 0x223322, 0x334433],
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    smoke.setDepth(7);
    smoke.explode(16);
    this.scene.time.delayedCall(1500, () => smoke.destroy());

    // 7. Camera shake
    this.scene.cameras.main.shake(180, 0.01);
  }

  /** Big chunky rock explosion for asteroid kills. */
  explodeAsteroid(x: number, y: number): void {
    // Two shockwave rings (gray-blue tones)
    this.spawnRing(x, y, 0.12, 5.5, 400, 0x9aabdd);
    this.scene.time.delayedCall(100, () => this.spawnRing(x, y, 0.08, 3.5, 300, 0xc8d8ee));

    // Large rocky debris chunks
    const debris = this.scene.add.particles(x, y, "particle_debris", {
      speed: { min: 100, max: 360 },
      scale: { start: 2.2, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 350, max: 800 },
      quantity: 24,
      rotate: { min: 0, max: 360 },
      tint: [0x7282c0, 0x9aabdd, 0x4a5595, 0xc8d8ee, 0x5568a8],
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    debris.setDepth(9);
    debris.explode(24);
    this.scene.time.delayedCall(900, () => debris.destroy());

    // Dust + spark flash on impact
    this.spawnFlash(x, y, 0.1, 3.0, 180, 0xc8d8ee);

    // Thick dust puffs
    const dust = this.scene.add.particles(x, y, "particle_smoke", {
      speed: { min: 15, max: 60 },
      scale: { start: 0.3, end: 1.8 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 600, max: 1100 },
      quantity: 14,
      tint: [0x7282c0, 0x9599a8, 0x4a5070, 0xadb8cc],
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    dust.setDepth(7);
    dust.explode(14);
    this.scene.time.delayedCall(1200, () => dust.destroy());

    this.scene.cameras.main.shake(100, 0.007);
  }

  // ── Player effects ────────────────────────────────────────────────────────

  /** Spark burst at the player's position when taking a hit. */
  playerHit(x: number, y: number): void {
    const sparks = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 60, max: 190 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 200, max: 380 },
      quantity: 16,
      tint: [0xffffff, 0xff8800, 0xffcc44, 0xff4400],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    sparks.setDepth(10);
    sparks.explode(16);
    this.scene.time.delayedCall(450, () => sparks.destroy());
    // No full-screen flash — the orange tint on the player sprite is enough feedback
  }

  /** Large blue/white explosion bloom when the player dies. */
  playerDeath(x: number, y: number): void {
    // Big white bloom
    this.spawnFlash(x, y, 0.3, 8, 500, 0xffffff);
    // Blue ring
    this.spawnRing(x, y, 0.1, 9, 600, 0x88ccff);

    // Blue/white sparks
    const sparks = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 100, max: 500 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 900 },
      quantity: 50,
      tint: [0xffffff, 0xaaddff, 0x88ccff, 0x6699ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    sparks.setDepth(10);
    sparks.explode(50);
    this.scene.time.delayedCall(1100, () => sparks.destroy());

    // Heavy smoke
    const smoke = this.scene.add.particles(x, y, "particle_smoke", {
      speed: { min: 20, max: 70 },
      scale: { start: 0.4, end: 2.0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 800, max: 1500 },
      quantity: 16,
      tint: [0x334455, 0x445566, 0x223344],
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    smoke.setDepth(7);
    smoke.explode(16);
    this.scene.time.delayedCall(1700, () => smoke.destroy());

    // Heavy shake only — no blinding flash
    this.scene.cameras.main.shake(500, 0.022);
  }

  /** Expanding ring pulse when player respawns. */
  playerRespawn(x: number, y: number): void {
    // Two staggered rings
    this.spawnRing(x, y, 0.05, 5, 400, 0x88ff88);
    this.scene.time.delayedCall(120, () => this.spawnRing(x, y, 0.05, 3.5, 350, 0xffffff));

    // Gentle sparkle
    const sparkle = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 30, max: 120 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 400,
      quantity: 18,
      tint: [0x88ff88, 0xccffcc, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    sparkle.setDepth(10);
    sparkle.explode(18);
    this.scene.time.delayedCall(500, () => sparkle.destroy());

    // Gentle upward shake on respawn — no flash
  }

  // ── Weapon effects ────────────────────────────────────────────────────────

  /**
   * Tiny cyan glow at the gun tip when the player fires.
   * @param x  gun tip world X
   * @param y  gun tip world Y
   */
  muzzleFlash(x: number, y: number): void {
    const flash = this.scene.add.image(x, y, "particle_glow").setScale(0.28).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(5).setTint(0xb1f7ff);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.1,
      alpha: 0,
      duration: 75,
      ease: "Power1",
      onComplete: () => flash.destroy(),
    });
  }

  // ── Pickup / collect effects ──────────────────────────────────────────────

  /** Gold sparkle when the player collects a learning-item badge. */
  pickupCollect(x: number, y: number): void {
    // Outer gold ring
    this.spawnRing(x, y, 0.05, 2.5, 280, 0xffcc00);
    // Upward gold sparkle burst
    const sparkle = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 60, max: 200 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 550 },
      quantity: 22,
      tint: [0xffcc00, 0xffd700, 0xffffff, 0xffee44, 0xff9900],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    sparkle.setDepth(10);
    sparkle.explode(22);
    this.scene.time.delayedCall(650, () => sparkle.destroy());
  }

  // ── Wave events ───────────────────────────────────────────────────────────

  /**
   * Colourful firework burst when a wave is cleared.
   * Call at the player's world position so it's centered on screen.
   */
  waveClear(x: number, y: number): void {
    const colors: number[] = [0xff0066, 0x00ffcc, 0xffcc00, 0x4488ff, 0xff8800, 0x88ff44, 0xff44ff, 0x00ddff];

    // Primary burst
    const burst = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 180, max: 650 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 550, max: 1400 },
      quantity: 80,
      tint: colors,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    burst.setDepth(12);
    burst.explode(80);
    this.scene.time.delayedCall(1600, () => burst.destroy());

    // Secondary delayed ring ring
    this.scene.time.delayedCall(100, () => {
      this.spawnRing(x, y, 0.1, 12, 700, 0xffffff);
    });
    this.scene.time.delayedCall(200, () => {
      this.spawnRing(x, y, 0.1, 9, 600, 0x00ffcc);
    });

    // No camera flash for wave clear — the fireworks are enough
  }

  // ── Win celebration ───────────────────────────────────────────────────────

  /**
   * Launches continuous rainbow firework bursts around world position (cx, cy).
   * Fireworks are spaced to cover the visible play area.
   * Phaser automatically cleans the repeating timer when the scene shuts down.
   */
  winCelebration(cx: number, cy: number): void {
    const palettes: number[][] = [
      [0xff0066, 0xff6699, 0xffaacc, 0xffffff],
      [0x00ffcc, 0x44ffee, 0x00ccaa, 0xffffff],
      [0xffcc00, 0xff9900, 0xffee44, 0xffffff],
      [0x4488ff, 0x0044cc, 0x88bbff, 0xffffff],
      [0xff44ff, 0xcc00cc, 0xff88ff, 0xffffff],
      [0x88ff44, 0x44cc00, 0xccff88, 0xffffff],
      [0xff8800, 0xffaa44, 0xffdd99, 0xffffff],
    ];
    let burstIdx = 0;

    const fireFirework = () => {
      const cam = this.scene.cameras.main;
      const hw = cam.width * 0.44;
      const hh = cam.height * 0.4;
      // Bias upward so fireworks don't land below the middle of the screen
      const rx = cx + Phaser.Math.FloatBetween(-hw, hw);
      const ry = cy + Phaser.Math.FloatBetween(-hh, hh * 0.3);
      const palette = palettes[burstIdx % palettes.length];
      burstIdx++;

      // 1. Big sparks burst
      const sparks = this.scene.add.particles(rx, ry, "particle_spark", {
        speed: { min: 150, max: 580 },
        scale: { start: 1.7, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 600, max: 1300 },
        quantity: 90,
        tint: palette,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      sparks.setDepth(15);
      sparks.explode(90);
      this.scene.time.delayedCall(1500, () => sparks.destroy());

      // 2. Glitter debris
      const glitter = this.scene.add.particles(rx, ry, "particle_debris", {
        speed: { min: 60, max: 240 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 500, max: 900 },
        quantity: 20,
        rotate: { min: 0, max: 360 },
        tint: palette,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      glitter.setDepth(14);
      glitter.explode(20);
      this.scene.time.delayedCall(1000, () => glitter.destroy());

      // 3. Shockwave rings
      this.spawnRing(rx, ry, 0.08, 12, 700, palette[0]);
      this.scene.time.delayedCall(140, () => this.spawnRing(rx, ry, 0.05, 8, 550, 0xffffff));

      // 4. Central bloom
      this.spawnFlash(rx, ry, 0.15, 5, 300, palette[0]);

      // Subtle camera shake per firework
      this.scene.cameras.main.shake(70, 0.004);
    };

    // Initial triple volley then continuous bursts every 650 ms
    fireFirework();
    this.scene.time.delayedCall(280, () => {
      if (this.scene.scene.isActive()) fireFirework();
    });
    this.scene.time.delayedCall(560, () => {
      if (this.scene.scene.isActive()) fireFirework();
    });

    this.winTimerEvent = this.scene.time.addEvent({
      delay: 650,
      loop: true,
      callback: fireFirework,
      startAt: 900, // offset to stagger from initial volleys
    });
  }

  stopWinCelebration(): void {
    if (this.winTimerEvent) {
      this.winTimerEvent.remove(false);
      this.winTimerEvent = null;
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.engineEmitter.destroy();
    this.rocketSharedEmitter.destroy();
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  /**
   * Spawn a tinted Image that scales up and fades — simulates a bright flash bloom.
   */
  private spawnFlash(x: number, y: number, startScale: number, endScale: number, duration: number, tint: number): void {
    const img = this.scene.add.image(x, y, "particle_glow").setScale(startScale).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD).setDepth(10).setTint(tint);

    this.scene.tweens.add({
      targets: img,
      scale: endScale,
      alpha: 0,
      duration,
      ease: "Power2",
      onComplete: () => img.destroy(),
    });
  }

  /**
   * Spawn a tinted ring Image that scales up and fades — shockwave effect.
   */
  private spawnRing(x: number, y: number, startScale: number, endScale: number, duration: number, tint: number): void {
    const ring = this.scene.add.image(x, y, "particle_ring").setScale(startScale).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(8).setTint(tint);

    this.scene.tweens.add({
      targets: ring,
      scale: endScale,
      alpha: 0,
      duration,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy(),
    });
  }
}
