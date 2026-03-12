/**
 * ChallengeDefinition.ts
 *
 * All available challenges are defined here.
 * To add a new challenge, append an entry to ALL_CHALLENGES — no other file needs changing.
 */

/** Fixed enemy difficulty settings used throughout a challenge (replaces the old wave system). */
export interface EnemyConfig {
  /** Maximum enemies alive on screen at once. */
  maxAlive: number;
  /** Milliseconds between spawn attempts. */
  spawnIntervalMs: number;
  /** Multiplier on enemy move speed (1.0 = normal). */
  speedScale: number;
  /** Multiplier on enemy fire-cooldown duration (>1 = shoots slower). */
  fireCooldownScale: number;
  /** Minimum world-unit distance from the player when choosing a spawn point. */
  spawnMinDist: number;
}

export type ChallengeType = "collect" | "spell" | "math";

export interface ChallengeDefinition {
  /** Unique key passed between scenes. */
  key: string;
  /** Short display name shown on the menu card. */
  label: string;
  /** Subtitle / instruction shown on the menu card. */
  description: string;
  /** Large icon (emoji or single letter) displayed on the card. */
  icon: string;
  type: ChallengeType;
  enemyConfig: EnemyConfig;

  // ── collect / spell ──────────────────────────────────────────────────────
  /** Ordered list of items to collect (required for 'collect' and 'spell'). */
  items?: string[];
  /** Right-to-left display order for the HUD tracker. */
  rtl?: boolean;
  /** Font size override for the floating pickup badge. Default "22px". */
  itemFontSize?: string;

  // ── math ─────────────────────────────────────────────────────────────────
  /** Number of equations to solve before winning. Default: 8. */
  mathQuestionCount?: number;
  /** Largest operand used when generating addition questions. Default: 5. */
  mathMaxOperand?: number;
}

export const ALL_CHALLENGES: ChallengeDefinition[] = [
  {
    key: "hebrew",
    label: "אותיות עבריות",
    description: "אסוף את כל 22 האותיות!",
    icon: "א",
    type: "collect",
    rtl: true,
    itemFontSize: "20px",
    items: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"],
    enemyConfig: { maxAlive: 5, spawnIntervalMs: 2200, speedScale: 0.75, fireCooldownScale: 1.5, spawnMinDist: 320 },
  },
  {
    key: "spell_shalom",
    label: "כתוב שלום",
    description: "אסוף ש ← ל ← ו ← ם בסדר!",
    icon: "📝",
    type: "spell",
    rtl: true,
    itemFontSize: "28px",
    items: ["ש", "ל", "ו", "ם"],
    enemyConfig: { maxAlive: 4, spawnIntervalMs: 1800, speedScale: 0.7, fireCooldownScale: 1.6, spawnMinDist: 300 },
  },
  {
    key: "math",
    label: "חשבון",
    description: "ירה על התשובה הנכונה!",
    icon: "🔢",
    type: "math",
    mathQuestionCount: 8,
    mathMaxOperand: 5,
    enemyConfig: { maxAlive: 4, spawnIntervalMs: 1600, speedScale: 0.7, fireCooldownScale: 1.8, spawnMinDist: 300 },
  },
];
