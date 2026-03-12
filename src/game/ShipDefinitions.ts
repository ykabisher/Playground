/**
 * ShipDefinitions.ts
 *
 * Defines all selectable player ships.  Each entry contains the colors needed
 * to procedurally draw the ship in TextureFactory, plus a display label for a
 * future ship-selection screen.
 *
 * To add a new ship: append a new object to SHIP_DEFS below — no other file
 * needs to change until you wire up the selection UI.
 */

export interface ShipDef {
  /** Phaser texture key registered for this ship (e.g. "ship_0"). */
  key: string;
  /** Human-readable name shown in the ship-selection screen. */
  label: string;
  /** Main hull colour. */
  bodyColor: number;
  /** Darker shade of the hull used for shading and the engine nozzle. */
  bodyDark: number;
  /** Wing / fin colour — should contrast with the body. */
  wingColor: number;
  /** Cockpit dome colour — something bright and friendly. */
  cockpitColor: number;
  /** Engine exhaust glow colour. */
  engineColor: number;
}

export const SHIP_DEFS: ShipDef[] = [
  {
    key: "ship_0",
    label: "Star Pup",
    bodyColor: 0x9c4dcf,
    bodyDark: 0x5c2878,
    wingColor: 0xe040fb,
    cockpitColor: 0xd4f0ff,
    engineColor: 0x40c4ff,
  },
  {
    key: "ship_1",
    label: "Ocean Jet",
    bodyColor: 0x1976d2,
    bodyDark: 0x0d47a1,
    wingColor: 0x00e5ff,
    cockpitColor: 0xe8f5ff,
    engineColor: 0x80d8ff,
  },
  {
    key: "ship_2",
    label: "Leaf Rocket",
    bodyColor: 0x388e3c,
    bodyDark: 0x1b5e20,
    wingColor: 0xfdd835,
    cockpitColor: 0xf0ffe8,
    engineColor: 0xff9800,
  },
  {
    key: "ship_3",
    label: "Flame Wing",
    bodyColor: 0xe64a19,
    bodyDark: 0x8d1f00,
    wingColor: 0xffc400,
    cockpitColor: 0xfff8e8,
    engineColor: 0xff6d00,
  },
  {
    key: "ship_4",
    label: "Ice Blaster",
    bodyColor: 0x00838f,
    bodyDark: 0x005662,
    wingColor: 0xb2ebf2,
    cockpitColor: 0xf0fdff,
    engineColor: 0xce93d8,
  },
];

/** Texture key used by default when no ship has been selected. */
export const DEFAULT_SHIP_KEY = SHIP_DEFS[0].key;
