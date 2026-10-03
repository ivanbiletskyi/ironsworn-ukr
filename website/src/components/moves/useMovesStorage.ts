// Стан довідника в localStorage: закріплені й нещодавні ходи.
// Синхронізація через Firebase у першій версії не потрібна (дизайн-план,
// «Технічна реалізація»): це зручності одного пристрою, не дані гри.

import { useCallback, useEffect, useState } from 'react';
import { getMove } from '../../utils/moves';

export const FAVORITES_KEY = 'ironsworn-moves-favorites-v1';
export const RECENT_KEY = 'ironsworn-moves-recent-v1';

export const RECENT_LIMIT = 5;

function read<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // приватний режим чи переповнене сховище — зручність, не дані
  }
}

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(id => typeof id === 'string');

/** Невідомі id (хід перейменували чи прибрали) тихо відкидаються. */
const known = (ids: string[]) => ids.filter(id => getMove(id) !== undefined);

function usePersistent<T>(key: string, initial: () => T): [T, (update: (prev: T) => T) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => write(key, value), [key, value]);
  const update = useCallback((fn: (prev: T) => T) => setValue(fn), []);
  return [value, update];
}

export function useFavorites() {
  const [favorites, update] = usePersistent(FAVORITES_KEY, () =>
    known(read(FAVORITES_KEY, [], isIdList)),
  );
  const toggle = useCallback(
    (id: string) =>
      update(prev => (prev.includes(id) ? prev.filter(other => other !== id) : [...prev, id])),
    [update],
  );
  return { favorites, toggleFavorite: toggle };
}

export function useRecent() {
  const [recent, update] = usePersistent(RECENT_KEY, () => known(read(RECENT_KEY, [], isIdList)));
  const push = useCallback(
    (id: string) =>
      update(prev =>
        prev[0] === id ? prev : [id, ...prev.filter(other => other !== id)].slice(0, RECENT_LIMIT),
      ),
    [update],
  );
  return { recent, pushRecent: push };
}
