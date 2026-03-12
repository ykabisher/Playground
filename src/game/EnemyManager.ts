import Phaser from "phaser";
import { WORLD_W, WORLD_H, ENEMY_FIRE_COOLDOWN_MS } from "./constants";
import type { EnemyConfig } from "./ChallengeDefinition";
import { SoundManager } from "./SoundManager";

type ActorSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const ENEMY_APPROACH_SPEED = 140;
const ENEMY_RETREAT_SPEED = 170;
const ENEMY_APPROACH_DIST = 280;
const ENEMY_RETREAT_DIST = 160;
const ENEMY_DODGE_SPEED = 110;
const ENEMY_DODGE_DURATION_MS = 700;

export class EnemyManager {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  /** Called each time a new enemy sprite is created — used by MathManager to assign answer values. */
  onEnemySpawned: ((enemy: ActorSprite) => void) | null = null;

  private config!: EnemyConfig;
  private _playerX = WORLD_W / 2;
  private _playerY = WORLD_H / 2;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sound: SoundManager,
  ) {
    this.enemies = scene.physics.add.group();
    this.enemyBullets = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 160,
      runChildUpdate: false,
    });
  }

  /**
   * Begin continuously spawning enemies to maintain up to `config.maxAlive` alive at once.
   * Call once from GameScene.create() after the player is positioned.
   */
  startSpawning(config: EnemyConfig, playerX: number, playerY: number): void {
    this.spawnTimer?.remove();
    this.config = config;
    this._playerX = playerX;
    this._playerY = playerY;

    // Initial wave: spawn a few enemies immediately (staggered)
    const initial = Math.min(3, config.maxAlive);
    for (let i = 0; i < initial; i++) {
      this.scene.time.delayedCall(i * 350, () => this.trySpawnOne());
    }

    // Repeating check: top up to maxAlive whenever enemies are destroyed
    this.spawnTimer = this.scene.time.addEvent({
      delay: config.spawnIntervalMs,
      loop: true,
      callback: () => this.trySpawnOne(),
    });
  }

  update(time: number, playerX: number, playerY: number): void {
    this._playerX = playerX;
    this._playerY = playerY;
    this.updateAI(time, playerX, playerY);
    this.cullOutOfBoundsBullets();
  }

  // ── spawn helpers ─────────────────────────────────────────────────────────

  private trySpawnOne(): void {
    if (!this.config) return;
    if (this.enemies.countActive(true) >= this.config.maxAlive) return;
    this.spawnOneEnemy();
  }

  private spawnOneEnemy(): void {
    const p = this.spawnPointAwayFrom(this._playerX, this._playerY, this.config.spawnMinDist);
    const enemy = this.enemies.create(p.x, p.y, "enemy") as ActorSprite;
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1, 1);
    enemy.setData("nextShotAt", this.scene.time.now + Phaser.Math.Between(600, 2000));
    enemy.setData("speedScale", this.config.speedScale);
    enemy.setData("fireCooldownScale", this.config.fireCooldownScale);
    enemy.setData("dodgeEndAt", 0);
    enemy.setData("dodgeMidAt", 0);
    enemy.setData("dodgeAngle", 0);
    enemy.body.setCircle(18, 4, 4);
    this.onEnemySpawned?.(enemy);
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private updateAI(time: number, playerX: number, playerY: number): void {
    this.enemies.children.each((child) => {
      const enemy = child as ActorSprite;
      if (!enemy.active) return true;

      const speedScale = (enemy.getData("speedScale") as number | undefined) ?? 1;
      const fireCooldownScale = (enemy.getData("fireCooldownScale") as number | undefined) ?? 1;

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY);
      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerX, playerY);

      if (dist > ENEMY_APPROACH_DIST) {
        this.scene.physics.velocityFromRotation(angleToPlayer, ENEMY_APPROACH_SPEED * speedScale, enemy.body.velocity);
      } else if (dist < ENEMY_RETREAT_DIST) {
        this.scene.physics.velocityFromRotation(angleToPlayer + Math.PI, ENEMY_RETREAT_SPEED * speedScale, enemy.body.velocity);
      } else {
        enemy.body.velocity.scale(0.95);
      }

      enemy.setRotation(angleToPlayer + Math.PI / 2);

      // lateral dodge triggered on fire
      const dodgeEndAt = (enemy.getData("dodgeEndAt") as number) ?? 0;
      if (time < dodgeEndAt) {
        const dodgeMidAt = enemy.getData("dodgeMidAt") as number;
        const dodgeAngle = enemy.getData("dodgeAngle") as number;
        const dir = time < dodgeMidAt ? 1 : -1;
        enemy.body.velocity.x += Math.cos(dodgeAngle) * dir * ENEMY_DODGE_SPEED * speedScale;
        enemy.body.velocity.y += Math.sin(dodgeAngle) * dir * ENEMY_DODGE_SPEED * speedScale;
      }

      const nextShotAt = enemy.getData("nextShotAt") as number;
      if (time >= nextShotAt) {
        this.fireEnemyBullet(enemy, angleToPlayer);
        enemy.setData("nextShotAt", time + (ENEMY_FIRE_COOLDOWN_MS + Phaser.Math.Between(-100, 250)) * fireCooldownScale);
      }

      return true;
    });
  }

  private fireEnemyBullet(enemy: ActorSprite, angle: number): void {
    // trigger a strafe-and-return dodge perpendicular to the shot direction
    const now = this.scene.time.now;
    const side = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
    enemy.setData("dodgeAngle", angle + (Math.PI / 2) * side);
    enemy.setData("dodgeMidAt", now + ENEMY_DODGE_DURATION_MS / 2);
    enemy.setData("dodgeEndAt", now + ENEMY_DODGE_DURATION_MS);

    this.sound.playEnemyShoot();
    const bullet = this.enemyBullets.get(enemy.x, enemy.y, "enemyBullet") as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    bullet.enableBody(true, enemy.x, enemy.y, true, true);
    bullet.setCircle(3, 0, 0);
    bullet.setDepth(1);

    const spread = Phaser.Math.DegToRad(Phaser.Math.Between(-6, 6));
    const finalAngle = angle + spread;
    bullet.setVelocity(Math.cos(finalAngle) * 480, Math.sin(finalAngle) * 480);
    bullet.setRotation(finalAngle + Math.PI / 2);
  }

  private cullOutOfBoundsBullets(): void {
    this.enemyBullets.children.iterate((child) => {
      const b = child as Phaser.Physics.Arcade.Image;
      if (!b.active) return true;
      if (b.x < -40 || b.x > WORLD_W + 40 || b.y < -40 || b.y > WORLD_H + 40) {
        b.disableBody(true, true);
      }
      return true;
    });
  }

  private randomPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(Phaser.Math.Between(50, WORLD_W - 50), Phaser.Math.Between(50, WORLD_H - 50));
  }

  private spawnPointAwayFrom(x: number, y: number, minDist: number): Phaser.Math.Vector2 {
    let point = this.randomPoint();
    let attempts = 0;
    while (Phaser.Math.Distance.Between(point.x, point.y, x, y) < minDist && attempts < 24) {
      point = this.randomPoint();
      attempts++;
    }
    return point;
  }
}
