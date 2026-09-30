// Що саме синхронізується між пристроями і як зводяться розбіжності —
// чиста логіка без Firebase і без DOM. Мережеву частину див. в engine.ts.
//
// Модель конфлікту навмисно проста: персонаж чи запис журналу — неподільна
// одиниця, виграє той бік, чий час новіший. Аркуш заповнює одна людина, тож
// одночасне редагування того самого з двох пристроїв — рідкість, а
// посимвольне злиття нотаток коштувало б незрівнянно дорожче.

import type { Character } from '../character/types';
import {
  ATTR_KEYS,
  BASE_RESET_MOMENTUM,
  DEBILITY_KEYS,
  MAX_STAT,
  STAT_KEYS,
} from '../character/types';
import { MAX_SHEET_LOG, normalizeCharacter, normalizeSheetRoll } from '../character/storage';
import type { SheetRoll } from '../character/diceEngine';
import type { Lang } from '../oracles/oracle-types';
import type { RollResult } from '../oracleEngine';
import { MAX_HISTORY, normalizeResult, resultClock } from '../oracleEngine';
import type { Tombstones } from './tombstones';
import { mergeTombstones, parseTombstones, sameTombstones } from './tombstones';
import type { LogShape, LogSnapshot } from './logs';
import { emptyLog, mergeLogs, parseLog, sameLog } from './logs';

export const LANGS: readonly Lang[] = ['uk', 'en'];

export interface SyncSnapshot {
  characters: Character[];
  /**
   * Без надгробків видалення не переживало б синхронізацію: інший пристрій
   * ще має персонажа, і найближче злиття повернуло б його назад.
   */
  tombstones: Tombstones;
  /** Журнал кидків аркуша. */
  sheetLog: LogSnapshot<SheetRoll>;
  /** Історія оракулів — своя на кожну мову, як і в localStorage. */
  oracleHistory: Record<Lang, LogSnapshot<RollResult>>;
}

/** Версія формату документа у Firestore; читаємо все, що не новіше. */
export const SYNC_FORMAT_VERSION = 1;

// Записи журналу кидків незмінні: спалення імпульсу додає окремий рядок,
// а не переписує старий. Тож час створення слугує і часом правки.
export const SHEET_LOG_SHAPE: LogShape<SheetRoll> = {
  id: entry => entry.id,
  clock: entry => entry.timestamp,
  order: entry => entry.timestamp,
  max: MAX_SHEET_LOG,
};

// Запис оракула перекидають і чистять від рядків, тож час правки окремий.
export const ORACLE_LOG_SHAPE: LogShape<RollResult> = {
  id: entry => entry.id,
  clock: resultClock,
  order: entry => entry.timestamp,
  max: MAX_HISTORY,
};

export function emptyOracleHistory(): Record<Lang, LogSnapshot<RollResult>> {
  return { uk: emptyLog<RollResult>(), en: emptyLog<RollResult>() };
}

export function emptySnapshot(): SyncSnapshot {
  return {
    characters: [],
    tombstones: {},
    sheetLog: emptyLog<SheetRoll>(),
    oracleHistory: emptyOracleHistory(),
  };
}

// ── Порожній персонаж ─────────────────────────────────────────────────

/**
 * Персонаж, у якому гравець нічого не змінив. Такі з'являються самі —
 * аркуш ніколи не буває без жодного персонажа, тож кожен новий пристрій
 * заводить свого. Синхронізувати їх немає сенсу: інформації в них нуль,
 * а в списку персонажів вони множаться.
 */
export function isBlankCharacter(character: Character): boolean {
  return (
    character.name.trim() === '' &&
    character.notes.trim() === '' &&
    character.momentum === BASE_RESET_MOMENTUM &&
    ATTR_KEYS.every(key => character.attributes[key] === 0) &&
    STAT_KEYS.every(key => character.stats[key] === MAX_STAT) &&
    DEBILITY_KEYS.every(key => !character.debilities[key]) &&
    character.xp.every(cell => cell === 0) &&
    character.extraTracks.length === 0 &&
    // Без цього персонаж із трьома профілями вважався б порожнім, і перше
    // злиття після входу його б зжувало.
    character.profiles.length === 0 &&
    character.vows.every(vow => vow.name.trim() === '' && vow.ticks === 0) &&
    character.bondTicks === 0 &&
    character.bonds.every(bond => bond.name.trim() === '')
  );
}

// ── Злиття ────────────────────────────────────────────────────────────

/**
 * Порядок для випадку «усі персонажі порожні»: обидва пристрої мають
 * дійти того самого висновку, інакше вони нескінченно перезаписуватимуть
 * один одного. Тож жодних «локальний важливіший» — лише самі дані.
 */
function olderFirst(a: Character, b: Character): number {
  return a.updatedAt - b.updatedAt || (a.id < b.id ? -1 : 1);
}

