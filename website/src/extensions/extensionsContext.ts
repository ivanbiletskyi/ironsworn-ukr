// Каталог розширень поточного акаунта. Провайдер — у ExtensionsProvider.tsx.

import { createContext, useContext } from 'react';
import type { ExtensionDefinition } from './api';
import type { CatalogEntry } from './loader';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; entries: CatalogEntry[] };

export interface ExtensionsValue {
  catalog: CatalogState;
  /** Завантажує й реєструє розширення один раз на сесію акаунта. */
  load(entry: CatalogEntry): Promise<ExtensionDefinition>;
}

export const ExtensionsContext = createContext<ExtensionsValue | null>(null);

export function useExtensions(): ExtensionsValue {
  const value = useContext(ExtensionsContext);
  if (!value) throw new Error('useExtensions використано поза <ExtensionsProvider>.');
  return value;
}
