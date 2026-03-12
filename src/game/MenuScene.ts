import Phaser from "phaser";
import { createTextures } from "./TextureFactory";
import { ALL_CHALLENGES, ChallengeDefinition } from "./ChallengeDefinition";
import { SHIP_DEFS, ShipDef, DEFAULT_SHIP_KEY } from "./ShipDefinitions";

// ── Fonts ───────────────────────────────────────────────────────────────────
const FONT = '"Impact", "Arial Black", sans-serif';
const FONT_HEB = '"Arial Hebrew", "Arial Black", sans-serif';

// ── Layout ──────────────────────────────────────────────────────────────────
const CARD_W = 280;
const CARD_H = 170;
const CARD_GAP = 22;
const CARD_RADIUS = 14;

const SHIP_W = 122;
const SHIP_H = 120;
const SHIP_GAP = 16;

// ── Palette ─────────────────────────────────────────────────────────────────
const CARD_FILL = 0x0c1638;
const CARD_FILL_SEL = 0x142050;
const CARD_HIGHLIGHT = 0x1e3868;
const BORDER_DIM = 0x2a4888;
const BORDER_SEL = 0x00ccee;
const GLOW_COLOR = 0x0088cc;
const ACCENT = 0x00bbee;

interface CardEntry {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class MenuScene extends Phaser.Scene {
  private selectedChallenge = ALL_CHALLENGES[0].key;
  private selectedShip = DEFAULT_SHIP_KEY;

  private challengeCards = new Map<string, CardEntry>();
  private shipCards = new Map<string, CardEntry>();
  private padCooldown = 0;

  constructor() {
    super("menu");
  }

  preload(): void {
    createTextures(this);
  }

  create(): void {
    const { width: sw, height: sh } = this.scale;

    // ── Gradient background ────────────────────────────────────────────────
    this.createGradientBg(sw, sh);
    this.addStars(sw, sh);

    // ── Title ──────────────────────────────────────────────────────────────
    const titleY = 38;
    this.add
      .text(sw / 2, titleY, "🚀  SPACE EXPLORER  🚀", {
        fontFamily: FONT,
        fontSize: "44px",
        fontStyle: "bold",
        color: "#eef2ff",
        stroke: "#000a1a",
        strokeThickness: 6,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#0088cc",
          blur: 18,
          fill: true,
          stroke: false,
        },
      })
      .setOrigin(0.5);

    this.drawDecoLine(sw / 2, titleY + 32, 220);

