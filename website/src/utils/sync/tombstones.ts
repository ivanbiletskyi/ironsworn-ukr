// Надгробки: id → час видалення.
//
// Без них видалення не переживало б синхронізацію. Інший пристрій ще має
// запис, і найближче злиття повернуло б його назад — що для персонажа, що
// для рядка журналу.

/** id видаленого запису → час видалення (мс). */
export type Tombstones = Record<string, number>;

/** Старші за цей вік уже нікого не воскресять — час їх забути. */
export const TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000;

export function mergeTombstones(a: Tombstones, b: Tombstones, now: number): Tombstones {
  const merged: Tombstones = {};
  for (const [id, at] of [...Object.entries(a), ...Object.entries(b)]) {
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (now - at > TOMBSTONE_TTL) continue;
    merged[id] = Math.max(merged[id] ?? 0, at);
  }
  return merged;
}

export function sameTombstones(a: Tombstones, b: Tombstones): boolean {
  const ids = Object.keys(a);
  return ids.length === Object.keys(b).length && ids.every(id => a[id] === b[id]);
}

export function parseTombstones(raw: unknown): Tombstones {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const tombstones: Tombstones = {};
  for (const [id, at] of Object.entries(raw)) {
    if (typeof at === 'number' && Number.isFinite(at)) tombstones[id] = at;
  }
  return tombstones;
}

// ── localStorage ──────────────────────────────────────────────────────

export function loadTombstones(key: string): Tombstones {
  try {
    const rawText = localStorage.getItem(key);
    return rawText ? parseTombstones(JSON.parse(rawText)) : {};
  } catch {
    return {};
  }
}

export function saveTombstones(key: string, tombstones: Tombstones): void {
  try {
    localStorage.setItem(key, JSON.stringify(tombstones));
  } catch {
    // сховище переповнене або недоступне — як і в решті сховищ аркуша
  }
}

export function recordTombstone(key: string, id: string, at = Date.now()): void {
  saveTombstones(key, { ...loadTombstones(key), [id]: at });
}
