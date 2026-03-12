import Phaser from "phaser";
import { WORLD_W, WORLD_H, SHIP_THRUST, SHIP_MAX_SPEED, PLAYER_FIRE_COOLDOWN_MS, PLAYER_MAX_HP } from "./constants";
import { InputHandler } from "./InputHandler";
import { SoundManager } from "./SoundManager";
import { DEFAULT_SHIP_KEY } from "./ShipDefinitions";

type ActorSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const RESPAWN_DELAY_MS = 2000;
const RESPAWN_IFRAMES_MS = 1500; // invincible after respawn

export class Player {
  private readonly _sprite: ActorSprite;
  private _health = PLAYER_MAX_HP;
  private _isDead = false;
  private lastShotAt = 0;
  private _invincibleUntil = 0;

  /** Called whenever hull points change (pass the new value). */
  onHealthChanged?: (hp: number) => void;
  /** Called when the player dies and starts the respawn timer. */
  onDied?: () => void;
  /** Called when the player has fully respawned. */
  onRespawned?: () => void;
  /** Called when the player fires a bullet (gun-tip world position). */
  onFired?: (x: number, y: number) => void;
  /** Called when the player takes a hit (player world position). */
  onHit?: (x: number, y: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    private readonly input: InputHandler,
    private readonly sound: SoundManager,
    shipKey: string = DEFAULT_SHIP_KEY,
  ) {
    this._sprite = scene.physics.add
      .sprite(WORLD_W / 2, WORLD_H / 2, shipKey)
      .setDamping(true)
      .setDrag(0.98)
      .setMaxVelocity(SHIP_MAX_SPEED)
      .setCollideWorldBounds(true);

    // Hitbox: 44-px-diameter circle centred in the 64×64 texture
    this._sprite.body.setCircle(22, 10, 10);
  }

  get sprite(): ActorSprite {
    return this._sprite;
  }
  get health(): number {
    return this._health;
  }
  get active(): boolean {
    return !this._isDead;
  }
  get x(): number {
    return this._sprite.x;
  }
  get y(): number {
    return this._sprite.y;
  }
  /** Sprite rotation in radians (= aimAngle + π/2). */
  get rotation(): number {
    return this._sprite.rotation;
  }

  update(time: number, delta: number, enemies: Phaser.Physics.Arcade.Group): void {
    this.handleMovement(delta, enemies);
    this.handleFiring(time);
  }

  takeDamage(amount: number): void {
    if (this._isDead) return;
    const now = this.scene.time.now;
    if (now < this._invincibleUntil) return;
    this._invincibleUntil = now + 600; // 600 ms of i-frames

    this.sound.playPlayerHit();
    this._health -= amount;
    this.onHealthChanged?.(this._health);
    this.onHit?.(this._sprite.x, this._sprite.y);
    this.scene.cameras.main.shake(90, 0.007);

    // Brief orange flash to signal a hit
    this._sprite.setTint(0xff8800);
    this.scene.time.delayedCall(110, () => {
      if (!this._isDead) this._sprite.clearTint();
    });
    this.input.vibrateHit();

    if (this._health <= 0) {
      this.sound.playPlayerDeath();
      this._isDead = true;
      this._sprite.setVelocity(0, 0);
      this._sprite.setAlpha(0.25); // dim instead of hide
      this._sprite.body.enable = false;
      this.onDied?.();
      this.scene.time.delayedCall(RESPAWN_DELAY_MS, () => this.respawn());
    }
  }

  private respawn(): void {
    this._isDead = false;
    this._health = PLAYER_MAX_HP;
    this._sprite.setPosition(WORLD_W / 2, WORLD_H / 2);
    this._sprite.setVelocity(0, 0);
    this._sprite.clearTint();
    this._sprite.setAlpha(1);
    this._sprite.setVisible(true);
    this._sprite.setActive(true);
    this._sprite.body.enable = true;
    // Grant i-frames so the player can move away before taking damage
    this._invincibleUntil = this.scene.time.now + RESPAWN_IFRAMES_MS;
    this.onHealthChanged?.(this._health);
    this.onRespawned?.();
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private handleMovement(deltaMs: number, enemies: Phaser.Physics.Arcade.Group): void {
    const move = this.input.getMoveVector();
    if (move.lengthSq() > 0.01) {
      move.normalize().scale(SHIP_THRUST * (deltaMs / 1000));
      this._sprite.body.velocity.x += move.x;
      this._sprite.body.velocity.y += move.y;
    }

    let aimAngle = this._sprite.rotation;
    const rightStick = this.input.getAimVector();

    if (rightStick) {
      aimAngle = Math.atan2(rightStick.y, rightStick.x);
    } else {
      // Auto-aim: face the nearest active enemy
      let nearestEnemy: ActorSprite | null = null;
      let minDist = Infinity;

      enemies.children.each((child) => {
        const enemy = child as ActorSprite;
        if (!enemy.active) return true;
        const dist = Phaser.Math.Distance.Between(this._sprite.x, this._sprite.y, enemy.x, enemy.y);
        if (dist < minDist) {
          minDist = dist;
          nearestEnemy = enemy;
        }
        return true;
      });

      if (nearestEnemy) {
        aimAngle = Phaser.Math.Angle.Between(this._sprite.x, this._sprite.y, (nearestEnemy as ActorSprite).x, (nearestEnemy as ActorSprite).y);
      }
    }

    this._sprite.setRotation(aimAngle + Math.PI / 2);
  }

  private handleFiring(time: number): void {
    if (!this.input.isFirePressed()) return;
    if (time - this.lastShotAt < PLAYER_FIRE_COOLDOWN_MS) return;

    this.lastShotAt = time;
    this.sound.playPlayerShoot();
    this.input.vibrateFire();
    const bullet = this.bullets.get(this._sprite.x, this._sprite.y, "bullet") as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    bullet.enableBody(true, this._sprite.x, this._sprite.y, true, true);
    bullet.setCircle(3, 0, 0);
    bullet.setDepth(1);

    const angle = this._sprite.rotation - Math.PI / 2;
    bullet.setVelocity(Math.cos(angle) * 900, Math.sin(angle) * 900);
    bullet.setRotation(angle + Math.PI / 2);

    // Notify listeners — gun tip is ~30 px ahead of centre in the aim direction (64×64 ship)
    const noseX = this._sprite.x + Math.cos(angle) * 30;
    const noseY = this._sprite.y + Math.sin(angle) * 30;
    this.onFired?.(noseX, noseY);
  }
}