    // ── Challenge section ──────────────────────────────────────────────────
    const chHeaderY = 90;
    this.add
      .text(sw / 2, chHeaderY, ":בחר אתגר", {
        fontFamily: FONT_HEB,
        fontSize: "22px",
        fontStyle: "bold",
        color: "#80d0ee",
        stroke: "#001830",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const cardY = chHeaderY + 28;
    const totalCW = ALL_CHALLENGES.length * CARD_W + (ALL_CHALLENGES.length - 1) * CARD_GAP;
    const cStartX = (sw - totalCW) / 2;

    ALL_CHALLENGES.forEach((ch, i) => {
      this.buildChallengeCard(ch, Math.round(cStartX + i * (CARD_W + CARD_GAP)), cardY);
    });
    this.refreshChallengeCards();

    // ── Ship section ───────────────────────────────────────────────────────
    const shipHeaderY = cardY + CARD_H + 26;
    this.add
      .text(sw / 2, shipHeaderY, ":בחר ספינה", {
        fontFamily: FONT_HEB,
        fontSize: "22px",
        fontStyle: "bold",
        color: "#80d0ee",
        stroke: "#001830",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const shipY = shipHeaderY + 28;
    const totalSW = SHIP_DEFS.length * SHIP_W + (SHIP_DEFS.length - 1) * SHIP_GAP;
    const sStartX = (sw - totalSW) / 2;

    SHIP_DEFS.forEach((def, i) => {
      this.buildShipCard(def, Math.round(sStartX + i * (SHIP_W + SHIP_GAP)), shipY);
    });
    this.refreshShipCards();

    // ── Start button ───────────────────────────────────────────────────────
    this.buildStartButton(sw / 2, shipY + SHIP_H + 44);

    // ── Keyboard navigation ────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT", () => this.navigateChallenge(-1));
    kb.on("keydown-RIGHT", () => this.navigateChallenge(1));
    kb.on("keydown-UP", () => this.navigateShip(-1));
    kb.on("keydown-DOWN", () => this.navigateShip(1));
    kb.on("keydown-ENTER", () => this.startGame());
    kb.on("keydown-SPACE", () => this.startGame());
  }

  // ── Gamepad polling ───────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.padCooldown -= delta;
    if (this.padCooldown > 0) return;

    const pad = this.input.gamepad?.pad1;
    if (!pad) return;

    const lx = pad.leftStick.x;
    const ly = pad.leftStick.y;
    const T = 0.5;
    const CD = 220;

    if (lx < -T || pad.left) {
      this.navigateChallenge(-1);
      this.padCooldown = CD;
    } else if (lx > T || pad.right) {
      this.navigateChallenge(1);
      this.padCooldown = CD;
    } else if (ly < -T || pad.up) {
      this.navigateShip(-1);
      this.padCooldown = CD;
    } else if (ly > T || pad.down) {
      this.navigateShip(1);
      this.padCooldown = CD;
    }

    if (pad.A) {
      this.startGame();
      this.padCooldown = 500;
    }
  }

  // ── Card builders ─────────────────────────────────────────────────────────

  private buildChallengeCard(ch: ChallengeDefinition, x: number, y: number): void {
    const gfx = this.add.graphics();
    this.challengeCards.set(ch.key, { gfx, x, y, w: CARD_W, h: CARD_H });

    // Circular badge behind icon
    const icx = x + CARD_W / 2;
    const icy = y + 54;
    const badge = this.add.graphics();
    badge.fillStyle(0x162860, 0.55);
    badge.fillCircle(icx, icy, 36);
    badge.lineStyle(1, 0x2a5098, 0.3);
    badge.strokeCircle(icx, icy, 36);

    // Icon
    this.add
      .text(icx, icy, ch.icon, {
        fontFamily: FONT_HEB,
        fontSize: "48px",
      })
      .setOrigin(0.5);

    // Label
    this.add
      .text(x + CARD_W / 2, y + 110, ch.label, {
        fontFamily: FONT_HEB,
        fontSize: "20px",
        fontStyle: "bold",
        color: "#eef2ff",
        stroke: "#000a14",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Description
    this.add
      .text(x + CARD_W / 2, y + 140, ch.description, {
        fontFamily: FONT_HEB,
        fontSize: "14px",
        color: "#88aacc",
        stroke: "#000a14",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Interactive hit zone
    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      this.selectedChallenge = ch.key;
      this.refreshChallengeCards();
    });
  }

  private buildShipCard(def: ShipDef, x: number, y: number): void {
    const gfx = this.add.graphics();
    this.shipCards.set(def.key, { gfx, x, y, w: SHIP_W, h: SHIP_H });

    // Ship sprite
    this.add.image(x + SHIP_W / 2, y + SHIP_H / 2 - 10, def.key).setScale(2.2);

    // Ship label
    this.add
      .text(x + SHIP_W / 2, y + SHIP_H - 14, def.label, {
        fontFamily: FONT,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#a8c0e8",
        stroke: "#000a14",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Interactive hit zone
    const zone = this.add.zone(x + SHIP_W / 2, y + SHIP_H / 2, SHIP_W, SHIP_H).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      this.selectedShip = def.key;
      this.refreshShipCards();
    });
  }

  private buildStartButton(cx: number, cy: number): void {
    const bw = 280;
    const bh = 56;
    const x = cx - bw / 2;
    const y = cy - bh / 2;

    const gfx = this.add.graphics();

    // Outer glow
    gfx.fillStyle(0x18a84a, 0.06);
    gfx.fillRoundedRect(x - 18, y - 18, bw + 36, bh + 36, 26);
    gfx.fillStyle(0x18a84a, 0.1);
    gfx.fillRoundedRect(x - 10, y - 10, bw + 20, bh + 20, 20);

    // Main body
    gfx.fillStyle(0x18a84a, 1);
    gfx.fillRoundedRect(x, y, bw, bh, 14);

    // Top highlight band
    gfx.fillStyle(0x30d868, 0.3);
    gfx.fillRoundedRect(x, y, bw, bh * 0.45, {
      tl: 14,
      tr: 14,
      bl: 0,
      br: 0,
    });

    // Top edge line
    gfx.fillStyle(0xffffff, 0.14);
    gfx.fillRoundedRect(x + 16, y + 1, bw - 32, 1.5, 1);

    // Border
    gfx.lineStyle(1.5, 0xffffff, 0.2);
    gfx.strokeRoundedRect(x, y, bw, bh, 14);

    const label = this.add
      .text(cx, cy, "▶  התחל!", {
        fontFamily: FONT_HEB,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#003a10",
        strokeThickness: 4,
        shadow: {
          offsetX: 0,
          offsetY: 1,
          color: "#000000",
          blur: 4,
          fill: true,
          stroke: false,
        },
      })
      .setOrigin(0.5);

    // Gentle pulse
    this.tweens.add({
      targets: [gfx, label],
      scaleX: 1.025,
      scaleY: 1.025,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const zone = this.add.zone(cx, cy, bw, bh).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.startGame());
    zone.on("pointerover", () => {
      this.tweens.add({
        targets: [gfx, label],
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 120,
        ease: "Back.easeOut",
      });
    });
    zone.on("pointerout", () => {
      this.tweens.add({
        targets: [gfx, label],
        scaleX: 1,
        scaleY: 1,
        duration: 120,
      });
    });
  }

  // ── Card rendering ────────────────────────────────────────────────────────

  private drawCardBg(entry: CardEntry, selected: boolean): void {
    const { gfx, x, y, w, h } = entry;
    const r = CARD_RADIUS;
    gfx.clear();

    // Selection outer-glow (layered for soft falloff)
    if (selected) {
      const glowSteps = [
        { e: 12, a: 0.05 },
        { e: 8, a: 0.09 },
        { e: 5, a: 0.14 },
        { e: 2, a: 0.22 },
      ];
      for (const { e, a } of glowSteps) {
        gfx.fillStyle(GLOW_COLOR, a);
        gfx.fillRoundedRect(x - e, y - e, w + e * 2, h + e * 2, r + e * 0.5);
      }
    }

    // Card body
    gfx.fillStyle(selected ? CARD_FILL_SEL : CARD_FILL, 0.94);
    gfx.fillRoundedRect(x, y, w, h, r);

    // Top highlight band (simulated gradient)
    gfx.fillStyle(selected ? CARD_HIGHLIGHT : 0x142848, selected ? 0.4 : 0.25);
    gfx.fillRoundedRect(x, y, w, h * 0.4, {
      tl: r,
      tr: r,
      bl: 0,
      br: 0,
    });

    // Top edge bright line
    gfx.fillStyle(selected ? BORDER_SEL : 0x3060a0, selected ? 0.45 : 0.2);
    gfx.fillRoundedRect(x + 12, y + 1, w - 24, 1.5, 1);

    // Border
    gfx.lineStyle(selected ? 1.8 : 1, selected ? BORDER_SEL : BORDER_DIM, selected ? 0.8 : 0.22);
    gfx.strokeRoundedRect(x, y, w, h, r);
  }

  private refreshChallengeCards(): void {
    this.challengeCards.forEach((entry, key) => this.drawCardBg(entry, key === this.selectedChallenge));
  }

  private refreshShipCards(): void {
    this.shipCards.forEach((entry, key) => this.drawCardBg(entry, key === this.selectedShip));
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  private navigateChallenge(dir: number): void {
    const keys = ALL_CHALLENGES.map((c) => c.key);
    const idx = (keys.indexOf(this.selectedChallenge) + dir + keys.length) % keys.length;
    this.selectedChallenge = keys[idx];
    this.refreshChallengeCards();
  }

  private navigateShip(dir: number): void {
    const keys = SHIP_DEFS.map((s) => s.key);
    const idx = (keys.indexOf(this.selectedShip) + dir + keys.length) % keys.length;
    this.selectedShip = keys[idx];
    this.refreshShipCards();
  }

  private startGame(): void {
    this.scene.start("game", {
      challengeKey: this.selectedChallenge,
      shipKey: this.selectedShip,
    });
  }

  // ── Visual helpers ────────────────────────────────────────────────────────

  private createGradientBg(sw: number, sh: number): void {
    if (this.textures.exists("menu_bg_grad")) {
      this.textures.remove("menu_bg_grad");
    }
    const ct = this.textures.createCanvas("menu_bg_grad", sw, sh)!;
    const ctx = ct.context;
    const grad = ctx.createLinearGradient(0, 0, 0, sh);
    grad.addColorStop(0, "#020a18");
    grad.addColorStop(0.5, "#081428");
    grad.addColorStop(1, "#0c1a34");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sw, sh);
    ct.refresh();
    this.add.image(sw / 2, sh / 2, "menu_bg_grad");
  }

  private addStars(sw: number, sh: number): void {
    const g = this.add.graphics();

    // Faint nebula blobs for depth
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x1a2860, 0.06);
      g.fillCircle(Phaser.Math.Between(Math.round(sw * 0.15), Math.round(sw * 0.85)), Phaser.Math.Between(Math.round(sh * 0.15), Math.round(sh * 0.85)), Phaser.Math.Between(60, 130));
    }

    // Static stars
    for (let i = 0; i < 160; i++) {
      const sx = Phaser.Math.Between(0, sw);
      const sy = Phaser.Math.Between(0, sh);
      const b = Math.random();
      const radius = b < 0.08 ? 2 : b < 0.25 ? 1.2 : 0.7;
      const alpha = b < 0.08 ? 0.7 : b < 0.25 ? 0.4 : 0.2;
      g.fillStyle(b < 0.15 ? 0xaaccff : 0xffffff, alpha);
      g.fillCircle(sx, sy, radius);
    }

    // Twinkling stars
    for (let i = 0; i < 8; i++) {
      const star = this.add.graphics();
      const sx = Phaser.Math.Between(30, sw - 30);
      const sy = Phaser.Math.Between(15, sh - 15);
      star.fillStyle(0xddeeff, 0.55);
      star.fillCircle(sx, sy, 1.5);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.25, to: 0.85 },
        duration: Phaser.Math.Between(1400, 3200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private drawDecoLine(cx: number, y: number, halfLen: number): void {
    const g = this.add.graphics();
    // Center bright segment
    g.lineStyle(1.5, ACCENT, 0.5);
    g.lineBetween(cx - halfLen * 0.45, y, cx + halfLen * 0.45, y);
    // Faded extensions
    g.lineStyle(1, ACCENT, 0.15);
    g.lineBetween(cx - halfLen, y, cx - halfLen * 0.45, y);
    g.lineBetween(cx + halfLen * 0.45, y, cx + halfLen, y);
    // Center diamond dot
    g.fillStyle(ACCENT, 0.55);
    g.fillCircle(cx, y, 2.5);
  }
}
