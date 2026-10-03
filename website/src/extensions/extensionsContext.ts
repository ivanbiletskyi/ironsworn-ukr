// Каталог розширень поточного акаунта. Провайдер — у ExtensionsProvider.tsx.

import { createContext, useContext } from 'react';
import type { ExtensionDefinition } from './api';
import type { CatalogEntry } from './loader';

/** Сторінка профілю, де гравець вмикає й вимикає доступні розширення (відносно `/:lang/`). */
export const EXTENSIONS_SETTINGS_PATH = 'profile/extensions';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; entries: CatalogEntry[] };

export interface ExtensionsValue {
  catalog: CatalogState;
  /** Розширення, які гравець вимкнув у профілі: їх немає в меню, код не вантажиться. */
  disabled: ReadonlySet<string>;
  /** Вмикає чи вимикає розширення; помилку запису віддає тому, хто клацнув. */
  setEnabled(id: string, enabled: boolean): Promise<void>;
  /** Завантажує й реєструє розширення один раз на сесію акаунта. */
  load(entry: CatalogEntry): Promise<ExtensionDefinition>;
}

export const ExtensionsContext = createContext<ExtensionsValue | null>(null);

/** Для місць, які можуть стояти й поза провайдером (меню акаунта в тестах). */
export function useOptionalExtensions(): ExtensionsValue | null {
  return useContext(ExtensionsContext);
}

export function useExtensions(): ExtensionsValue {
  const value = useContext(ExtensionsContext);
  if (!value) throw new Error('useExtensions використано поза <ExtensionsProvider>.');
  return value;
}
