// Збереження персонажів у localStorage, експорт/імпорт JSON, міграції.
// Ключі навмисно окремі від `ironsworn-oracle-history-*`, який лишається без змін.

import type {
  Character,
  CharacterProfile,
  CharacterStore,
  DebilityKey,
  ExtraTrack,
  ProgressTrack,
  Rank,
  Track,
  TrackKind,
  XpCell,
} from './types';
import {
  ATTR_KEYS,
  BASE_RESET_MOMENTUM,
  DEBILITY_KEYS,
  DEFAULT_BONDS,
  DEFAULT_VOWS,
  MAX_ATTR,
  MAX_STAT,
  MAX_TICKS,
  MIN_ATTR,
  MIN_MOMENTUM,
  MIN_STAT,
  RANKS,
  STAT_KEYS,
  STORE_VERSION,
  XP_CELLS,
} from './types';
import type { SheetRoll } from './diceEngine';
import { newId } from './ids';
import { fieldIds, markPaths } from './profiles';
import { findProfile } from '../profiles';
import type { Tombstones } from '../sync/tombstones';
import { loadTombstones, recordTombstone, saveTombstones } from '../sync/tombstones';

const STORE_KEY = 'ironsworn-characters-v1';
const LOG_KEY = 'ironsworn-sheet-log-v1';
const TOMBSTONE_KEY = 'ironsworn-character-tombstones-v1';
/** Надгробки й час очищення журналу кидків — окремим ключем поруч із ним. */
export const SHEET_LOG_META_KEY = 'ironsworn-sheet-log-meta-v1';
export const MAX_SHEET_LOG = 100;

export { newId };

// ── Створення ─────────────────────────────────────────────────────────

function emptyDebilities(): Record<DebilityKey, boolean> {
  return Object.fromEntries(DEBILITY_KEYS.map(k => [k, false])) as Record<DebilityKey, boolean>;
}

export function emptyVow(): ProgressTrack {
  return { id: newId(), name: '', rank: 'dangerous', ticks: 0 };
}

/** Стосунок рангу не має: за правилами його шкала завжди отримує 1 позначку. */
export function emptyBond(): Track {
  return { id: newId(), name: '', ticks: 0 };
}

/** Шкала без назви й без прогресу — той самий «порожній слот» аркуша. */
export function isEmptyTrack(track: Track): boolean {
  return track.name.trim() === '' && track.ticks === 0;
}

/** Новий персонаж за створенням персонажа: показники +5, імпульс +2. */
export function createCharacter(name = ''): Character {
  return {
    id: newId(),
    name,
    attributes: { edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 },
    stats: { health: MAX_STAT, spirit: MAX_STAT, supply: MAX_STAT },
    momentum: BASE_RESET_MOMENTUM,
    xp: Array<XpCell>(XP_CELLS).fill(0),
    vows: Array.from({ length: DEFAULT_VOWS }, emptyVow),
    bonds: Array.from({ length: DEFAULT_BONDS }, emptyBond),
    debilities: emptyDebilities(),
    notes: '',
    extraTracks: [],
    profiles: [],
    updatedAt: Date.now(),
  };
}

export function duplicateCharacter(character: Character): Character {
  const copy = normalizeCharacter(JSON.parse(JSON.stringify(character)));
  copy.id = newId();
  copy.name = copy.name ? `${copy.name} (копія)` : '';
  copy.vows = copy.vows.map(vow => ({ ...vow, id: newId() }));
  copy.bonds = copy.bonds.map(bond => ({ ...bond, id: newId() }));
  copy.extraTracks = copy.extraTracks.map(track => ({ ...track, id: newId() }));
  copy.profiles = copy.profiles.map(profile => ({ ...profile, id: newId() }));
  copy.updatedAt = Date.now();
  return copy;
}

export function emptyStore(): CharacterStore {
  return { version: STORE_VERSION, activeId: null, characters: [] };
}

