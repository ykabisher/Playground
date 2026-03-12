import Phaser from "phaser";
import type { ChallengeDefinition } from "./ChallengeDefinition";
import type { HUD } from "./HUD";
import type { SoundManager } from "./SoundManager";

type EnemySprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const FONT = '"Comic Sans MS", "Arial Rounded MT Bold", cursive';

interface EnemyLabel {
  enemy: EnemySprite;
  text: Phaser.GameObjects.Text;
}

/**
 * Manages the math mini-game: generates addition questions, assigns answer
 * values to enemy sprites as floating labels, and tracks how many questions
 * have been answered correctly.
 *
 * Usage (GameScene):
 *   1. new MathManager(scene, challengeDef, hud, sound)
 *   2. enemyManager.onEnemySpawned = (e) => mathManager.assignToEnemy(e)
 *   3. Before eSprite.destroy(): mathManager.onEnemyKilled(eSprite)
 *   4. Call mathManager.update() every frame
 */
export class MathManager {
  private currentAnswer = 0;
  private solvedCount = 0;
  private readonly targetCount: number;
  private readonly maxOperand: number;
  private labels: EnemyLabel[] = [];
  /** Pool of answer values handed out to newly spawned enemies (1 correct + 3 wrong). */
  private answerPool: number[] = [];

  /** Fired once when all questions have been answered correctly. */
  onAllSolved: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    config: ChallengeDefinition,
    private readonly hud: HUD,
    private readonly _sound: SoundManager,
  ) {
    this.targetCount = config.mathQuestionCount ?? 8;
    this.maxOperand = config.mathMaxOperand ?? 5;
    this.generateQuestion();
  }

  /** Assign a math answer value and floating label to a freshly spawned enemy. */
  assignToEnemy(enemy: EnemySprite): void {
    if (this.answerPool.length === 0) this.refillPool();
    const value = this.answerPool.pop()!;
    enemy.setData("mathValue", value);

    const label = this.scene.add
      .text(enemy.x, enemy.y - 26, String(value), {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.labels.push({ enemy, text: label });
  }

  /**
   * Call BEFORE enemy.destroy() so the math value can be read.
   * Returns true when the enemy was carrying the correct answer.
   */
  onEnemyKilled(enemy: EnemySprite): boolean {
    const value = enemy.getData("mathValue") as number | undefined;
    this.cleanupLabel(enemy);
    if (value === undefined) return false;

    if (value === this.currentAnswer) {
      this.solvedCount++;
      if (this.solvedCount >= this.targetCount) {
        this.onAllSolved?.();
      } else {
        this.generateQuestion();
      }
      return true;
    }
    return false;
  }

  /** Reposition floating labels; prune labels whose enemy has been destroyed. */
  update(): void {
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const { enemy, text } = this.labels[i];
      if (enemy.active) {
        text.setPosition(enemy.x, enemy.y - 26);
      } else {
        text.destroy();
        this.labels.splice(i, 1);
      }
    }
  }

  /** Clean up all floating labels (call this when the scene is shutting down). */
  destroy(): void {
    this.labels.forEach((l) => l.text.destroy());
    this.labels = [];
  }

  // ── private ────────────────────────────────────────────────────────────────

  private generateQuestion(): void {
    const a = Phaser.Math.Between(1, this.maxOperand);
    const b = Phaser.Math.Between(1, this.maxOperand);
    this.currentAnswer = a + b;
    this.refillPool();
    this.hud.setMathQuestion(`${a} + ${b} = ?`, this.solvedCount, this.targetCount);
  }

  /** Build a shuffled pool: 1 correct answer + 3 nearby wrong answers. */
  private refillPool(): void {
    const wrongs = this.generateWrongAnswers(3);
    this.answerPool = Phaser.Utils.Array.Shuffle([this.currentAnswer, ...wrongs]) as number[];
  }

  private generateWrongAnswers(count: number): number[] {
    const wrongs: number[] = [];
    const used = new Set([this.currentAnswer]);
    const hi = this.maxOperand * 2 + 2;

    for (let attempt = 0; attempt < 100 && wrongs.length < count; attempt++) {
      const lo = Math.max(1, this.currentAnswer - 3);
      const v = Phaser.Math.Between(lo, Math.min(hi, this.currentAnswer + 3));
      if (!used.has(v)) {
        wrongs.push(v);
        used.add(v);
      }
    }
    // Fallback: sequential offsets above the correct answer
    let offset = 1;
    while (wrongs.length < count) {
      const v = this.currentAnswer + offset;
      if (!used.has(v)) {
        wrongs.push(v);
        used.add(v);
      }
      offset++;
    }
    return wrongs;
  }

  private cleanupLabel(enemy: EnemySprite): void {
    const idx = this.labels.findIndex((l) => l.enemy === enemy);
    if (idx !== -1) {
      this.labels[idx].text.destroy();
      this.labels.splice(idx, 1);
    }
  }
}
