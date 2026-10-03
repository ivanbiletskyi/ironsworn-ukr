// Підписка на медіазапит — як `useIsNarrow` аркуша, але з довільним
// запитом: довіднику потрібна саме межа 900/901 px сайту.
//
// У jsdom `matchMedia` немає або віддає `matches: false`, тож тести за
// замовчуванням бачать вузьку верстку, а широку підміняють явно.

import { useCallback, useSyncExternalStore } from 'react';

export const WIDE_QUERY = '(min-width: 901px)';

function list(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = list(query);
      if (!media) return () => {};
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => list(query)?.matches ?? false, () => false);
}
