import Phaser from "phaser";
import { PLAYER_MAX_HP, HUD_HEART_COUNT } from "./constants";
import type { SoundManager } from "./SoundManager";

const HP_PER_HEART = PLAYER_MAX_HP / HUD_HEART_COUNT;

// ── Arcade-bold styling ────────────────────────────────────────────────────────
const PANEL_BG = 0x080820;
const PANEL_GLOW = 0x00e5ff;
const PANEL_ALPHA = 0.88;
const PANEL_RADIUS = 14;

const FONT_MAIN = '"Impact", "Arial Black", sans-serif';
const FONT_HEBREW = '"Arial Hebrew", "Arial Black", sans-serif';

const SCORE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_MAIN,
  fontSize: "42px",
  color: "#ffe700",
  stroke: "#6b3d00",
  strokeThickness: 7,
};

const CHALLENGE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_HEBREW,
  fontSize: "18px",
  color: "#00e5ff",
  stroke: "#002244",
  strokeThickness: 4,
};

const ROCKET_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_MAIN,
  fontSize: "24px",
  color: "#ff9900",
  stroke: "#4a1d00",
  strokeThickness: 5,
};

const CENTER_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_MAIN,
  fontSize: "52px",
  color: "#ffffff",
  stroke: "#000000",
  strokeThickness: 10,
  align: "center",
};

const SOUND_BTN_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_MAIN,
  fontSize: "24px",
  color: "#00e5ff",
  stroke: "#001a28",
  strokeThickness: 4,
};

// Learning tracker — big, readable
const TRACKER_SLOT_W = 44;
const TRACKER_COLLECTED_COLOR = "#ffe700";
const TRACKER_TARGET_COLOR = "#ff9900"; // next item to collect in spell mode
const TRACKER_MISSING_COLOR = "#335";

// Hearts layout
const HEART_X0 = 22;
const HEART_Y = 106;
const HEART_GAP = 46;

// Sound button panel
const SND_BTN_SIZE = 44;

export class HUD {
  private scene: Phaser.Scene;
  private soundManager: SoundManager;

  // Panels
  private panelGfx: Phaser.GameObjects.Graphics;

  // Score
  private scoreText: Phaser.GameObjects.Text;
  private challengeText: Phaser.GameObjects.Text;

  // Hearts
  private hearts: Phaser.GameObjects.Image[] = [];
  private lastFilledHearts = HUD_HEART_COUNT;

  // Rockets
  private rocketText: Phaser.GameObjects.Text;

  // Sound toggle
  private soundBtnBg: Phaser.GameObjects.Graphics;
  private soundBtn: Phaser.GameObjects.Text;

  // Center text
  private centerText: Phaser.GameObjects.Text;

  // Math question display (lazy-created on first setMathQuestion call)
  private mathQuestionText: Phaser.GameObjects.Text | null = null;

  // Learning tracker
  private trackerItems: string[] = [];
  private trackerSlots: Phaser.GameObjects.Text[] = [];
  private trackerBg: Phaser.GameObjects.Graphics | null = null;
  private currentSpellTarget: string | null = null;
  private lastCollectedItems: ReadonlySet<string> = new Set();

