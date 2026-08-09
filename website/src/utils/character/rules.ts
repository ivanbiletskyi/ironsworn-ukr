// Обчислювані значення персонажа. Нічого не зберігається — усе виводиться зі стану.
// Правила: CHARACTER_SHEET_PLAN.md §3.3, §3.4, §3.6, §3.7, §3.9.

import type { Character, DebilityKey, Rank, StatKey } from './types';
import {
  BASE_MAX_MOMENTUM,
  BASE_RESET_MOMENTUM,
  DEBILITY_BLOCKS_STAT,
  DEBILITY_KEYS,
  MAX_ATTR,
  MAX_STAT,
  MAX_TICKS,
  MIN_ATTR,
  MIN_MOMENTUM,
  MIN_STAT,
  RANK_TICKS,
  TICKS_PER_BOX,
} from './types';

export function countDebilities(character: Character): number {
  return DEBILITY_KEYS.reduce((n, key) => (character.debilities[key] ? n + 1 : n), 0);
}

/** Кожна відмічена слабкість зменшує максимальний імпульс на 1. */
export function maxMomentum(character: Character): number {
  return BASE_MAX_MOMENTUM - countDebilities(character);
}

/**
 * Скидання імпульсу — порогове, а не лінійне:
 * 0 слабкостей → +2, одна → +1, дві й більше → 0.
 */
export function resetMomentum(character: Character): number {
  const count = countDebilities(character);
  if (count === 0) return BASE_RESET_MOMENTUM;
  if (count === 1) return 1;
  return 0;
}

export function clampAttribute(value: number): number {
  return Math.min(MAX_ATTR, Math.max(MIN_ATTR, Math.round(value)));
}

export function clampStat(value: number): number {
  return Math.min(MAX_STAT, Math.max(MIN_STAT, Math.round(value)));
}

/** Імпульс не опускається нижче −6 і не перевищує поточного максимуму. */
export function clampMomentum(value: number, character: Character): number {
  return Math.min(maxMomentum(character), Math.max(MIN_MOMENTUM, Math.round(value)));
}

/**
 * Чи можна підвищити показник. Поранений блокує здоров'я,
 * спантеличення — дух, розгубленість — припаси.
 */
export function canRaiseStat(character: Character, stat: StatKey): boolean {
  return !blockingDebility(character, stat);
}

/** Слабкість, що блокує показник, або null. Для підказки в UI. */
export function blockingDebility(character: Character, stat: StatKey): DebilityKey | null {
  for (const key of DEBILITY_KEYS) {
    if (character.debilities[key] && DEBILITY_BLOCKS_STAT[key] === stat) return key;
  }
  return null;
}

// ── Шкали прогресу ────────────────────────────────────────────────────

export function clampTicks(ticks: number): number {
  return Math.min(MAX_TICKS, Math.max(0, Math.round(ticks)));
}

/** Повністю заповнені клітини — саме вони рахуються у кидку прогресу. */
export function boxesFilled(ticks: number): number {
  return Math.floor(clampTicks(ticks) / TICKS_PER_BOX);
}

/** Позначки в останній, неповній клітині (0–3). */
export function partialTicks(ticks: number): number {
  return clampTicks(ticks) % TICKS_PER_BOX;
}

/** Одне «відмітьте прогрес» за рангом виклику. */
export function markProgress(ticks: number, rank: Rank): number {
  return clampTicks(ticks + RANK_TICKS[rank]);
}

/** Шкала стосунків рангу не має — завжди одна позначка. */
export function markBondProgress(ticks: number): number {
  return clampTicks(ticks + 1);
}

// ── Досвід ────────────────────────────────────────────────────────────

export function earnedXp(character: Character): number {
  return character.xp.filter(cell => cell >= 1).length;
}

export function spentXp(character: Character): number {
  return character.xp.filter(cell => cell === 2).length;
}

/** Зароблений, але ще не витрачений досвід. */
export function availableXp(character: Character): number {
  return character.xp.filter(cell => cell === 1).length;
}
