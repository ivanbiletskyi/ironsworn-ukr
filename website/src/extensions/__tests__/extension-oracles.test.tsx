// Оракули доповнень на сторінці «Генератори оракулів». Firestore і вхід
// замокано, як і в extension-route.test.tsx.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AuthValue } from '../../components/auth/authContext';
import OracleGenerators from '../../components/OracleGenerators';
import type { ExtensionDefinition, ExtensionOracle } from '../api';
import type { CatalogEntry } from '../loader';
import ExtensionsProvider from '../ExtensionsProvider';
import { toOracleGroup } from '../useExtensionOracles';

let auth: Partial<AuthValue>;
const fetchCatalog = vi.fn();
const loadExtension = vi.fn();
let storedDisabled: string[] = [];

vi.mock('../../components/auth/authContext', () => ({ useAuth: () => auth }));

vi.mock('../loader', async importOriginal => ({
  ...(await importOriginal<typeof import('../loader')>()),
  fetchCatalog: (...args: unknown[]) => fetchCatalog(...args),
  loadExtension: (...args: unknown[]) => loadExtension(...args),
  clearExtensionCache: async () => {},
}));

vi.mock('../prefs', () => ({
  subscribeDisabled: (_uid: string | null, onChange: (ids: string[]) => void) => {
    onChange(storedDisabled);
    return () => {};
  },
  saveDisabled: async () => {},
}));

const DEMO: CatalogEntry = {
  id: 'demo',
  title: { uk: 'Демо', en: 'Demo' },
  nav: {},
  requires: '^1',
  current: 'abc1234',
};

const OMEN: ExtensionOracle = {
  kind: 'range',
  id: 'omen',
  title: { uk: 'Знамення', en: 'Omen' },
  rows: {
    uk: [{ min: 1, max: 100, result: 'Ворон на даху' }],
    en: [{ min: 1, max: 100, result: 'A raven on the roof' }],
  },
};

const DEFINITION: ExtensionDefinition = {
  routes: null,
  oracles: [OMEN],
  oracleCombos: [{
    id: 'omen-and-action',
    label: { uk: 'Знамення + Дія', en: 'Omen + Action' },
    description: { uk: 'Опис', en: 'Description' },
    oracleIds: ['omen', 'action', 'missing'],
  }],
};

const signedIn = (email: string) => {
  auth = { loading: false, busy: false, signIn: vi.fn(), user: { uid: email, email, displayName: null, photoURL: null } };
};

beforeEach(() => {
  vi.clearAllMocks();
  storedDisabled = [];
  localStorage.clear();
  window.matchMedia ??= (() => ({ matches: true })) as unknown as typeof window.matchMedia;
});

describe('toOracleGroup', () => {
  it('prefixes ids and resolves combo ids against own and core oracles', () => {
    const group = toOracleGroup(DEMO, DEFINITION);
    expect(group?.oracles.map(o => o.id)).toEqual(['demo/omen']);
    expect(group?.combos).toEqual([
      expect.objectContaining({ id: 'demo/omen-and-action', oracleIds: ['demo/omen', 'action'] }),
    ]);
  });

  it('drops malformed oracles and returns nothing when none are left', () => {
    const broken = { ...OMEN, id: 'bad:id' };
    const untitled = { ...OMEN, id: 'untitled', title: { uk: 'Лише укр.' } } as unknown as ExtensionOracle;
    expect(toOracleGroup(DEMO, { routes: null, oracles: [broken, untitled] })).toBeNull();
    expect(toOracleGroup(DEMO, { routes: null })).toBeNull();
  });
});

describe('oracle page', () => {
  it('shows extension oracles in their own section and rolls them', async () => {
    signedIn('player@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    loadExtension.mockResolvedValue(() => DEFINITION);
    render(<ExtensionsProvider><OracleGenerators currentLang="uk" /></ExtensionsProvider>);

    const heading = await screen.findByRole('heading', { name: 'Демо' });
    const section = heading.closest('section')!;
    fireEvent.click(within(section).getByRole('button', { name: 'Roll Знамення' }));
    expect(within(section).getByText('Ворон на даху')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Знамення + Дія' }));
    expect(screen.getAllByText('Знамення').length).toBeGreaterThan(1);
  });

  it('skips extensions turned off in the profile', async () => {
    signedIn('player2@example.com');
    storedDisabled = ['demo'];
    fetchCatalog.mockResolvedValue([DEMO]);
    loadExtension.mockResolvedValue(() => DEFINITION);
    render(<ExtensionsProvider><OracleGenerators currentLang="uk" /></ExtensionsProvider>);

    expect(await screen.findByText('Дія')).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('heading', { name: 'Демо' })).toBeNull();
    expect(loadExtension).not.toHaveBeenCalled();
  });
});
