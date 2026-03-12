import Phaser from "phaser";
import { WORLD_W, WORLD_H, PLAYER_MAX_HP } from "./constants";
import { createTextures } from "./TextureFactory";
import { StarField } from "./StarField";
import { HUD } from "./HUD";
import { InputHandler } from "./InputHandler";
import { Player } from "./Player";
import { EnemyManager } from "./EnemyManager";
import { SoundManager } from "./SoundManager";
import { RocketManager } from "./RocketManager";
import { LearningManager } from "./LearningManager";
import type { LearningSet } from "./LearningConfig";
import { ALL_CHALLENGES, ChallengeDefinition } from "./ChallengeDefinition";
import { DEFAULT_SHIP_KEY } from "./ShipDefinitions";
import { MathManager } from "./MathManager";
import { EffectsManager } from "./EffectsManager";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private score = 0;

  private bullets!: Phaser.Physics.Arcade.Group;
  private asteroids!: Phaser.Physics.Arcade.Group;

  private starField!: StarField;
  private hud!: HUD;
  private inputHandler!: InputHandler;
  private enemyManager!: EnemyManager;
  private soundManager!: SoundManager;
  private rocketManager!: RocketManager;
  private learningManager?: LearningManager;
  private mathManager?: MathManager;
  private effects!: EffectsManager;

  private challengeDef!: ChallengeDefinition;
  private shipKey!: string;
  private won = false;

  constructor() {
    super("game");
  }

  /** Receives challenge + ship selection from MenuScene. */
  init(data: { challengeKey?: string; shipKey?: string }): void {
    const key = data.challengeKey ?? ALL_CHALLENGES[0].key;
    this.challengeDef = ALL_CHALLENGES.find((c) => c.key === key) ?? ALL_CHALLENGES[0];
    this.shipKey = data.shipKey ?? DEFAULT_SHIP_KEY;
    // Reset state for scene restarts
    this.score = 0;
    this.won = false;
    this.learningManager = undefined;
    this.mathManager = undefined;
  }

  preload(): void {
    createTextures(this);
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x01020a).setDepth(-10);
    this.starField = new StarField(this);

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 120,
      runChildUpdate: false,
    });

    this.asteroids = this.physics.add.group();

    this.inputHandler = new InputHandler(this);
    this.soundManager = new SoundManager(this);
    this.hud = new HUD(this, this.soundManager);
    this.hud.setChallenge(this.challengeDef.label);
    this.enemyManager = new EnemyManager(this, this.soundManager);
    this.player = new Player(this, this.bullets, this.inputHandler, this.soundManager, this.shipKey);
    this.rocketManager = new RocketManager(this, this.soundManager);
    this.effects = new EffectsManager(this);

    this.rocketManager.onCountChanged = (n) => this.hud.setRocketCount(n);

    // ── Wire up challenge-specific manager ───────────────────────────────────
    if (this.challengeDef.type === "math") {
      this.mathManager = new MathManager(this, this.challengeDef, this.hud, this.soundManager);
      this.mathManager.onAllSolved = () => this.showWinScreen();
      this.enemyManager.onEnemySpawned = (e) => this.mathManager!.assignToEnemy(e);
    } else {
      const mode = this.challengeDef.type === "spell" ? "spell" : "collect";
      const set: LearningSet = {
        id: this.challengeDef.key,
        label: this.challengeDef.label,
        items: this.challengeDef.items ?? [],
        rtl: this.challengeDef.rtl,
        itemFontSize: this.challengeDef.itemFontSize,
      };
      this.learningManager = new LearningManager(this, set, mode);
      this.hud.initLearningTracker(set.items, set.rtl);

      this.learningManager.onItemCollected = (_item, collected) => {
        this.hud.updateLearningTracker(collected);
        if (mode === "spell") {
          this.hud.setCurrentSpellTarget(this.learningManager!.nextTarget);
        }
      };
      this.learningManager.onAllCollected = () => this.showWinScreen();

      if (mode === "spell") {
        this.hud.setCurrentSpellTarget(this.learningManager.nextTarget);
      }
    }

    // Start music once the Web Audio context is unlocked by the first user gesture.
    this.sound.once("unlocked", () => this.soundManager.startMusic());
    const webSound = this.sound;
    if (webSound instanceof Phaser.Sound.WebAudioSoundManager && webSound.context.state === "running") {
      this.soundManager.startMusic();
    }

    this.player.onHealthChanged = (hp) => this.hud.setHealth(hp, PLAYER_MAX_HP);
    this.player.onDied = () => {
      this.hud.setCenterText("RESPAWNING IN 2 SECONDS...");
      this.effects.playerDeath(this.player.x, this.player.y);
    };
    this.player.onRespawned = () => {
      this.hud.setCenterText("");
      this.effects.playerRespawn(this.player.x, this.player.y);
    };
    this.player.onHit = (x, y) => this.effects.playerHit(x, y);
    this.player.onFired = (x, y) => this.effects.muzzleFlash(x, y);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.spawnAsteroids(9);
    this.enemyManager.startSpawning(this.challengeDef.enemyConfig, this.player.x, this.player.y);
    this.setupCollisions();
  }

  update(time: number, delta: number): void {
    this.starField.update(delta);
    if (this.inputHandler.isMuteJustPressed()) {
      this.soundManager.toggleMute();
      this.hud.syncSoundIcon();
    }
    // Must be polled every frame to keep gamepad just-pressed state accurate
    const rocketPressed = this.inputHandler.isRocketJustPressed();

    if (this.won) {
      if (this.inputHandler.isRestartPressed()) this.scene.start("menu");
      return;
    }

    if (!this.player.active) {
      if (this.inputHandler.isRestartPressed()) this.scene.start("menu");
      return;
    }

    this.player.update(time, delta, this.enemyManager.enemies);
    this.enemyManager.update(time, this.player.x, this.player.y);
    this.rocketManager.update(delta, this.enemyManager.enemies, this.asteroids);
    this.learningManager?.update();
    this.mathManager?.update();

    // Effects: engine trail + rocket exhausts
    this.effects.updateEngineTrail(this.player.x, this.player.y, this.player.rotation, this.player.active);
    this.effects.updateRocketExhausts(this.rocketManager.rockets);

    if (rocketPressed) {
      this.rocketManager.tryLaunch(this.player.x, this.player.y, this.enemyManager.enemies, this.asteroids);
    }

    // Cull player bullets that have left the world
    this.bullets.children.iterate((child) => {
      const b = child as Phaser.Physics.Arcade.Image;
      if (!b.active) return true;
      if (b.x < -40 || b.x > WORLD_W + 40 || b.y < -40 || b.y > WORLD_H + 40) {
        b.disableBody(true, true);
      }
      return true;
    });
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  /**
   * Unified enemy-kill handler — called from bullet AND rocket overlap callbacks.
   * Reads enemy data BEFORE destroy(), so MathManager can check the answer.
   */
  private handleEnemyKilled(eSprite: Phaser.Physics.Arcade.Sprite): void {
    const ex = eSprite.x;
    const ey = eSprite.y;
    if (this.mathManager) {
      this.mathManager.onEnemyKilled(eSprite as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);
    }
    eSprite.destroy();
    this.score += 100;
    this.hud.setScore(this.score);
    this.soundManager.playExplosion();
    this.effects.explodeEnemy(ex, ey);
    this.rocketManager.tryDropPickup(ex, ey);
    this.learningManager?.tryDrop(ex, ey);
  }

  private setupCollisions(): void {
    const { enemies, enemyBullets } = this.enemyManager;

    this.physics.add.collider(this.player.sprite, this.asteroids, () => this.player.takeDamage(1));
    this.physics.add.collider(this.player.sprite, enemies, () => this.player.takeDamage(1));

    this.physics.add.collider(this.asteroids, this.asteroids);

    this.physics.add.overlap(this.bullets, enemies, (b, e) => {
      (b as Phaser.Physics.Arcade.Image).disableBody(true, true);
      this.handleEnemyKilled(e as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.bullets, this.asteroids, (b, a) => {
      (b as Phaser.Physics.Arcade.Image).disableBody(true, true);
      const aSprite = a as Phaser.Physics.Arcade.Sprite;
      const ax = aSprite.x;
      const ay = aSprite.y;
      aSprite.destroy();
      this.score += 25;
      this.hud.setScore(this.score);
      this.soundManager.playExplosion();
      this.effects.explodeAsteroid(ax, ay);
    });

    this.physics.add.overlap(enemyBullets, this.player.sprite, (b, p) => {
      // Argument order is not guaranteed — find the bullet defensively
      const bullet = b === this.player.sprite ? p : b;
      (bullet as Phaser.Physics.Arcade.Image).disableBody(true, true);
      this.player.takeDamage(1);
    });

    // Rocket overlaps
    const { rockets, pickups } = this.rocketManager;

    this.physics.add.overlap(this.player.sprite, pickups, (_p, pickup) => {
      this.rocketManager.collectPickup(pickup as Phaser.Physics.Arcade.Image);
    });

    if (this.learningManager) {
      this.physics.add.overlap(this.player.sprite, this.learningManager.pickups, (_p, pickup) => {
        const pu = pickup as Phaser.Physics.Arcade.Image;
        this.effects.pickupCollect(pu.x, pu.y);
        this.learningManager!.collect(pu);
      });
    }

    this.physics.add.overlap(rockets, enemies, (r, e) => {
      (r as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).disableBody(true, true);
      this.handleEnemyKilled(e as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(rockets, this.asteroids, (r, a) => {
      (r as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).disableBody(true, true);
      const aSprite = a as Phaser.Physics.Arcade.Sprite;
      const ax = aSprite.x;
      const ay = aSprite.y;
      aSprite.destroy();
      this.score += 25;
      this.hud.setScore(this.score);
      this.soundManager.playExplosion();
      this.effects.explodeAsteroid(ax, ay);
    });
  }

  private showWinScreen(): void {
    this.won = true;
    this.physics.pause();
    this.mathManager?.destroy();

    const sw = this.scale.width;
    const sh = this.scale.height;
    const cx = sw / 2;

    // ── Dark overlay so text pops ──────────────────────────────────────────
    const overlay = this.add
      .rectangle(cx, sh / 2, sw, sh, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(290);
    this.tweens.add({ targets: overlay, fillAlpha: 0.45, duration: 600, ease: "Power2" });

    // ── Trophy — bounces in then gently floats ─────────────────────────────
    const trophy = this.add
      .text(cx, sh * 0.26, "🏆", { fontSize: "130px" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(310)
      .setScale(0);

    this.tweens.add({
      targets: trophy,
      scale: 1.0,
      duration: 750,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: trophy,
          y: sh * 0.26 - 16,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    // ── Star burst around the trophy ───────────────────────────────────────
    this.time.delayedCall(700, () => {
      const tx = this.player.x + (cx - sw / 2); // world-space approx of screen centre
      const ty = this.player.y + (sh * 0.26 - sh / 2);
      const stars = this.add.particles(tx, ty, "particle_spark", {
        speed: { min: 120, max: 340 },
        scale: { start: 2.0, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 500, max: 900 },
        quantity: 40,
        tint: [0xffe700, 0xffffff, 0xffcc00, 0xff9900],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      stars.setDepth(16);
      stars.explode(40);
      this.time.delayedCall(1000, () => stars.destroy());
    });

    // ── "כל הכבוד!" headline ────────────────────────────────────────────────
    const winText = this.add
      .text(cx, sh * 0.56, "🎉 כל הכבוד! 🎉", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "62px",
        color: "#ffe700",
        stroke: "#3d2000",
        strokeThickness: 10,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(310)
      .setAlpha(0);

    // ── Sub-text ──────────────────────────────────────────────────────────
    const subText = this.add
      .text(cx, sh * 0.71, "השלמת את האתגר!\nלחץ SPACE לתפריט", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "34px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(310)
      .setAlpha(0);

    // Fade in text, then pulse the headline
    this.tweens.add({ targets: winText, alpha: 1, duration: 500, delay: 550 });
    this.tweens.add({ targets: subText, alpha: 1, duration: 500, delay: 950 });
    this.tweens.add({
      targets: winText,
      scaleX: 1.07,
      scaleY: 1.07,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 1300,
    });

    // ── Continuous fireworks + win fanfare ────────────────────────────────
    this.effects.winCelebration(this.player.x, this.player.y);
    this.soundManager.playWin();

    // ── Auto-return to menu after 9 s ─────────────────────────────────────
    this.time.delayedCall(9000, () => {
      if (this.won) this.scene.start("menu");
    });
  }

  private spawnAsteroids(count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.randomPoint();
      const asteroid = this.asteroids.create(p.x, p.y, "asteroid") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      // Vary sizes: 0.6 (small) to 1.1 (large) for visual variety
      const scale = 0.6 + Math.random() * 0.55;
      asteroid.setScale(scale);
      const r = Math.round(36 * scale);
      asteroid.body.setCircle(r, (80 - r * 2) / 2, (80 - r * 2) / 2);
      asteroid.setCollideWorldBounds(true);
      asteroid.setBounce(1, 1);
      asteroid.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-80, 80));
      asteroid.setAngularVelocity(Phaser.Math.Between(-35, 35));
    }
  }

  private randomPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(Phaser.Math.Between(50, WORLD_W - 50), Phaser.Math.Between(50, WORLD_H - 50));
  }
}