// ── Нормалізація (вона ж валідація імпорту й міграція) ────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function rank(value: unknown): Rank {
  return RANKS.includes(value as Rank) ? (value as Rank) : 'dangerous';
}

function xpCell(value: unknown): XpCell {
  return value === 1 || value === 2 ? value : 0;
}

function normalizeBond(raw: unknown): Track {
  const source = isRecord(raw) ? raw : {};
  return {
    id: str(source.id) || newId(),
    name: str(source.name),
    ticks: num(source.ticks, 0, 0, MAX_TICKS),
  };
}

function normalizeTrack(raw: unknown): ProgressTrack {
  const source = isRecord(raw) ? raw : {};
  return { ...normalizeBond(raw), rank: rank(source.rank) };
}

function normalizeExtraTrack(raw: unknown): ExtraTrack {
  const source = isRecord(raw) ? raw : {};
  const kind = source.kind;
  return {
    ...normalizeTrack(raw),
    kind: (kind === 'combat' || kind === 'journey' ? kind : 'other') satisfies TrackKind,
  };
}

/**
 * Профіль руки. `null` — коли ключа немає в каталозі: каталог і є джерело
 * істини, а осиротілі відмітки нікуди показати (PROFILES_PLAN.md §4.3).
 * Решту полів чистимо, а не відкидаємо запис: втратити картку через одну
 * неможливу відмітку — надто дорого.
 */
export function normalizeProfile(raw: unknown): CharacterProfile | null {
  const source = isRecord(raw) ? raw : {};
  const profile = findProfile(str(source.profileId));
  if (!profile) return null;

  const possible = new Set(markPaths(profile));
  const markedRaw = Array.isArray(source.marked) ? source.marked : [];
  const marked = [
    ...new Set(markedRaw.filter((path): path is string => typeof path === 'string' && possible.has(path))),
  ];

  const declared = new Set(fieldIds(profile));
  const fieldsRaw = isRecord(source.fields) ? source.fields : {};
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(fieldsRaw)) {
    if (declared.has(key) && typeof value === 'string') fields[key] = value;
  }

  const cells = profile.track?.cells.length ?? 0;
  const rawIndex = source.trackIndex;
  const trackIndex =
    cells > 0 && typeof rawIndex === 'number' && Number.isFinite(rawIndex)
      ? num(rawIndex, 0, 0, cells - 1)
      : null;

  return { id: str(source.id) || newId(), profileId: profile.id, marked, fields, trackIndex };
}

/**
 * Приводить довільні дані до валідного `Character`.
 * Кидає помилку лише коли на вході взагалі не об'єкт — решту полів
 * добудовує значеннями за замовчуванням, щоб частково пошкоджений
 * localStorage не залишив гравця без персонажа.
 */
