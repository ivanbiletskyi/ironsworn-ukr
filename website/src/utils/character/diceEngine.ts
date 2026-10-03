// Кидки аркуша персонажа. Усі функції чисті (окрім самого кидка граників)
// і не змінюють стан персонажа — рішення про спалення імпульсу ухвалює UI.
// Правила: CHARACTER_SHEET_PLAN.md §3.1, §3.2, §3.5, §3.8.

import { MAX_ACTION_SCORE } from './types';
import { boxesFilled } from './rules';

export type Outcome = 'strong' | 'weak' | 'miss';

interface BaseRoll {
  id: string;
  label: string;
  challengeDice: [number, number];
  outcome: Outcome;
  /** дубль на граниках виклику — тригер для повороту сюжету */
  matched: boolean;
  timestamp: number;
}

export interface ActionRollResult extends BaseRoll {
  kind: 'action';
  actionDie: number;
  stat: number;
  adds: number;
  /** значення дії після скасування граника дії та обмеження в 10 */
  actionScore: number;
  /** сума перевищила 10 і була обмежена */
  capped: boolean;
  /** негативний імпульс скасував граник дії */
  actionDieCanceled: boolean;
  /** які граники виклику скасовано спаленням імпульсу */
  canceledChallenge: [boolean, boolean];
  momentumBurned: boolean;
}

export interface ProgressRollResult extends BaseRoll {
  kind: 'progress';
  /** повністю заповнені клітини, 0–10 */
  boxes: number;
}

export type SheetRoll = ActionRollResult | ProgressRollResult;

/**
 * Кидок d100 ходу оракула («Сплатити ціну», «Спитати Оракула»). Результату
 * влучання в нього немає — лише число і те, що воно означає.
 */
export interface OracleRollResult {
  kind: 'oracle';
  id: string;
  label: string;
  /** 1–100; 100 читається як «00». */
  value: number;
  /** Рядок таблиці або відповідь «Так» / «Ні». */
  result: string;
  /** дубль цифр (11, 22 … 100) — на «Спитати Оракула» це несподіванка */
  matched: boolean;
  timestamp: number;
}

/** Запис журналу аркуша: кидок граників або кидок d100 ходу оракула. */
export type SheetLogEntry = SheetRoll | OracleRollResult;

// ── Граники ───────────────────────────────────────────────────────────

const d6 = () => Math.floor(Math.random() * 6) + 1;
const d10 = () => Math.floor(Math.random() * 10) + 1;
const d100 = () => Math.floor(Math.random() * 100) + 1;