  constructor(scene: Phaser.Scene, soundManager: SoundManager) {
    this.scene = scene;
    this.soundManager = soundManager;
    const sw = scene.scale.width;
    const sh = scene.scale.height;

    // ── Background panels ───────────────────────────────────────────────────
    this.panelGfx = scene.add.graphics().setScrollFactor(0).setDepth(98);
    this.drawPanels(sw, sh);

    // ── Score (big, yellow, star emoji) ─────────────────────────────────────
    this.scoreText = scene.add.text(30, 16, "⭐ 0", SCORE_STYLE).setScrollFactor(0).setDepth(100);

    this.challengeText = scene.add.text(30, 62, "", CHALLENGE_STYLE).setScrollFactor(0).setDepth(100);

    // ── Hearts row (big chunky hearts) ──────────────────────────────────────
    for (let i = 0; i < HUD_HEART_COUNT; i++) {
      const heart = scene.add
        .image(HEART_X0 + i * HEART_GAP, HEART_Y, "heartFull")
        .setScrollFactor(0)
        .setDepth(100)
        .setOrigin(0, 0.5);
      this.hearts.push(heart);
    }

    // ── Rocket counter ──────────────────────────────────────────────────────
    this.rocketText = scene.add
      .text(HEART_X0, HEART_Y + 30, "🚀 ×0", ROCKET_STYLE)
      .setScrollFactor(0)
      .setDepth(100);

    // ── Sound toggle button (bottom-right, with panel) ──────────────────────
    this.soundBtnBg = scene.add.graphics().setScrollFactor(0).setDepth(98);
    this.soundBtn = scene.add
      .text(0, 0, "🔊 ON", SOUND_BTN_STYLE)
      .setScrollFactor(0)
      .setDepth(100)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.soundManager.toggleMute();
        this.syncSoundIcon();
        scene.tweens.add({
          targets: this.soundBtn,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
          ease: "Back.easeOut",
        });
      });
    this.positionSoundBtn(sw, sh);

    // ── Center text ─────────────────────────────────────────────────────────
    this.centerText = scene.add
      .text(sw / 2, sh / 2, "", CENTER_STYLE)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    // ── Resize ──────────────────────────────────────────────────────────────
    scene.scale.on("resize", (size: Phaser.Structs.Size) => this.onResize(size));
  }

  // ── Learning tracker ────────────────────────────────────────────────────────

  initLearningTracker(items: string[], rtl = false): void {
    this.trackerItems = rtl ? [...items].reverse() : [...items];

    // Background strip for tracker
    this.trackerBg = this.scene.add.graphics().setScrollFactor(0).setDepth(97);

    this.trackerSlots = this.trackerItems.map((item) =>
      this.scene.add
        .text(0, 0, item, {
          fontFamily: FONT_HEBREW,
          fontSize: "26px",
          color: TRACKER_MISSING_COLOR,
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0.38),
    );

    this.positionTrackerSlots(this.scene.scale.width);
  }

  updateLearningTracker(collected: ReadonlySet<string>): void {
    this.lastCollectedItems = collected;
    this.trackerSlots.forEach((slot, i) => {
      const item = this.trackerItems[i];
      const wasCollected = slot.alpha >= 0.9 && slot.style.color === TRACKER_COLLECTED_COLOR;
      if (collected.has(item)) {
        slot.setStyle({ color: TRACKER_COLLECTED_COLOR });
        slot.setAlpha(1);
        if (!wasCollected) {
          // Pop + glow on collect
          this.scene.tweens.add({
            targets: slot,
            scaleX: 1.8,
            scaleY: 1.8,
            duration: 180,
            yoyo: true,
            ease: "Back.easeOut",
          });
        }
      } else if (item === this.currentSpellTarget) {
        slot.setStyle({ color: TRACKER_TARGET_COLOR });
        slot.setAlpha(1);
      } else {
        slot.setStyle({ color: TRACKER_MISSING_COLOR });
        slot.setAlpha(0.4);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────

  setScore(score: number): void {
    this.scoreText.setText(`⭐ ${score}`);
    // Juicy pop
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 100,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }

  setChallenge(label: string): void {
    this.challengeText.setText(label);
  }

  /**
   * Show or update a math question banner at the top-centre of the screen.
   * Lazy-creates the Text object on first call.
   */
  setMathQuestion(question: string, solved: number, total: number): void {
    const sw = this.scene.scale.width;
    if (!this.mathQuestionText) {
      this.mathQuestionText = this.scene.add
        .text(sw / 2, 26, "", {
          fontFamily: '"Impact", "Arial Black", sans-serif',
          fontSize: "34px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 8,
          align: "center",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100);
    }
    this.mathQuestionText.setText(`${question}   ${solved} / ${total}`);
    // Bounce the question text on each new question
    this.scene.tweens.add({
      targets: this.mathQuestionText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 140,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }

  /** Highlight the current target item in the spell tracker. */
  setCurrentSpellTarget(target: string | null): void {
    this.currentSpellTarget = target;
    this.updateLearningTracker(this.lastCollectedItems);
  }

  setWave(_wave: number): void {
    // Wave system removed — kept as a no-op for compatibility during transition
  }

  setHealth(hp: number, _maxHp: number): void {
    const filled = Math.ceil(Math.max(0, hp) / HP_PER_HEART);

    for (let i = 0; i < HUD_HEART_COUNT; i++) {
      this.hearts[i].setTexture(i < filled ? "heartFull" : "heartEmpty");
    }

    // Lost a heart → bounce surviving heart + shake the lost one
    if (filled < this.lastFilledHearts) {
      if (filled > 0) {
        this.scene.tweens.add({
          targets: this.hearts[filled - 1],
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 100,
          yoyo: true,
          ease: "Back.easeOut",
        });
      }
      const lost = this.hearts[filled];
      if (lost) {
        const origX = lost.x;
        this.scene.tweens.add({
          targets: lost,
          x: origX + 5,
          duration: 40,
          yoyo: true,
          repeat: 4,
          onComplete: () => lost.setX(origX),
        });
      }
    }

    // Respawn refill → cascade pop all hearts
    if (filled > this.lastFilledHearts) {
      for (let i = 0; i < filled; i++) {
        this.scene.tweens.add({
          targets: this.hearts[i],
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 160,
          yoyo: true,
          ease: "Bounce.easeOut",
          delay: i * 80,
        });
      }
    }

    this.lastFilledHearts = filled;
  }

  setCenterText(text: string): void {
    this.centerText.setText(text);
    this.centerText.setVisible(text.length > 0);
  }

  setRocketCount(count: number): void {
    this.rocketText.setText(`🚀 ×${count}`);
    this.scene.tweens.add({
      targets: this.rocketText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }

  syncSoundIcon(): void {
    this.soundBtn.setText(this.soundManager.muted ? "🔇 OFF" : "🔊 ON");
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private drawPanels(sw: number, _sh: number): void {
    const g = this.panelGfx;
    g.clear();

    // ── Top-left score panel ────────────────────────────────────────────────
    // Glow
    g.fillStyle(PANEL_GLOW, 0.08);
    g.fillRoundedRect(6, 4, 228, 92, PANEL_RADIUS + 4);
    // Body
    g.fillStyle(PANEL_BG, PANEL_ALPHA);
    g.fillRoundedRect(10, 8, 220, 84, PANEL_RADIUS);
    g.lineStyle(2, PANEL_GLOW, 0.45);
    g.strokeRoundedRect(10, 8, 220, 84, PANEL_RADIUS);

    // ── Hearts panel ────────────────────────────────────────────────────────
    const heartsW = HUD_HEART_COUNT * HEART_GAP + 12;
    g.fillStyle(PANEL_BG, PANEL_ALPHA * 0.6);
    g.fillRoundedRect(10, 93, heartsW, 44, 12);
    g.lineStyle(1.5, 0xff5588, 0.3);
    g.strokeRoundedRect(10, 93, heartsW, 44, 12);

    void sw; // available for future right-side panels
  }

  private drawTrackerBg(screenW: number): void {
    if (!this.trackerBg) return;
    this.trackerBg.clear();
    const count = this.trackerSlots.length;
    if (count === 0) return;
    const totalW = count * TRACKER_SLOT_W + 24;
    const x = Math.max(4, (screenW - totalW) / 2);
    this.trackerBg.fillStyle(PANEL_BG, PANEL_ALPHA * 0.7);
    this.trackerBg.fillRoundedRect(x, 4, totalW, 46, 14);
    this.trackerBg.lineStyle(1.5, 0xffcc44, 0.25);
    this.trackerBg.strokeRoundedRect(x, 4, totalW, 46, 14);
  }

  private positionTrackerSlots(screenW: number): void {
    const count = this.trackerSlots.length;
    const totalW = count * TRACKER_SLOT_W;
    const startX = Math.max(12, (screenW - totalW) / 2);
    this.trackerSlots.forEach((slot, i) => {
      slot.setX(startX + i * TRACKER_SLOT_W + TRACKER_SLOT_W / 2);
      slot.setY(27);
    });
    this.drawTrackerBg(screenW);
  }

  private positionSoundBtn(sw: number, sh: number): void {
    const bx = sw - SND_BTN_SIZE - 8;
    const by = sh - SND_BTN_SIZE - 8;
    this.soundBtnBg.clear();
    this.soundBtnBg.fillStyle(PANEL_BG, PANEL_ALPHA);
    this.soundBtnBg.fillRoundedRect(bx, by, SND_BTN_SIZE + 40, SND_BTN_SIZE, 14);
    this.soundBtnBg.lineStyle(1.5, PANEL_GLOW, 0.35);
    this.soundBtnBg.strokeRoundedRect(bx, by, SND_BTN_SIZE + 40, SND_BTN_SIZE, 14);
    this.soundBtn.setPosition(bx + (SND_BTN_SIZE + 40) / 2, by + SND_BTN_SIZE / 2);
  }

  private onResize(size: Phaser.Structs.Size): void {
    const { width, height } = size;
    this.centerText.setPosition(width / 2, height / 2);
    if (this.mathQuestionText) this.mathQuestionText.setX(width / 2);
    this.drawPanels(width, height);
    this.positionSoundBtn(width, height);
    if (this.trackerSlots.length > 0) this.positionTrackerSlots(width);
  }
}
