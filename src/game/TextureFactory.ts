import Phaser from "phaser";
import { SHIP_DEFS, ShipDef } from "./ShipDefinitions";

/**
 * Draws a polished player ship into the Graphics object.
 * Canvas size: 64×64.  Nose points UP (y=0), engine at bottom (y=64).
 */
function drawCuteShip(g: Phaser.GameObjects.Graphics, def: ShipDef): void {
  const { bodyColor, bodyDark, wingColor, cockpitColor, engineColor } = def;

  // ── Layer 0: deep engine exhaust glow (behind everything) ─────────────────
  g.fillStyle(engineColor, 0.15);
  g.fillCircle(32, 64, 14);
  g.fillStyle(engineColor, 0.3);
  g.fillCircle(32, 62, 10);

  // ── Layer 1: swept delta wings ────────────────────────────────────────────
  // Left wing
  g.fillStyle(wingColor, 1);
  g.beginPath();
  g.moveTo(16, 28);
  g.lineTo(1, 49);
  g.lineTo(5, 56);
  g.lineTo(19, 43);
  g.closePath();
  g.fillPath();
  // Left wing specular
  g.fillStyle(0xffffff, 0.15);
  g.beginPath();
  g.moveTo(16, 28);
  g.lineTo(2, 46);
  g.lineTo(10, 40);
  g.closePath();
  g.fillPath();
  // Right wing
  g.fillStyle(wingColor, 1);
  g.beginPath();
  g.moveTo(48, 28);
  g.lineTo(63, 49);
  g.lineTo(59, 56);
  g.lineTo(45, 43);
  g.closePath();
  g.fillPath();
  // Right wing specular
  g.fillStyle(0xffffff, 0.15);
  g.beginPath();
  g.moveTo(48, 28);
  g.lineTo(62, 46);
  g.lineTo(54, 40);
  g.closePath();
  g.fillPath();

  // ── Layer 2: main hull (pill shape) ───────────────────────────────────────
  g.fillStyle(bodyColor, 1);
  g.fillRoundedRect(16, 4, 32, 52, 16);
  // Hull side shadow — gives a subtle 3-D curved feel
  g.fillStyle(bodyDark, 0.22);
  g.fillRoundedRect(36, 8, 10, 42, { tl: 0, tr: 12, bl: 0, br: 12 });
  // Hull top specular highlight
  g.fillStyle(0xffffff, 0.2);
  g.fillRoundedRect(20, 7, 24, 16, 10);

  // ── Layer 3: engine nozzle ────────────────────────────────────────────────
  g.fillStyle(bodyDark, 1);
  g.fillRoundedRect(21, 50, 22, 13, 5);
  // Hot engine core
  g.fillStyle(engineColor, 0.95);
  g.fillCircle(32, 61, 7);
  g.fillStyle(0xffffff, 0.65);
  g.fillCircle(32, 60, 3);

  // ── Layer 4: cockpit dome ─────────────────────────────────────────────────
  g.fillStyle(cockpitColor, 1);
  g.fillCircle(32, 22, 14);
  // Dome rim
  g.lineStyle(2.5, bodyDark, 0.7);
  g.strokeCircle(32, 22, 14);
  // Glass shine
  g.fillStyle(0xffffff, 0.72);
  g.fillCircle(27, 17, 5);
  g.fillStyle(0xffffff, 0.38);
  g.fillCircle(30, 14, 3);
  g.fillStyle(0xffffff, 0.18);
  g.fillCircle(24, 15, 2);
}