let counter = 0;
const nextId = () => `roll-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * Спалення записується в журнал окремим записом, а не переписує початковий кидок,
 * тож потребує власного ідентифікатора.
 */
export function commitBurn(
  result: ActionRollResult,
  momentum: number,
): ActionRollResult | null {
  const burned = previewBurn(result, momentum);
  return burned && { ...burned, id: nextId(), timestamp: Date.now() };
}

// ── Визначення результату ─────────────────────────────────────────────

/**
 * Скільки граників виклику подолано. Нічия — на користь граника виклику,
 * тому порівняння строго більше. Скасований граник вважається подоланим.
 */
function countBeaten(
  score: number,
  challengeDice: [number, number],
  canceled: [boolean, boolean],
): number {
  return challengeDice.reduce(
    (n, die, i) => (canceled[i] || score > die ? n + 1 : n),
    0,
  );
}

function toOutcome(beaten: number): Outcome {
  if (beaten === 2) return 'strong';
  if (beaten === 1) return 'weak';
  return 'miss';
}

const OUTCOME_ORDER: Record<Outcome, number> = { miss: 0, weak: 1, strong: 2 };

export function isBetter(a: Outcome, b: Outcome): boolean {
  return OUTCOME_ORDER[a] > OUTCOME_ORDER[b];
}

// ── Хід дії ───────────────────────────────────────────────────────────

/**
 * Хід дії: граник дії + характеристика + додатки проти двох граників виклику.
 *
 * `momentum` потрібен лише для правила негативного імпульсу: коли імпульс
 * менший за 0 і його величина збігається зі значенням граника дії, граник дії
 * скасовується. Спалення імпульсу тут не застосовується — див. `previewBurn`.
 */
export function rollAction(
  label: string,
  stat: number,
  adds: number,
  momentum: number,
): ActionRollResult {
  const actionDie = d6();
  const challengeDice: [number, number] = [d10(), d10()];

  const actionDieCanceled = momentum < 0 && Math.abs(momentum) === actionDie;
  const rawScore = (actionDieCanceled ? 0 : actionDie) + stat + adds;
  const actionScore = Math.min(rawScore, MAX_ACTION_SCORE);

  const canceledChallenge: [boolean, boolean] = [false, false];

  return {
    kind: 'action',
    id: nextId(),
    label,
    actionDie,
    stat,
    adds,
    actionScore,
    capped: rawScore > MAX_ACTION_SCORE,
    actionDieCanceled,
    challengeDice,
    canceledChallenge,
    outcome: toOutcome(countBeaten(actionScore, challengeDice, canceledChallenge)),
    matched: challengeDice[0] === challengeDice[1],
    momentumBurned: false,
    timestamp: Date.now(),
  };
}

/**
 * Наслідок спалення імпульсу — або null, якщо спалення нічого не дає.
 *
 * Спалення скасовує граники виклику, значення яких **строго менші** за
 * поточний імпульс. Це не заміна значення дії: приклад із правил —
 * імпульс +6, значення дії 4, граники 5 і 8 → скасовується лише 5,
 * промах стає «ледь влучаєте».
 *
 * Повертає новий результат; імпульс на скидання встановлює викликач.
 */
export function previewBurn(
  result: ActionRollResult,
  momentum: number,
): ActionRollResult | null {
  if (result.momentumBurned || momentum <= 0) return null;

  const canceledChallenge: [boolean, boolean] = [
    result.challengeDice[0] < momentum,
    result.challengeDice[1] < momentum,
  ];
  if (!canceledChallenge[0] && !canceledChallenge[1]) return null;

  const outcome = toOutcome(
    countBeaten(result.actionScore, result.challengeDice, canceledChallenge),
  );
  if (!isBetter(outcome, result.outcome)) return null;

  return { ...result, canceledChallenge, outcome, momentumBurned: true };
}

// ── Кидок прогресу ────────────────────────────────────────────────────

/**
 * Кидок прогресу: кількість повністю заповнених клітин проти двох граників
 * виклику. Граник дії не кидається, імпульс не застосовується й не спалюється.
 */
export function rollProgress(label: string, ticks: number): ProgressRollResult {
  const boxes = boxesFilled(ticks);
  const challengeDice: [number, number] = [d10(), d10()];

  return {
    kind: 'progress',
    id: nextId(),
    label,
    boxes,
    challengeDice,
    outcome: toOutcome(countBeaten(boxes, challengeDice, [false, false])),
    matched: challengeDice[0] === challengeDice[1],
    timestamp: Date.now(),
  };
}

// ── Кидок d100 ────────────────────────────────────────────────────────

/**
 * Кидок d100 для ходу оракула. Що означає число, вирішує викликач:
 * `describe` перетворює його на рядок таблиці чи відповідь «Так» / «Ні».
 */
export function rollOracle(label: string, describe: (value: number) => string): OracleRollResult {
  const value = d100();
  return {
    kind: 'oracle',
    id: nextId(),
    label,
    value,
    result: describe(value),
    matched: value % 11 === 0 || value === 100,
    timestamp: Date.now(),
  };
}

/** 100 на d100 читається як «00», як на граниках. */
export function formatD100(value: number): string {
  return value === 100 ? '00' : String(value);
}
