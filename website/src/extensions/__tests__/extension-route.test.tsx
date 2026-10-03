// Хто що бачить на маршруті розширення і в меню. Firestore і вхід замокано:
// тут перевіряється лише реакція UI на каталог і на результат завантаження.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthValue } from '../../components/auth/authContext';
import type { CatalogEntry } from '../loader';
import ExtensionsProvider from '../ExtensionsProvider';
import ExtensionRoute from '../ExtensionRoute';
import ExtensionsNav from '../ExtensionsNav';
import { ExtensionIntegrityError } from '../verify';

let auth: Partial<AuthValue>;
const fetchCatalog = vi.fn();
const loadExtension = vi.fn();
const clearExtensionCache = vi.fn(async () => {});

vi.mock('../../components/auth/authContext', () => ({ useAuth: () => auth }));

vi.mock('../loader', async importOriginal => ({
  ...(await importOriginal<typeof import('../loader')>()),
  fetchCatalog: (...args: unknown[]) => fetchCatalog(...args),
  loadExtension: (...args: unknown[]) => loadExtension(...args),
  clearExtensionCache: () => clearExtensionCache(),
}));

const DEMO: CatalogEntry = {
  id: 'demo',
  title: { uk: 'Демо', en: 'Demo' },
  nav: { uk: [{ label: 'Перший розділ', path: 'one' }] },
  requires: '^1',
  current: 'abc1234',
};

const guest = () => { auth = { loading: false, busy: false, signIn: vi.fn(), user: null }; };
const signedIn = (email: string) => {
  auth = { loading: false, busy: false, signIn: vi.fn(), user: { uid: email, email, displayName: null, photoURL: null } };
};

const renderAt = (path: string) =>
  render(
    <ExtensionsProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/:lang/*"
            element={
              <>
                <ExtensionsNav currentLang="uk" onNavigate={() => {}} />
                <Routes>
                  <Route path="x/:extId/*" element={<ExtensionRoute currentLang="uk" />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ExtensionsProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extension route', () => {
  it('asks guests to sign in without naming the extension or touching Firestore', () => {
    guest();
    renderAt('/uk/x/demo/one');

    expect(screen.getByText('Увійдіть, щоб переглянути цю сторінку.')).toBeTruthy();
    expect(screen.queryByText('Демо')).toBeNull();
    expect(fetchCatalog).not.toHaveBeenCalled();
    expect(loadExtension).not.toHaveBeenCalled();
  });

  it('shows a plain not-found page to accounts without a grant', async () => {
    signedIn('stranger@example.com');
    fetchCatalog.mockResolvedValue([]);
    renderAt('/uk/x/demo/one');

    expect(await screen.findByText('Сторінку не знайдено.')).toBeTruthy();
    expect(fetchCatalog).toHaveBeenCalledWith('stranger@example.com');
    expect(loadExtension).not.toHaveBeenCalled();
    expect(screen.queryByText('Демо')).toBeNull();
    expect(screen.queryByText('Доповнення')).toBeNull();
  });

  it('loads the extension, renders its routes and lists it in the menu', async () => {
    signedIn('player@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    loadExtension.mockResolvedValue(() => ({
      routes: <Route path="one" element={<p>Текст першого розділу</p>} />,
    }));
    renderAt('/uk/x/demo/one');

    expect(await screen.findByText('Текст першого розділу')).toBeTruthy();
    expect(screen.getByText('Доповнення')).toBeTruthy();
    expect(screen.getByText('Демо')).toBeTruthy();
    expect(screen.getByText('Перший розділ').getAttribute('href')).toBe('/uk/x/demo/one');
  });

  it('refuses to show a release whose signature fails', async () => {
    signedIn('player2@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    loadExtension.mockRejectedValue(new ExtensionIntegrityError('Підпис релізу недійсний.'));
    renderAt('/uk/x/demo/one');

    expect(await screen.findByText('Не вдалося перевірити цілісність сторінки.')).toBeTruthy();
  });

  it('keeps the site alive when the extension crashes', async () => {
    signedIn('player3@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    const Boom = () => { throw new Error('boom'); };
    loadExtension.mockResolvedValue(() => ({ routes: <Route path="one" element={<Boom />} /> }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/uk/x/demo/one');

    expect(await screen.findByText('На цій сторінці сталася помилка.')).toBeTruthy();
    expect(screen.getByText('Демо')).toBeTruthy();
  });
});
