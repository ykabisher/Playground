import Phaser from "phaser";
import { WORLD_W, WORLD_H, ROCKET_MAX_CARRY, ROCKET_SPEED, ROCKET_TURN_RATE, ROCKET_PICKUP_SPAWN_INTERVAL_MS, ROCKET_ENEMY_DROP_CHANCE } from "./constants";
import { SoundManager } from "./SoundManager";

type DynSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

/**
 * Manages rocket pickups on the map and homing rocket projectiles fired by the player.
 *
 * GameScene wires up:
 *  - physics overlaps (player↔pickups, rockets↔enemies, rockets↔asteroids)
 *  - calling tryLaunch() when the rocket button is pressed
 *  - calling update() every frame
 *  - calling tryDropPickup() after an enemy is destroyed
 */
export class RocketManager {
  /** Physics group overlapped against the player sprite for collection. */
  readonly pickups: Phaser.Physics.Arcade.Group;
  /** Physics group overlapped against enemies/asteroids for impact detection. */
  readonly rockets: Phaser.Physics.Arcade.Group;

  private count = 0;
  private pickupLabels: Array<{ image: Phaser.Physics.Arcade.Image; label: Phaser.GameObjects.Text }> = [];

  /** Fired whenever the player's rocket stock changes. */
  onCountChanged: ((count: number) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sound: SoundManager,
  ) {
    this.pickups = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
    });

    this.rockets = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 10,
      runChildUpdate: false,
    });

    // First pickup after a short delay so the player knows it exists
    scene.time.delayedCall(6000, () => this.spawnRandomPickup());

    // Periodic random pickups
    scene.time.addEvent({
      delay: ROCKET_PICKUP_SPAWN_INTERVAL_MS,
      loop: true,
      callback: () => this.spawnRandomPickup(),
    });
  }

  get rocketCount(): number {
    return this.count;
  }

  /** Spawn a random pickup anywhere on the map. */
  spawnRandomPickup(): void {
    const x = Phaser.Math.Between(80, WORLD_W - 80);
    const y = Phaser.Math.Between(80, WORLD_H - 80);
    this.createPickup(x, y);
  }

  /** Roll and optionally drop a pickup at the given world position (enemy/asteroid death). */
  tryDropPickup(x: number, y: number): void {
    if (Math.random() < ROCKET_ENEMY_DROP_CHANCE) {
      this.createPickup(x, y);
    }
  }

  /** Called by the overlap callback in GameScene when the player touches a pickup. */
  collectPickup(pickup: Phaser.Physics.Arcade.Image): void {
    if (!pickup.active) return;
    if (this.count >= ROCKET_MAX_CARRY) return;
    const idx = this.pickupLabels.findIndex((e) => e.image === pickup);
    if (idx !== -1) {
      this.pickupLabels[idx].label.destroy();
      this.pickupLabels.splice(idx, 1);
    }
    pickup.destroy();
    this.count = Math.min(this.count + 1, ROCKET_MAX_CARRY);
    this.sound.playRocketPickup();
    this.onCountChanged?.(this.count);
  }

  /**
   * Try to fire one rocket from the player's current position.
   * @returns true if a rocket was successfully launched.
   */
  tryLaunch(playerX: number, playerY: number, enemies: Phaser.Physics.Arcade.Group, asteroids: Phaser.Physics.Arcade.Group): boolean {
    if (this.count <= 0) return false;

    const target = this.findNearestTarget(playerX, playerY, enemies, asteroids);
    if (!target) return false;

    this.count--;
    this.onCountChanged?.(this.count);
    this.sound.playRocketLaunch();

    const rocket = this.rockets.get(playerX, playerY, "rocketProjectile") as DynSprite;
    if (!rocket) return false;

    rocket.enableBody(true, playerX, playerY, true, true);
    rocket.setDepth(3);
    rocket.body.setSize(8, 16);
    rocket.setData("target", target);

    const angle = Phaser.Math.Angle.Between(playerX, playerY, target.x, target.y);
    rocket.setVelocity(Math.cos(angle) * ROCKET_SPEED, Math.sin(angle) * ROCKET_SPEED);
    rocket.setRotation(angle + Math.PI / 2);

    return true;
  }

  /** Must be called every frame from GameScene.update(). */
  update(delta: number, enemies: Phaser.Physics.Arcade.Group, asteroids: Phaser.Physics.Arcade.Group): void {
    // Sync emoji labels with pickup positions and cull orphans
    for (let i = this.pickupLabels.length - 1; i >= 0; i--) {
      const entry = this.pickupLabels[i];
      if (entry.image.active) {
        entry.label.setPosition(entry.image.x, entry.image.y);
      } else {
        entry.label.destroy();
        this.pickupLabels.splice(i, 1);
      }
    }

    this.rockets.children.each((child) => {
      const rocket = child as DynSprite;
      if (!rocket.active) return true;

      // Re-acquire target if the previous one was destroyed
      let target = rocket.getData("target") as Phaser.GameObjects.Sprite | null;
      if (!target || !target.active) {
        target = this.findNearestTarget(rocket.x, rocket.y, enemies, asteroids);
        rocket.setData("target", target);
      }

      if (target) {
        const desired = Phaser.Math.Angle.Between(rocket.x, rocket.y, target.x, target.y);
        const current = Math.atan2(rocket.body.velocity.y, rocket.body.velocity.x);
        const diff = Phaser.Math.Angle.Wrap(desired - current);
        const maxTurn = ROCKET_TURN_RATE * (delta / 1000);
        const newAngle = current + Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        rocket.setVelocity(Math.cos(newAngle) * ROCKET_SPEED, Math.sin(newAngle) * ROCKET_SPEED);
        rocket.setRotation(newAngle + Math.PI / 2);
      }

      // Cull rockets that leave the world bounds
      if (rocket.x < -60 || rocket.x > WORLD_W + 60 || rocket.y < -60 || rocket.y > WORLD_H + 60) {
        rocket.disableBody(true, true);
      }

      return true;
    });
  }

  // ── private helpers ───────────────────────────────────────────────────────────

  private createPickup(x: number, y: number): void {
    const pickup = this.pickups.create(x, y, "rocketPickup") as Phaser.Physics.Arcade.Image;
    pickup.setDepth(5);

    const label = this.scene.add.text(x, y, "🚀", { fontSize: "28px" }).setOrigin(0.5).setDepth(6);

    this.pickupLabels.push({ image: pickup, label });

    // Pulse both badge and emoji label to attract the player's attention
    this.scene.tweens.add({
      targets: [pickup, label],
      alpha: { from: 0.5, to: 1.0 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private findNearestTarget(x: number, y: number, enemies: Phaser.Physics.Arcade.Group, asteroids: Phaser.Physics.Arcade.Group): Phaser.GameObjects.Sprite | null {
    let nearest: Phaser.GameObjects.Sprite | null = null;
    let nearestDist = Infinity;

    const check = (group: Phaser.Physics.Arcade.Group) => {
      group.children.each((child) => {
        const sprite = child as Phaser.GameObjects.Sprite;
        if (!sprite.active) return true;
        const d = Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = sprite;
        }
        return true;
      });
    };

    check(enemies);
    check(asteroids);
    return nearest;
  }
}