export function createTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // ── Player ships (48×48, cute & friendly — one texture per ShipDef) ───────
  for (const def of SHIP_DEFS) {
    g.clear();
    drawCuteShip(g, def);
    g.generateTexture(def.key, 64, 64);
  }

  // Enemy UFO: 44×44 saucer — green hull, cyan cockpit dome
  g.clear();
  // Underbelly engine glow
  g.fillStyle(0x55ffaa, 0.12);
  g.fillEllipse(22, 34, 40, 14);
  // Dark underside
  g.fillStyle(0x1a6b35, 1);
  g.fillEllipse(22, 28, 40, 13);
  // Main saucer disc
  g.fillStyle(0x2dcc71, 1);
  g.fillEllipse(22, 24, 42, 17);
  // Lighter top rim
  g.fillStyle(0x7de9a5, 1);
  g.fillEllipse(22, 21, 38, 10);
  // Dome base
  g.fillStyle(0x27ae60, 1);
  g.fillEllipse(22, 19, 22, 11);
  // Cockpit glass
  g.fillStyle(0x00bcd4, 1);
  g.fillEllipse(22, 15, 18, 15);
  // Glass shine
  g.fillStyle(0x80deea, 0.65);
  g.fillEllipse(19, 12, 7, 7);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(17, 11, 3);
  // Hull outline
  g.lineStyle(2, 0x1a7d40, 0.85);
  g.strokeEllipse(22, 24, 42, 17);
  // Engine port lights
  g.fillStyle(0xff3333, 0.9);
  g.fillCircle(11, 29, 3);
  g.fillStyle(0xff9900, 1);
  g.fillCircle(22, 31, 3);
  g.fillStyle(0xff3333, 0.9);
  g.fillCircle(33, 29, 3);
  // Port glow halos
  g.fillStyle(0xff6600, 0.2);
  g.fillCircle(11, 29, 6);
  g.fillCircle(22, 31, 6);
  g.fillCircle(33, 29, 6);
  g.generateTexture("enemy", 44, 44);

  // Player bullet — glowing cyan orb 8×8
  g.clear();
  g.fillStyle(0x00eeff, 0.22);
  g.fillCircle(4, 4, 4);
  g.fillStyle(0x66ffff, 0.85);
  g.fillCircle(4, 4, 2.8);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 1.4);
  g.generateTexture("bullet", 8, 8);

  // Enemy bullet — glowing orange orb 8×8
  g.clear();
  g.fillStyle(0xff6600, 0.22);
  g.fillCircle(4, 4, 4);
  g.fillStyle(0xff9900, 0.88);
  g.fillCircle(4, 4, 2.8);
  g.fillStyle(0xffee44, 1);
  g.fillCircle(4, 4, 1.4);
  g.generateTexture("enemyBullet", 8, 8);

  // Chunky asteroid: 80×80, irregular polygon, blue-gray flat shading
  g.clear();
  {
    const apts: [number, number][] = [
      [40, 5],
      [60, 8],
      [74, 22],
      [77, 40],
      [70, 58],
      [55, 72],
      [37, 77],
      [20, 70],
      [7, 56],
      [4, 32],
      [15, 13],
    ];
    // Base fill
    g.fillStyle(0x7282c0, 1);
    g.beginPath();
    apts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.fillPath();
    // Top-left light face
    g.fillStyle(0x9aabdd, 0.8);
    g.beginPath();
    g.moveTo(40, 5);
    g.lineTo(60, 8);
    g.lineTo(50, 30);
    g.lineTo(28, 28);
    g.lineTo(15, 13);
    g.closePath();
    g.fillPath();
    // Bottom-right shadow face
    g.fillStyle(0x4a5595, 0.65);
    g.beginPath();
    g.moveTo(77, 40);
    g.lineTo(70, 58);
    g.lineTo(55, 72);
    g.lineTo(37, 77);
    g.lineTo(44, 54);
    g.lineTo(60, 48);
    g.closePath();
    g.fillPath();
    // Main crater
    g.fillStyle(0x3a4580, 0.88);
    g.fillCircle(26, 33, 12);
    g.fillStyle(0x5568a8, 0.5);
    g.fillCircle(26, 33, 9);
    // Side crater
    g.fillStyle(0x3a4580, 0.75);
    g.fillCircle(57, 28, 9);
    g.fillStyle(0x5568a8, 0.4);
    g.fillCircle(57, 28, 7);
    // Small crater
    g.fillStyle(0x3a4580, 0.65);
    g.fillCircle(43, 58, 7);
    g.fillStyle(0x5568a8, 0.35);
    g.fillCircle(43, 58, 5);
    // Outline
    g.lineStyle(2, 0x3a4a82, 0.55);
    g.beginPath();
    apts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.strokePath();
  }
  g.generateTexture("asteroid", 80, 80);

  // Rocket projectile — 12×26, pointing upward (nose at top, flame at bottom)
  g.clear();
  // Body
  g.fillStyle(0xf5a623, 1);
  g.fillRect(3, 6, 6, 13);
  // Nose
  g.fillStyle(0xffe066, 1);
  g.beginPath();
  g.moveTo(6, 0);
  g.lineTo(9, 6);
  g.lineTo(3, 6);
  g.closePath();
  g.fillPath();
  // Left fin
  g.fillStyle(0xcc4400, 1);
  g.beginPath();
  g.moveTo(3, 13);
  g.lineTo(0, 19);
  g.lineTo(3, 19);
  g.closePath();
  g.fillPath();
  // Right fin
  g.beginPath();
  g.moveTo(9, 13);
  g.lineTo(12, 19);
  g.lineTo(9, 19);
  g.closePath();
  g.fillPath();
  // Exhaust flame
  g.fillStyle(0xff6600, 1);
  g.beginPath();
  g.moveTo(4, 19);
  g.lineTo(8, 19);
  g.lineTo(6, 26);
  g.closePath();
  g.fillPath();
  g.generateTexture("rocketProjectile", 12, 26);

  // Rocket pickup badge — 48×48 purple/magenta circle; emoji overlay added by RocketManager
  g.clear();
  // Glow halo
  g.fillStyle(0xff00ff, 0.18);
  g.fillCircle(24, 24, 24);
  // Drop shadow
  g.fillStyle(0x440055, 0.9);
  g.fillCircle(25, 26, 21);
  // Main disc
  g.fillStyle(0xaa00cc, 1);
  g.fillCircle(24, 24, 21);
  // Top-left highlight
  g.fillStyle(0xdd88ff, 0.55);
  g.fillCircle(19, 18, 11);
  // Specular dot
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(17, 15, 4);
  // Bright outer ring
  g.lineStyle(3, 0xff44ff, 1);
  g.strokeCircle(24, 24, 21);
  g.generateTexture("rocketPickup", 48, 48);

  // Letter pickup badge — 48×48 blue/cyan circle; the letter itself is a Text overlay
  g.clear();
  // Glow halo
  g.fillStyle(0x00ccff, 0.18);
  g.fillCircle(24, 24, 24);
  // Drop shadow
  g.fillStyle(0x001155, 0.9);
  g.fillCircle(25, 26, 21);
  // Main disc
  g.fillStyle(0x0055cc, 1);
  g.fillCircle(24, 24, 21);
  // Top-left highlight
  g.fillStyle(0x66aaff, 0.55);
  g.fillCircle(19, 18, 11);
  // Specular dot
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(17, 15, 4);
  // Bright outer ring
  g.lineStyle(3, 0x00eeff, 1);
  g.strokeCircle(24, 24, 21);
  g.generateTexture("letterPickup", 48, 48);

  // ── Star field textures (parallax background layers) ─────────────────────
  // Uses deterministic pseudo-random via sin/cos so textures are always identical.

  // Layer 0 — far stars: 512×512, 120 dim dots (dense background)
  {
    const TW = 512,
      TH = 512;
    g.clear();
    for (let i = 0; i < 120; i++) {
      const x = ((Math.sin(i * 127.1) * 0.5 + 0.5) * TW) | 0;
      const y = ((Math.sin(i * 311.7) * 0.5 + 0.5) * TH) | 0;
      const a = 0.1 + (Math.sin(i * 93.4) * 0.5 + 0.5) * 0.35;
      const r = Math.sin(i * 41.3);
      const col = r > 0.5 ? 0xaad4ff : r > 0 ? 0xffeecc : 0xffffff;
      g.fillStyle(col, a);
      g.fillPoint(x, y, 1);
    }
    g.generateTexture("stars_far", TW, TH);
  }

  // Layer 1 — mid stars: 400×400, 40 slightly brighter dots
  {
    const TW = 400,
      TH = 400;
    g.clear();
    for (let i = 0; i < 40; i++) {
      const x = ((Math.sin(i * 223.1) * 0.5 + 0.5) * TW) | 0;
      const y = ((Math.sin(i * 431.7) * 0.5 + 0.5) * TH) | 0;
      const a = 0.3 + (Math.sin(i * 173.4) * 0.5 + 0.5) * 0.5;
      const r = Math.sin(i * 53.3);
      const col = r > 0.4 ? 0xc8e8ff : r > 0 ? 0xffd0b0 : 0xffffff;
      // soft glow halo
      g.fillStyle(col, a * 0.18);
      g.fillCircle(x, y, 2);
      g.fillStyle(col, a);
      g.fillPoint(x, y, 1);
    }
    g.generateTexture("stars_mid", TW, TH);
  }

  // Layer 2 — near stars: 300×300, 15 bright stars with glow
  {
    const TW = 300,
      TH = 300;
    g.clear();
    for (let i = 0; i < 15; i++) {
      const x = ((Math.sin(i * 347.1) * 0.5 + 0.5) * TW) | 0;
      const y = ((Math.sin(i * 519.7) * 0.5 + 0.5) * TH) | 0;
      const a = 0.55 + (Math.sin(i * 213.4) * 0.5 + 0.5) * 0.35;
      const r = Math.sin(i * 71.3);
      const col = r > 0.3 ? 0xddf2ff : r > 0 ? 0xfff0cc : 0xffffff;
      // subtle glow
      g.fillStyle(col, a * 0.14);
      g.fillCircle(x, y, 3);
      // bright core
      g.fillStyle(col, a);
      g.fillPoint(x, y, 1);
    }
    g.generateTexture("stars_near", TW, TH);
  }

  // ── Nebula cloud texture — 512×512, soft coloured fog blobs ─────────────────
  {
    const TW = 512,
      TH = 512;
    g.clear();
    // Deep blue-purple nebula blobs at varying sizes and alphas
    const blobs: [number, number, number, number, number][] = [
      // x,   y,   r,   alpha, colour
      [130, 180, 120, 0.055, 0x2233cc],
      [360, 140, 100, 0.045, 0x1122aa],
      [260, 340, 140, 0.06, 0x331688],
      [80, 390, 90, 0.04, 0x4400aa],
      [430, 350, 110, 0.05, 0x220099],
      [200, 80, 70, 0.038, 0x113db0],
      [440, 200, 80, 0.032, 0x0d2fa0],
      // Warm accent cloud (reddish)
      [300, 220, 100, 0.035, 0x881133],
      [160, 310, 80, 0.028, 0x771020],
    ];
    for (const [bx, by, br, ba, bc] of blobs) {
      g.fillStyle(bc, ba * 0.35);
      g.fillCircle(bx, by, br * 1.4);
      g.fillStyle(bc, ba * 0.6);
      g.fillCircle(bx, by, br);
      g.fillStyle(bc, ba);
      g.fillCircle(bx, by, br * 0.55);
    }
    g.generateTexture("nebula", TW, TH);
  }

  // ── HUD heart textures (40×38, chunky & cute) ──────────────────────────────

  // Heart full — bright pink with glow and highlights
  g.clear();
  // outer glow
  g.fillStyle(0xff2266, 0.25);
  g.fillCircle(11, 12, 13);
  g.fillCircle(29, 12, 13);
  // main lobes
  g.fillStyle(0xff3377, 1);
  g.fillCircle(11, 11, 11);
  g.fillCircle(29, 11, 11);
  // bottom wedge
  g.beginPath();
  g.moveTo(0, 14);
  g.lineTo(20, 37);
  g.lineTo(40, 14);
  g.closePath();
  g.fillPath();
  // darker crease down middle
  g.fillStyle(0xcc1155, 0.35);
  g.beginPath();
  g.moveTo(18, 8);
  g.lineTo(20, 34);
  g.lineTo(22, 8);
  g.closePath();
  g.fillPath();
  // shine bubbles
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(11, 7, 4);
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(28, 7, 3);
  g.fillStyle(0xffffff, 0.15);
  g.fillCircle(14, 4, 2);
  g.generateTexture("heartFull", 40, 38);

  // Heart empty — dark translucent outline heart
  g.clear();
  g.fillStyle(0x222244, 0.5);
  g.fillCircle(11, 11, 11);
  g.fillCircle(29, 11, 11);
  g.beginPath();
  g.moveTo(0, 14);
  g.lineTo(20, 37);
  g.lineTo(40, 14);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x555588, 0.6);
  g.strokeCircle(11, 11, 11);
  g.strokeCircle(29, 11, 11);
  g.generateTexture("heartEmpty", 40, 38);

  // ── Particle textures for EffectsManager ─────────────────────────────────

  // particle_spark — 8×8 soft glowing dot (used for sparks, engine trail, confetti)
  g.clear();
  g.fillStyle(0xffffff, 0.06);
  g.fillCircle(4, 4, 4);
  g.fillStyle(0xffffff, 0.22);
  g.fillCircle(4, 4, 2.8);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(4, 4, 1.6);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 0.8);
  g.generateTexture("particle_spark", 8, 8);

  // particle_smoke — 14×14 soft gray puff (smoke, dust)
  g.clear();
  g.fillStyle(0xaaaaaa, 0.06);
  g.fillCircle(7, 7, 7);
  g.fillStyle(0xaaaaaa, 0.2);
  g.fillCircle(7, 7, 5);
  g.fillStyle(0xaaaaaa, 0.5);
  g.fillCircle(7, 7, 3);
  g.fillStyle(0xcccccc, 0.8);
  g.fillCircle(7, 7, 1.5);
  g.generateTexture("particle_smoke", 14, 14);

  // particle_glow — 32×32 large radial glow (flash images, death bloom)
  g.clear();
  g.fillStyle(0xffffff, 0.03);
  g.fillCircle(16, 16, 16);
  g.fillStyle(0xffffff, 0.1);
  g.fillCircle(16, 16, 11);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(16, 16, 6);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(16, 16, 2.5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 1);
  g.generateTexture("particle_glow", 32, 32);

  // particle_ring — 64×64 circle outline for shockwave rings
  g.clear();
  g.lineStyle(3, 0xffffff, 1);
  g.strokeCircle(32, 32, 29);
  g.generateTexture("particle_ring", 64, 64);

  // particle_debris — 8×8 rocky polygon chunk for asteroid explosions
  g.clear();
  g.fillStyle(0xa0b3d4, 1);
  g.beginPath();
  g.moveTo(1, 3);
  g.lineTo(3, 0);
  g.lineTo(7, 1);
  g.lineTo(8, 5);
  g.lineTo(5, 8);
  g.lineTo(1, 7);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xc8d8ee, 0.65);
  g.beginPath();
  g.moveTo(1, 3);
  g.lineTo(3, 0);
  g.lineTo(5, 2);
  g.closePath();
  g.fillPath();
  g.generateTexture("particle_debris", 8, 8);

  g.destroy();
}
