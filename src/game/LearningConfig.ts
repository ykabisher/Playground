/**
 * LearningConfig.ts
 *
 * All learning sets are defined here. To add a new set, create a new object
 * below and update ACTIVE_LEARNING_SET. No other file needs to change.
 *
 * Each LearningSet describes what the kid collects in-game:
 *   - Hebrew letters, English letters, emojis, words, shapes, numbers…
 */

export interface LearningSet {
  id: string;
  /** Display label (shown on future selection screens). */
  label: string;
  /** Ordered list of items to collect (letters / words / emojis). */
  items: string[];
  /** Font size for the floating pickup badge label. Default "22px". */
  itemFontSize?: string;
  /** Hint for right-to-left languages — used by UI to reverse display order. */
  rtl?: boolean;
}

// ── Available learning sets ───────────────────────────────────────────────────

const HEBREW_LETTERS: LearningSet = {
  id: "hebrew",
  label: "אותיות עבריות",
  rtl: true,
  // 22 letters of the Hebrew alphabet, alef to tav
  items: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"],
  itemFontSize: "26px",
};

const ENGLISH_LETTERS: LearningSet = {
  id: "english",
  label: "English Letters",
  items: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
  itemFontSize: "26px",
};

const EMOJIS: LearningSet = {
  id: "emojis",
  label: "Emojis",
  items: ["🌟", "🚀", "🎯", "🦊", "🐉", "🌈", "🎮", "🏆", "💎", "⭐", "🔥", "❄️"],
  itemFontSize: "24px",
};

/** All sets — for future selection UI. */
export const ALL_LEARNING_SETS: LearningSet[] = [HEBREW_LETTERS, ENGLISH_LETTERS, EMOJIS];

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE CONFIGURATION — change this line to switch learning sets
// ─────────────────────────────────────────────────────────────────────────────
export const ACTIVE_LEARNING_SET: LearningSet = HEBREW_LETTERS;
