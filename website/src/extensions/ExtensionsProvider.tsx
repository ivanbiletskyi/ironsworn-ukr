// Тримає каталог розширень для того, хто увійшов, його вибір, які з них
// увімкнені, і кешує завантажені модулі. Для гостя не робиться жодного
// запиту: сайт навіть не питає, чи існують якісь розширення.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../components/auth/authContext';
import type { ExtensionDefinition } from './api';
import { createHostApi } from './hostApi';
import type { CatalogEntry } from './loader';
import { clearExtensionCache, devCatalog, fetchCatalog, hasDevExtensions, loadExtension } from './loader';
import { saveDisabled, subscribeDisabled } from './prefs';
import type { CatalogState, ExtensionsValue } from './extensionsContext';
import { ExtensionsContext } from './extensionsContext';

const NO_PREFS: ReadonlySet<string> = new Set();

const ExtensionsProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const email = user?.email ?? null;
  // Чиї налаштування читати: uid акаунта, '' — локальні dev-розширення без
  // входу, null — нічиї (гість).
  const prefsOwner = email && user ? user.uid : hasDevExtensions() ? '' : null;
  const [result, setResult] = useState<{ email: string; entries: CatalogEntry[] } | null>(null);
  const [prefs, setPrefs] = useState<{ owner: string; disabled: ReadonlySet<string> } | null>(null);
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

  useEffect(() => {
    if (prefsOwner === null) return;
    return subscribeDisabled(
      prefsOwner || null,
      ids => setPrefs({ owner: prefsOwner, disabled: new Set(ids) }),
      cause => {
        // Не вдалося прочитати вибір — показуємо все, ніж ховати доступне.
        console.error('Не вдалося прочитати налаштування розширень:', cause);
        setPrefs({ owner: prefsOwner, disabled: NO_PREFS });
      },
    );
  }, [prefsOwner]);

  // Каталог «готовий» лише разом із вибором гравця: інакше вимкнене
  // розширення на мить блимало б у меню.
  const prefsReady = prefs !== null && prefs.owner === prefsOwner;
  const catalog: CatalogState = useMemo(() => {
    if (loading) return { status: 'loading' };
    if (!email && !hasDevExtensions()) return { status: 'signed-out' };
    if (result?.email !== (email ?? '') || !prefsReady) return { status: 'loading' };
    return { status: 'ready', entries: result.entries };
  }, [loading, email, result, prefsReady]);
  const disabled = prefsReady ? prefs.disabled : NO_PREFS;

  const setEnabled = useCallback(async (id: string, enabled: boolean) => {
    const current = prefs;
    if (!current || current.owner !== prefsOwner) return;
    const next = new Set(current.disabled);
    if (enabled) next.delete(id);
    else next.add(id);
    const optimistic = { owner: current.owner, disabled: next };
    setPrefs(optimistic);
    try {
      await saveDisabled(current.owner || null, [...next].sort());
    } catch (cause) {
      // Повертаємо як було, якщо поверх нас ніхто нічого не встиг змінити.
      setPrefs(value => (value === optimistic ? current : value));
      throw cause;
    }
  }, [prefs, prefsOwner]);

  const load = useCallback((entry: CatalogEntry) => {
    let pending = definitions.current.get(entry.id);
    if (!pending) {
      pending = loadExtension(entry).then(register => register(createHostApi(entry.id)));
      pending.catch(() => definitions.current.delete(entry.id));
      definitions.current.set(entry.id, pending);
    }
    return pending;
  }, []);

  const value: ExtensionsValue = useMemo(
    () => ({ catalog, disabled, setEnabled, load }),
    [catalog, disabled, setEnabled, load],
  );
  return <ExtensionsContext.Provider value={value}>{children}</ExtensionsContext.Provider>;
};

export default ExtensionsProvider;
