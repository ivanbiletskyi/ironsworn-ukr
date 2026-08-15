// Злиття персонажів між пристроями — чиста логіка без Firebase і без DOM.
// Мережеву частину див. у syncEngine.ts.
//
// Модель конфлікту навмисно проста: персонаж — неподільна одиниця, виграє
// той бік, чий `updatedAt` новіший. Аркуш заповнює одна людина, тож
// одночасне редагування того самого персонажа з двох пристроїв — рідкість,
// а посимвольне злиття нотаток коштувало б незрівнянно дорожче.

import type { Character } from './types';
import {
  ATTR_KEYS,
  BASE_RESET_MOMENTUM,
  DEBILITY_KEYS,
  MAX_STAT,
  STAT_KEYS,
} from './types';
import { normalizeCharacter } from './storage';

/** Надгробки старші за цей вік уже нікого не воскресять — час їх забути. */
export const TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000;

/** id видаленого персонажа → час видалення (мс). */
export type Tombstones = Record<string, number>;

export interface SyncSnapshot {
  characters: Character[];
  /**
   * Без надгробків видалення не переживало б синхронізацію: інший пристрій
   * ще має персонажа, і найближче злиття повернуло б його назад.
   */
  tombstones: Tombstones;
}

/** Версія формату документа у Firestore; читаємо все, що не новіше. */
export const SYNC_FORMAT_VERSION = 1;

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
    character.vows.every(vow => vow.name.trim() === '' && vow.ticks === 0) &&
    character.bonds.every(bond => bond.name.trim() === '' && bond.ticks === 0)
  );
}

// ── Злиття ────────────────────────────────────────────────────────────

function mergeTombstones(a: Tombstones, b: Tombstones, now: number): Tombstones {
  const merged: Tombstones = {};
  for (const [id, at] of [...Object.entries(a), ...Object.entries(b)]) {
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (now - at > TOMBSTONE_TTL) continue;
    merged[id] = Math.max(merged[id] ?? 0, at);
  }
  return merged;
}

/**
 * Порядок для випадку «усі персонажі порожні»: обидва пристрої мають
 * дійти того самого висновку, інакше вони нескінченно перезаписуватимуть
 * один одного. Тож жодних «локальний важливіший» — лише самі дані.
 */
function olderFirst(a: Character, b: Character): number {
  return a.updatedAt - b.updatedAt || (a.id < b.id ? -1 : 1);
}

export function mergeSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  options: { pruneBlanks?: boolean; now?: number } = {},
): SyncSnapshot {
  const now = options.now ?? Date.now();
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, now);

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
  const blanks = [...characters].sort(olderFirst);
  return blanks.slice(0, 1);
}

/** Порівняння без огляду на порядок: різний порядок — не привід писати. */
export function sameSnapshot(a: SyncSnapshot, b: SyncSnapshot): boolean {
  if (a.characters.length !== b.characters.length) return false;

  const byId = new Map(b.characters.map(character => [character.id, character]));
  for (const character of a.characters) {
    const other = byId.get(character.id);
    if (!other || JSON.stringify(character) !== JSON.stringify(other)) return false;
  }

  const aTombs = Object.keys(a.tombstones);
  if (aTombs.length !== Object.keys(b.tombstones).length) return false;
  return aTombs.every(id => a.tombstones[id] === b.tombstones[id]);
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
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function emptySnapshot(): SyncSnapshot {
  return { characters: [], tombstones: {} };
}

/**
 * Читає документ із хмари. Усе, що не піддається розбору, стає порожнім
 * знімком: злиття з порожнім нічого не псує, а падіння в цьому місці
 * лишило б гравця без аркуша.
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

  const tombstones: Tombstones = {};
  if (isRecord(parsed.tombstones)) {
    for (const [id, at] of Object.entries(parsed.tombstones)) {
      if (typeof at === 'number' && Number.isFinite(at)) tombstones[id] = at;
    }
  }

  return { characters, tombstones };
}