export function normalizeCharacter(raw: unknown): Character {
  if (!isRecord(raw)) throw new Error('Дані персонажа мають бути об’єктом JSON.');

  const base = createCharacter();
  const attributesRaw = isRecord(raw.attributes) ? raw.attributes : {};
  const statsRaw = isRecord(raw.stats) ? raw.stats : {};
  const debilitiesRaw = isRecord(raw.debilities) ? raw.debilities : {};

  const attributes = { ...base.attributes };
  for (const key of ATTR_KEYS) {
    attributes[key] = num(attributesRaw[key], 0, MIN_ATTR, MAX_ATTR);
  }

  const stats = { ...base.stats };
  for (const key of STAT_KEYS) {
    stats[key] = num(statsRaw[key], MAX_STAT, MIN_STAT, MAX_STAT);
  }

  const debilities = emptyDebilities();
  for (const key of DEBILITY_KEYS) {
    debilities[key] = debilitiesRaw[key] === true;
  }

  // Максимум імпульсу залежить від слабкостей, тож остаточне обмеження —
  // за clampMomentum у rules.ts; тут лише відсікаємо явне сміття.
  const momentum = num(raw.momentum, BASE_RESET_MOMENTUM, MIN_MOMENTUM, 10);

  const xpRaw = Array.isArray(raw.xp) ? raw.xp : [];
  const xp = Array.from({ length: XP_CELLS }, (_, i) => xpCell(xpRaw[i]));

  // Присяг може бути скільки завгодно, але жодної — не може: аркуш без
  // жодного рядка присяги не дав би куди її записати.
  const vowsRaw = Array.isArray(raw.vows) ? raw.vows : [];
  const vows = vowsRaw.length > 0 ? vowsRaw.map(normalizeTrack) : [emptyVow()];

  // Стосунки — так само: щонайменше один рядок. До v3 їх була одна шкала
  // (`bondsTicks` + `bondsNotes`); вона стає першим стосунком у списку, щоб
  // прогрес нікуди не зник. Міграція за наявністю поля, а не за версією
  // сховища: тоді й «голий» JSON, збережений вручну, читається правильно.
  const bondsRaw = Array.isArray(raw.bonds)
    ? raw.bonds
    : [{ name: raw.bondsNotes, ticks: raw.bondsTicks }];
  const bonds = bondsRaw.length > 0 ? bondsRaw.map(normalizeBond) : [emptyBond()];

  const extraTracks = Array.isArray(raw.extraTracks)
    ? raw.extraTracks.map(normalizeExtraTrack)
    : [];

  // v3 → v4 окремої функції не потребує: збереження без `profiles` просто
  // отримує порожню руку.
  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles.flatMap(item => {
        const profile = normalizeProfile(item);
        return profile ? [profile] : [];
      })
    : [];

  return {
    id: str(raw.id) || newId(),
    name: str(raw.name),
    attributes,
    stats,
    momentum,
    xp,
    vows,
    bonds,
    debilities,
    notes: str(raw.notes),
    extraTracks,
    profiles,
    updatedAt: num(raw.updatedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
  };
}

/**
 * Міграція v1 → v2. У v1 присяг було рівно чотири, тож у кожного збереження
 * лежать порожні слоти з хвоста; у v2 присяги додають кнопкою, і ці слоти
 * перетворилися б на три порожні рядки назавжди. Хвіст зрізаємо, лишаючи
 * щонайменше одну присягу; заповнені слоти між присягами не чіпаємо.
 */
function migrateV1Vows(character: Character): Character {
  const vows = [...character.vows];
  while (vows.length > 1 && isEmptyTrack(vows[vows.length - 1])) vows.pop();
  return { ...character, vows };
}

function storeVersion(raw: Record<string, unknown>): number {
  return typeof raw.version === 'number' ? raw.version : STORE_VERSION;
}

function normalizeStore(raw: unknown): CharacterStore {
  if (!isRecord(raw)) return emptyStore();

  const fromV1 = storeVersion(raw) < 2;
  const characters = Array.isArray(raw.characters)
    ? raw.characters.flatMap(item => {
        try {
          const character = normalizeCharacter(item);
          return [fromV1 ? migrateV1Vows(character) : character];
        } catch {
          return [];
        }
      })
    : [];

  const activeId = str(raw.activeId);
  return {
    version: STORE_VERSION,
    characters,
    activeId: characters.some(c => c.id === activeId) ? activeId : characters[0]?.id ?? null,
  };
}

// ── localStorage ──────────────────────────────────────────────────────

export function loadStore(): CharacterStore {
  try {
    const rawText = localStorage.getItem(STORE_KEY);
    if (!rawText) return emptyStore();
    return normalizeStore(JSON.parse(rawText));
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: CharacterStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // сховище переповнене або недоступне — мовчазно ігноруємо, як в оракулах
  }
}

/** Приводить довільні дані до запису журналу; `null` — якщо це не він. */
export function normalizeSheetRoll(raw: unknown): SheetRoll | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.timestamp !== 'number') return null;
  if (raw.kind !== 'action' && raw.kind !== 'progress') return null;
  return raw as unknown as SheetRoll;
}