function mergeCharacters(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  options: { pruneBlanks?: boolean; now: number },
): { characters: Character[]; tombstones: Tombstones } {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, options.now);

  const byId = new Map<string, Character>();
  for (const character of [...local.characters, ...remote.characters]) {
    const known = byId.get(character.id);
    if (!known || character.updatedAt > known.updatedAt) byId.set(character.id, character);
  }

  // Правка, зроблена після видалення, скасовує видалення: гравець явно
  // повернувся до цього персонажа на іншому пристрої.
  for (const [id, deletedAt] of Object.entries(tombstones)) {
    const character = byId.get(id);
    if (!character) continue;
    if (character.updatedAt > deletedAt) delete tombstones[id];
    else byId.delete(id);
  }

  // Порядок беремо локальний: він і є той, що гравець бачить у списку.
  // Чуже впорядкування сюди не потрапляє, тому порівняння знімків нижче
  // порядок ігнорує — інакше два пристрої штовхали б списки туди-сюди.
  const order = new Map(local.characters.map((character, index) => [character.id, index]));
  const characters = [...byId.values()].sort(
    (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity),
  );

  return {
    characters: options.pruneBlanks ? pruneBlankCharacters(characters) : characters,
    tombstones,
  };
}

/**
 * Прибирає порожніх персонажів — але лише під час першого злиття після
 * входу. Далі так робити не можна: гравець натискає «Новий персонаж» і
 * секунду-другу той порожній, і синхронізація не має його з'їдати.
 */
function pruneBlankCharacters(characters: Character[]): Character[] {
  const filled = characters.filter(character => !isBlankCharacter(character));
  if (filled.length > 0) return filled;
  // Порожні всі — лишаємо рівно одного, бо аркуш без персонажа неможливий.
  return [...characters].sort(olderFirst).slice(0, 1);
}

export function mergeSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  options: { pruneBlanks?: boolean; now?: number } = {},
): SyncSnapshot {
  const now = options.now ?? Date.now();
  const { characters, tombstones } = mergeCharacters(local, remote, {
    pruneBlanks: options.pruneBlanks,
    now,
  });

  const oracleHistory = emptyOracleHistory();
  for (const lang of LANGS) {
    oracleHistory[lang] = mergeLogs(
      local.oracleHistory[lang],
      remote.oracleHistory[lang],
      ORACLE_LOG_SHAPE,
      now,
    );
  }

  return {
    characters,
    tombstones,
    sheetLog: mergeLogs(local.sheetLog, remote.sheetLog, SHEET_LOG_SHAPE, now),
    oracleHistory,
  };
}

/** Порівняння без огляду на порядок: різний порядок — не привід писати. */
export function sameCharacterList(a: Character[], b: Character[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map(character => [character.id, character]));
  return a.every(character => {
    const other = byId.get(character.id);
    return !!other && JSON.stringify(character) === JSON.stringify(other);
  });
}

export function sameSnapshot(a: SyncSnapshot, b: SyncSnapshot): boolean {
  if (!sameCharacterList(a.characters, b.characters)) return false;
  if (!sameTombstones(a.tombstones, b.tombstones)) return false;
  if (!sameLog(a.sheetLog, b.sheetLog, SHEET_LOG_SHAPE)) return false;
  return LANGS.every(lang =>
    sameLog(a.oracleHistory[lang], b.oracleHistory[lang], ORACLE_LOG_SHAPE),
  );
}

// ── Формат документа Firestore ────────────────────────────────────────

export interface SyncDocument {
  version: number;
  /** Знімок JSON-рядком: рівно те, що лежить у localStorage. */
  payload: string;
  updatedAt: number;
}

export function serializeSnapshot(snapshot: SyncSnapshot): string {
  return JSON.stringify({
    characters: snapshot.characters,
    tombstones: snapshot.tombstones,
    sheetLog: snapshot.sheetLog,
    oracleHistory: snapshot.oracleHistory,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Читає документ із хмари. Усе, що не піддається розбору, стає порожнім:
 * злиття з порожнім нічого не псує, а падіння в цьому місці лишило б
 * гравця без аркуша.
 */
export function parseSyncDocument(raw: unknown): SyncSnapshot {
  if (!isRecord(raw) || typeof raw.payload !== 'string') return emptySnapshot();

  if (typeof raw.version === 'number' && raw.version > SYNC_FORMAT_VERSION) {
    throw new Error(
      'Дані в хмарі збережено новішою версією сайту. Оновіть сторінку й спробуйте ще раз.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.payload);
  } catch {
    return emptySnapshot();
  }
  if (!isRecord(parsed)) return emptySnapshot();

  const characters = Array.isArray(parsed.characters)
    ? parsed.characters.flatMap(item => {
        try {
          return [normalizeCharacter(item)];
        } catch {
          return [];
        }
      })
    : [];

  const oracleRaw = isRecord(parsed.oracleHistory) ? parsed.oracleHistory : {};
  const oracleHistory = emptyOracleHistory();
  for (const lang of LANGS) {
    oracleHistory[lang] = parseLog(oracleRaw[lang], normalizeResult);
  }

  return {
    characters,
    tombstones: parseTombstones(parsed.tombstones),
    sheetLog: parseLog(parsed.sheetLog, normalizeSheetRoll),
    oracleHistory,
  };
}
