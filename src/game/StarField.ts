import Phaser from "phaser";

// How much each layer scrolls relative to the camera (0 = fixed, 1 = world speed).
// Layers sorted front-to-back: near, mid, far, nebula.
const PARALLAX_FACTORS = [0.05, 0.14, 0.3, 0.018] as const;
const LAYER_KEYS = ["stars_far", "stars_mid", "stars_near", "nebula"] as const;
const LAYER_DEPTHS = [-9, -8, -7, -10] as const;

// The TileSprite is fixed to the screen (scrollFactor 0) so we size it to
// something large enough to cover any reasonable viewport / letterboxed canvas.
const COVER_W = 4096;
const COVER_H = 2304;

export class StarField {
  private readonly layers: Phaser.GameObjects.TileSprite[];
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private elapsed = 0;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
    this.layers = LAYER_KEYS.map((key, i) =>
      scene.add
        .tileSprite(0, 0, COVER_W, COVER_H, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(LAYER_DEPTHS[i])
        .setBlendMode(key === "nebula" ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL),
    );
  }

  update(delta: number): void {
    this.elapsed += delta;

    const cx = this.camera.scrollX;
    const cy = this.camera.scrollY;

    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].tilePositionX = cx * PARALLAX_FACTORS[i];
      this.layers[i].tilePositionY = cy * PARALLAX_FACTORS[i];
    }

    // Gentle twinkle: pulse the near-star layer's alpha on a slow sine wave.
    this.layers[2].setAlpha(0.8 + 0.2 * Math.sin(this.elapsed * 0.0018));

    // Nebula drifts very slowly and breathes gently
    this.layers[3].setAlpha(0.55 + 0.1 * Math.sin(this.elapsed * 0.00055));
  }
}
