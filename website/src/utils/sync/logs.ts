// Журнали (кидки аркуша й оракулів) як синхронізована структура.
//
// Журнал відрізняється від списку персонажів двома речами, і обидві тут
// враховано: записи майже завжди лише додаються, а «Очистити» стирає сотню
// рядків одним рухом — на кожен ставити надгробок було б марнотратно, тож
// для нього є окрема позначка `clearedAt`.

import type { Tombstones } from './tombstones';
import { mergeTombstones, parseTombstones } from './tombstones';

export interface LogSnapshot<T> {
  entries: T[];
  tombstones: Tombstones;
  /** Час натискання «Очистити»: усе, що старше, зникає. */
  clearedAt: number;
}

/** Як поводитися з конкретним видом записів. */
export interface LogShape<T> {
  id: (entry: T) => string;
  /** Час останньої зміни запису — за ним розв'язується конфлікт. */
  clock: (entry: T) => number;
  /** Порядок у журналі; найновіше згори. */
  order: (entry: T) => number;
  /** Скільки записів журнал тримає. */
  max: number;
}

export function emptyLog<T>(): LogSnapshot<T> {
  return { entries: [], tombstones: {}, clearedAt: 0 };
}

export function mergeLogs<T>(
  local: LogSnapshot<T>,
  remote: LogSnapshot<T>,
  shape: LogShape<T>,
  now = Date.now(),
): LogSnapshot<T> {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, now);

  const byId = new Map<string, T>();
  for (const entry of [...local.entries, ...remote.entries]) {
    const id = shape.id(entry);
    const known = byId.get(id);
    if (!known || shape.clock(entry) > shape.clock(known)) byId.set(id, entry);
  }

  const entries = [...byId]
    // Правка, зроблена після видалення чи очищення, їх скасовує: гравець
    // явно повернувся до цього запису на іншому пристрої.
    .filter(([id, entry]) => shape.clock(entry) > Math.max(clearedAt, tombstones[id] ?? 0))
    .map(([, entry]) => entry)
    .sort((a, b) => shape.order(b) - shape.order(a) || (shape.id(a) < shape.id(b) ? -1 : 1))
    .slice(0, shape.max);

  // Надгробок, старший за очищення, вже нічого не тримає.
  const kept: Tombstones = {};
  for (const [id, at] of Object.entries(tombstones)) {
    if (at > clearedAt) kept[id] = at;
  }

  return { entries, tombstones: kept, clearedAt };
}

/** Порівняння без огляду на порядок: різний порядок — не привід писати. */
export function sameLog<T>(a: LogSnapshot<T>, b: LogSnapshot<T>, shape: LogShape<T>): boolean {
  if (a.clearedAt !== b.clearedAt) return false;
  if (a.entries.length !== b.entries.length) return false;

  const byId = new Map(b.entries.map(entry => [shape.id(entry), entry]));
  for (const entry of a.entries) {
    const other = byId.get(shape.id(entry));
    if (!other || JSON.stringify(entry) !== JSON.stringify(other)) return false;
  }

  const ids = Object.keys(a.tombstones);
  if (ids.length !== Object.keys(b.tombstones).length) return false;
  return ids.every(id => a.tombstones[id] === b.tombstones[id]);
}

/**
 * Читає журнал із довільних даних. Кожен запис проходить через `normalize`:
 * зіпсований рядок повертає `null` і випадає, решта журналу лишається.
 */
export function parseLog<T>(
  raw: unknown,
  normalize: (entry: unknown) => T | null,
): LogSnapshot<T> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return emptyLog<T>();
  const source = raw as Record<string, unknown>;
  return {
    entries: Array.isArray(source.entries)
      ? source.entries.flatMap(entry => {
          const normalized = normalize(entry);
          return normalized ? [normalized] : [];
        })
      : [],
    tombstones: parseTombstones(source.tombstones),
    clearedAt: typeof source.clearedAt === 'number' && Number.isFinite(source.clearedAt)
      ? source.clearedAt
      : 0,
  };
}

// ── Локальні позначки журналу ─────────────────────────────────────────

/** Надгробки й час очищення живуть поруч із журналом, але окремим ключем. */
export interface LogMeta {
  tombstones: Tombstones;
  clearedAt: number;
}

export function loadLogMeta(key: string): LogMeta {
  try {
    const rawText = localStorage.getItem(key);
    const parsed = rawText ? JSON.parse(rawText) : null;
    if (typeof parsed !== 'object' || parsed === null) return { tombstones: {}, clearedAt: 0 };
    const source = parsed as Record<string, unknown>;
    return {
      tombstones: parseTombstones(source.tombstones),
      clearedAt: typeof source.clearedAt === 'number' && Number.isFinite(source.clearedAt)
        ? source.clearedAt
        : 0,
    };
  } catch {
    return { tombstones: {}, clearedAt: 0 };
  }
}

export function saveLogMeta(key: string, meta: LogMeta): void {
  try {
    localStorage.setItem(key, JSON.stringify(meta));
  } catch {
    // те саме
  }
}

export function recordLogRemoval(key: string, id: string, at = Date.now()): void {
  const meta = loadLogMeta(key);
  saveLogMeta(key, { ...meta, tombstones: { ...meta.tombstones, [id]: at } });
}

/** «Очистити журнал» — одна позначка замість сотні надгробків. */
export function recordLogCleared(key: string, at = Date.now()): void {
  saveLogMeta(key, { tombstones: {}, clearedAt: at });
}