export function loadSheetLog(): SheetRoll[] {
  try {
    const rawText = localStorage.getItem(LOG_KEY);
    const parsed: unknown = rawText ? JSON.parse(rawText) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap(item => {
      const entry = normalizeSheetRoll(item);
      return entry ? [entry] : [];
    });
  } catch {
    return [];
  }
}

export function saveSheetLog(log: SheetRoll[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, MAX_SHEET_LOG)));
  } catch {
    // те саме
  }
}

/**
 * Надгробки видалених персонажів (id → час видалення). Лежать окремо від
 * сховища: вони потрібні лише синхронізації (див. utils/sync) і не мають
 * потрапляти ні в експорт персонажа, ні в міграції аркуша.
 */
export function loadCharacterTombstones(): Tombstones {
  return loadTombstones(TOMBSTONE_KEY);
}

export function saveCharacterTombstones(tombstones: Tombstones): void {
  saveTombstones(TOMBSTONE_KEY, tombstones);
}

/** Позначає персонажа видаленим, щоб синхронізація його не воскресила. */
export function recordCharacterTombstone(id: string, at = Date.now()): void {
  recordTombstone(TOMBSTONE_KEY, id, at);
}

// ── Операції над сховищем ─────────────────────────────────────────────

export function upsertCharacter(store: CharacterStore, character: Character): CharacterStore {
  const stamped = { ...character, updatedAt: Date.now() };
  const index = store.characters.findIndex(c => c.id === stamped.id);
  const characters =
    index === -1
      ? [...store.characters, stamped]
      : store.characters.map((c, i) => (i === index ? stamped : c));
  return { ...store, characters, activeId: store.activeId ?? stamped.id };
}

export function removeCharacter(store: CharacterStore, id: string): CharacterStore {
  const characters = store.characters.filter(c => c.id !== id);
  return {
    ...store,
    characters,
    activeId: store.activeId === id ? characters[0]?.id ?? null : store.activeId,
  };
}

export function getActiveCharacter(store: CharacterStore): Character | null {
  return store.characters.find(c => c.id === store.activeId) ?? null;
}

// ── Експорт / імпорт ──────────────────────────────────────────────────

export function serializeCharacter(character: Character): string {
  return JSON.stringify({ version: STORE_VERSION, character }, null, 2);
}

/**
 * Розбирає файл експорту. Приймає і обгортку `{ version, character }`,
 * і «голого» персонажа — щоб вручну збережений JSON теж імпортувався.
 */
export function parseCharacterFile(text: string): Character {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файл не є коректним JSON.');
  }

  if (!isRecord(parsed)) throw new Error('Файл не містить даних персонажа.');

  if (isRecord(parsed.character)) {
    const version = parsed.version;
    if (typeof version === 'number' && version > STORE_VERSION) {
      throw new Error(
        `Файл створено новішою версією аркуша (${version}). Оновіть сторінку й спробуйте ще раз.`,
      );
    }
    const character = normalizeCharacter(parsed.character);
    return storeVersion(parsed) < 2 ? migrateV1Vows(character) : character;
  }

  return normalizeCharacter(parsed);
}

/** Імпорт додає персонажа, а не перезаписує активного. */
export function importCharacter(store: CharacterStore, character: Character): CharacterStore {
  const fresh = { ...character, id: newId(), updatedAt: Date.now() };
  return { ...store, characters: [...store.characters, fresh], activeId: fresh.id };
}

/** Віддає персонажа файлом. Єдине місце в модулі, що торкається DOM. */
export function downloadCharacter(character: Character): void {
  const blob = new Blob([serializeCharacter(character)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = characterFileName(character);
  link.click();
  URL.revokeObjectURL(url);
}

export function characterFileName(character: Character): string {
  const safe = character.name.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-');
  return `zalizna-prysiaha-${safe || 'personazh'}.json`;
}
