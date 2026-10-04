// Пункти меню доповнень: по групі на кожне розширення, до якого в акаунта є
// доступ і яке не вимкнене в профілі. Гість і акаунт без дозволів отримують
// порожній список — тоді меню не показує навіть заголовка секції.

import { useMemo } from 'react';
import type { Lang } from './api';
import { useExtensions } from './extensionsContext';

export interface ExtensionNavGroup {
  id: string;
  title: string;
  items: { label: string; path: string; to: string }[];
}

export function useExtensionNav(lang: Lang): ExtensionNavGroup[] {
  const { catalog, disabled } = useExtensions();
  return useMemo(() => {
    if (catalog.status !== 'ready') return [];
    return catalog.entries
      .filter(entry => !disabled.has(entry.id) && (entry.nav[lang] ?? []).length > 0)
      .map(entry => ({
        id: entry.id,
        title: entry.title[lang] ?? entry.title.uk ?? entry.id,
        items: (entry.nav[lang] ?? []).map(item => ({
          label: item.label,
          path: item.path,
          to: `/${lang}/x/${entry.id}/${item.path}`,
        })),
      }));
  }, [catalog, disabled, lang]);
}
