import Phaser from "phaser";

type AnyPad = Gamepad | Phaser.Input.Gamepad.Gamepad;

/**
 * Abstracts keyboard and gamepad input into simple movement/aim/fire queries.
 * Add new bindings here — nothing else needs to change.
 */
export class InputHandler {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: { [k: string]: Phaser.Input.Keyboard.Key };
  private nativeGamepad: Gamepad | null = null;
  /** Tracks RB/R1 (button 5) state for just-pressed detection. */
  private rocketBtnWasDown = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys("W,A,S,D,SPACE,R,M,F") as {
      [k: string]: Phaser.Input.Keyboard.Key;
    };

    scene.input.gamepad!.on("connected", (pad: Phaser.Input.Gamepad.Gamepad) => {
      console.log("Gamepad connected:", pad.id);
    });

    scene.input.gamepad!.on("disconnected", (pad: Phaser.Input.Gamepad.Gamepad) => {
      console.log("Gamepad disconnected:", pad.id);
    });

    // Fallback: pick up native gamepad on first pointer interaction (helps Firefox)
    scene.input.on("pointerdown", () => {
      if (this.nativeGamepad) return;
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.nativeGamepad = gamepads[i];
          console.log(`Using native gamepad: ${this.nativeGamepad?.id}`);
          break;
        }
      }
    });
  }

  /** Returns a vector representing the desired movement direction (not normalized). */
  getMoveVector(): Phaser.Math.Vector2 {
    const pad = this.getPad();
    let mvX = 0;
    let mvY = 0;

    if (pad) {
      mvX = this.deadzone(this.getStickX(pad, 0));
      mvY = this.deadzone(this.getStickY(pad, 0));
    }

    if (Math.abs(mvX) < 0.01) {
      if (this.keys.A.isDown) mvX = -1;
      else if (this.keys.D.isDown) mvX = 1;
    }

    if (Math.abs(mvY) < 0.01) {
      if (this.keys.W.isDown) mvY = -1;
      else if (this.keys.S.isDown) mvY = 1;
    }

    return new Phaser.Math.Vector2(mvX, mvY);
  }

  /**
   * Returns the right-stick aim vector, or null if the stick is not being used.
   * When null, the caller should fall back to auto-aim logic.
   */
  getAimVector(): Phaser.Math.Vector2 | null {
    const pad = this.getPad();
    if (!pad) return null;
    const rx = this.deadzone(this.getStickX(pad, 1));
    const ry = this.deadzone(this.getStickY(pad, 1));
    if (Math.abs(rx) < 0.01 && Math.abs(ry) < 0.01) return null;
    return new Phaser.Math.Vector2(rx, ry);
  }

  isFirePressed(): boolean {
    const pad = this.getPad();
    return this.isButtonPressed(pad, [0, 5, 7]) || this.keys.SPACE.isDown || this.scene.input.activePointer.isDown;
  }

  isRestartPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.R);
  }

  /**
   * Returns true on the frame the player presses F (keyboard) or RB/R1 (gamepad).
   * Must be called exactly once per frame so gamepad state tracking stays accurate.
   */
  isRocketJustPressed(): boolean {
    const kbJust = Phaser.Input.Keyboard.JustDown(this.keys.F);

    const pad = this.getPad();
    let padJust = false;
    if (pad) {
      const isNowDown = !!(pad as any).buttons?.[5]?.pressed;
      padJust = isNowDown && !this.rocketBtnWasDown;
      this.rocketBtnWasDown = isNowDown;
    } else {
      this.rocketBtnWasDown = false;
    }

    return kbJust || padJust;
  }

  /** True on the frame the player presses M to toggle mute. */
  isMuteJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.M);
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private getPad(): AnyPad | null {
    return this.scene.input.gamepad?.getPad(0) || this.getRefreshedNativeGamepad();
  }

  /** Re-polls the native Gamepad API each frame so axes/buttons are current. */
  private getRefreshedNativeGamepad(): Gamepad | null {
    if (!this.nativeGamepad || !navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i]!.id === this.nativeGamepad.id) {
        return gamepads[i];
      }
    }
    return null;
  }

  private deadzone(value: number, threshold = 0.15): number {
    return Math.abs(value) < threshold ? 0 : value;
  }

  private getStickX(pad: AnyPad, stickIndex: number): number {
    if ("leftStick" in pad) {
      const p = pad as Phaser.Input.Gamepad.Gamepad;
      return stickIndex === 0 ? p.leftStick?.x || 0 : p.rightStick?.x || 0;
    }
    return ((pad as Gamepad).axes?.[stickIndex * 2] as number) || 0;
  }

  private getStickY(pad: AnyPad, stickIndex: number): number {
    if ("leftStick" in pad) {
      const p = pad as Phaser.Input.Gamepad.Gamepad;
      return stickIndex === 0 ? p.leftStick?.y || 0 : p.rightStick?.y || 0;
    }
    return ((pad as Gamepad).axes?.[stickIndex * 2 + 1] as number) || 0;
  }

  private isButtonPressed(pad: AnyPad | null, buttonIndices: number[]): boolean {
    if (!pad) return false;

    if ("buttons" in pad) {
      for (const idx of buttonIndices) {
        if ((pad as any).buttons?.[idx]?.pressed) return true;
      }
      return false;
    }

    // Native gamepad: also check RT axis (axis 5)
    const nativePad = pad as Gamepad;
    if (((nativePad.axes?.[5] as number) || 0) > 0.35) return true;
    for (const idx of buttonIndices) {
      if (nativePad.buttons?.[idx]?.pressed) return true;
    }
    return false;
  }

  /** Short weak pulse when the player fires. */
  vibrateHit(): void {
    this.rumble(200, 0.8, 0.4);
  }

  /** Brief strong rumble when the player takes a hit. */
  vibrateFire(): void {
    this.rumble(40, 0.0, 0.25);
  }

  private rumble(duration: number, strongMagnitude: number, weakMagnitude: number): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;
      const vib = (gp as any).vibrationActuator as { playEffect: (type: string, params: object) => Promise<unknown> } | undefined;
      if (!vib) continue;
      vib.playEffect("dual-rumble", { startDelay: 0, duration, weakMagnitude, strongMagnitude }).catch(() => {
        /* not supported on this browser/controller */
      });
      return; // only vibrate the first active pad
    }
  }
}
