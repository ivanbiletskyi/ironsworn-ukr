// Тримає каталог розширень для того, хто увійшов, і кешує завантажені модулі.
// Для гостя не робиться жодного запиту: сайт навіть не питає, чи існують
// якісь розширення.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../components/auth/authContext';
import type { ExtensionDefinition } from './api';
import { createHostApi } from './hostApi';
import type { CatalogEntry } from './loader';
import { clearExtensionCache, devCatalog, fetchCatalog, hasDevExtensions, loadExtension } from './loader';
import type { CatalogState, ExtensionsValue } from './extensionsContext';
import { ExtensionsContext } from './extensionsContext';

const ExtensionsProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const email = user?.email ?? null;
  const [result, setResult] = useState<{ email: string; entries: CatalogEntry[] } | null>(null);
  const definitions = useRef(new Map<string, Promise<ExtensionDefinition>>());
  const hadUser = useRef(false);

  useEffect(() => {
    definitions.current.clear();
    if (!email) {
      // Вихід з акаунта: прибрати з пристрою закешований код розширень.
      if (hadUser.current) void clearExtensionCache();
      hadUser.current = false;
      if (!hasDevExtensions()) return;
      // Лише в dev: локальні розширення видно й без входу.
      let active = true;
      void devCatalog().then(entries => { if (active) setResult({ email: '', entries }); });
      return () => { active = false; };
    }
    hadUser.current = true;
    let active = true;
    fetchCatalog(email).then(
      entries => { if (active) setResult({ email, entries }); },
      cause => {
        console.error('Не вдалося прочитати розширення:', cause);
        if (active) setResult({ email, entries: [] });
      },
    );
    return () => { active = false; };
  }, [email]);

  const catalog: CatalogState = useMemo(() => {
    if (loading) return { status: 'loading' };
    if (!email && !hasDevExtensions()) return { status: 'signed-out' };
    if (result?.email !== (email ?? '')) return { status: 'loading' };
    return { status: 'ready', entries: result.entries };
  }, [loading, email, result]);

  const load = useCallback((entry: CatalogEntry) => {
    let pending = definitions.current.get(entry.id);
    if (!pending) {
      pending = loadExtension(entry).then(register => register(createHostApi(entry.id)));
      pending.catch(() => definitions.current.delete(entry.id));
      definitions.current.set(entry.id, pending);
    }
    return pending;
  }, []);

  const value: ExtensionsValue = useMemo(() => ({ catalog, load }), [catalog, load]);
  return <ExtensionsContext.Provider value={value}>{children}</ExtensionsContext.Provider>;
};

export default ExtensionsProvider;
