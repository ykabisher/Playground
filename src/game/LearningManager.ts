import Phaser from "phaser";
import { LEARNING_DROP_CHANCE } from "./constants";
import type { LearningSet } from "./LearningConfig";

const PICKUP_FALL_SPEED = 50; // px/s — pickup drifts gently downward
const PICKUP_LIFETIME_MS = 20_000; // auto-expire after 20 s

interface PickupEntry {
  image: Phaser.Physics.Arcade.Image;
  label: Phaser.GameObjects.Text;
}

/**
 * Manages learning-item pickups (letters / words / emojis) that drop from
 * enemies and are collected by flying the player into them.
 *
 * GameScene is responsible for:
 *  - physics overlap: player.sprite ↔ this.pickups → call this.collect()
 *  - calling this.tryDrop(x, y) after an enemy is destroyed
 *  - calling this.update()  every frame
 */
export class LearningManager {
  /** Physics group — register a player overlap against this in GameScene. */
  readonly pickups: Phaser.Physics.Arcade.Group;

  private readonly set: LearningSet;
  private readonly mode: "collect" | "spell";
  private readonly collected = new Set<string>();
  private readonly active: PickupEntry[] = [];
  private done = false;

  /** Fired each time the player picks up a new item. */
  onItemCollected: ((item: string, collected: ReadonlySet<string>) => void) | null = null;

  /** Fired once when every item in the set has been collected. */
  onAllCollected: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    learningSet: LearningSet,
    mode: "collect" | "spell" = "collect",
  ) {
    this.set = learningSet;
    this.mode = mode;
    this.pickups = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
  }

  get collectedItems(): ReadonlySet<string> {
    return this.collected;
  }
  get totalItems(): number {
    return this.set.items.length;
  }

  /** In spell mode: the next item the player must collect in order; null when done. */
  get nextTarget(): string | null {
    if (this.mode !== "spell") return null;
    return this.set.items.find((i) => !this.collected.has(i)) ?? null;
  }

  // ── public API ────────────────────────────────────────────────────────────

  /**
   * Roll the drop chance and optionally spawn a pickup at the given world
   * position. Only drops items the player has not yet collected.
   * Call this after every enemy kill.
   */
  tryDrop(x: number, y: number): void {
    if (this.done) return;
    if (Math.random() >= LEARNING_DROP_CHANCE) return;

    if (this.mode === "spell") {
      // In ordered mode, only drop the next uncollected item in sequence
      const next = this.nextTarget;
      if (!next) return;
      this.spawnPickup(x, y, next);
    } else {
      const remaining = this.set.items.filter((i) => !this.collected.has(i));
      if (remaining.length === 0) return;
      const item = remaining[Phaser.Math.Between(0, remaining.length - 1)];
      this.spawnPickup(x, y, item);
    }
  }

  /**
   * Call this from the GameScene overlap callback (player ↔ pickups).
   * Handles collection, deduplication, and fires callbacks.
   */
  collect(pickup: Phaser.Physics.Arcade.Image): void {
    if (!pickup.active) return;
    const item = pickup.getData("item") as string;

    // In spell mode, only accept the next expected letter in sequence
    if (this.mode === "spell") {
      const next = this.nextTarget;
      if (!next || item !== next) {
        this.destroyPickup(pickup);
        return;
      }
    }

    this.destroyPickup(pickup);

    if (this.collected.has(item)) return; // already owned
    this.collected.add(item);
    this.onItemCollected?.(item, this.collected);

    if (this.collected.size >= this.set.items.length) {
      this.done = true;
      this.onAllCollected?.();
    }
  }

  /** Must be called every frame from GameScene.update(). */
  update(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      if (entry.image.active) {
        entry.label.setPosition(entry.image.x, entry.image.y);
      } else {
        entry.label.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  // ── private ───────────────────────────────────────────────────────────────

  private spawnPickup(x: number, y: number, item: string): void {
    const img = this.scene.physics.add.image(x, y, "letterPickup");
    this.pickups.add(img);
    img.setDepth(4);
    img.setData("item", item);
    (img.body as Phaser.Physics.Arcade.Body).setVelocityY(PICKUP_FALL_SPEED);
    img.setCollideWorldBounds(true);

    const label = this.scene.add
      .text(x, y, item, {
        fontFamily: '"Arial Hebrew", "Arial Black", "Impact", sans-serif',
        fontSize: this.set.itemFontSize ?? "28px",
        color: "#ffffff",
        stroke: "#002299",
        strokeThickness: 5,
        shadow: { offsetX: 0, offsetY: 2, color: "#000055", blur: 6, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(5);

    const entry: PickupEntry = { image: img, label };
    this.active.push(entry);

    // Auto-expire so the map doesn't fill with uncollected pickups
    this.scene.time.delayedCall(PICKUP_LIFETIME_MS, () => this.destroyPickup(img));
  }

  private destroyPickup(img: Phaser.Physics.Arcade.Image): void {
    if (!img.active) return;
    const idx = this.active.findIndex((e) => e.image === img);
    if (idx !== -1) {
      this.active[idx].label.destroy();
      this.active.splice(idx, 1);
    }
    img.destroy();
  }
}
