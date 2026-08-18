// Чи ми на телефоні. Потрібно саме в JS, а не лише в CSS: мобільний потік
// профілів — це три різні стани (смужка, шухляда, фулскрін), яких CSS сам не
// змоделює, а тримати руку в DOM двічі означало б дублювати й `aria`, і те,
// що бачать тести (PROFILES_PLAN.md §7).
//
// У jsdom `matchMedia` віддає `matches: false`, тож тести за замовчуванням
// ганяють десктопну зону, а мобільні випадки підміняють `matchMedia` явно.

import { useSyncExternalStore } from 'react';

export const NARROW_QUERY = '(max-width: 700px)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(NARROW_QUERY)
    : null;
}

function subscribe(onChange: () => void): () => void {
  const list = query();
  if (!list) return () => {};
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function isNarrow(): boolean {
  return query()?.matches ?? false;
}

/**
 * `useSyncExternalStore`, а не `useState` + `useEffect`: підписка на медіазапит —
 * це саме зовнішнє джерело, і React сам звіряє значення після рендера, тож
 * зміна ширини між рендером і підпискою нічого не ламає.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, isNarrow, () => false);
}
