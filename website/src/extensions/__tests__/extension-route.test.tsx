// Хто що бачить на маршруті розширення і в меню. Firestore і вхід замокано:
// тут перевіряється лише реакція UI на каталог і на результат завантаження.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthValue } from '../../components/auth/authContext';
import type { CatalogEntry } from '../loader';
import ExtensionsProvider from '../ExtensionsProvider';
import ExtensionRoute from '../ExtensionRoute';
import Sidebar from '../../components/sidebar/Sidebar';
import ExtensionsSettings from '../ExtensionsSettings';
import { ExtensionIntegrityError } from '../verify';

let auth: Partial<AuthValue>;
const fetchCatalog = vi.fn();
const loadExtension = vi.fn();
const clearExtensionCache = vi.fn(async () => {});
let storedDisabled: string[] = [];
const saveDisabled = vi.fn(async (_uid: string | null, ids: string[]) => { storedDisabled = ids; });

vi.mock('../../components/auth/authContext', () => ({ useAuth: () => auth }));

vi.mock('../loader', async importOriginal => ({
  ...(await importOriginal<typeof import('../loader')>()),
  fetchCatalog: (...args: unknown[]) => fetchCatalog(...args),
  loadExtension: (...args: unknown[]) => loadExtension(...args),
  clearExtensionCache: () => clearExtensionCache(),
}));

vi.mock('../prefs', () => ({
  subscribeDisabled: (_uid: string | null, onChange: (ids: string[]) => void) => {
    onChange(storedDisabled);
    return () => {};
  },
  saveDisabled: (uid: string | null, ids: string[]) => saveDisabled(uid, ids),
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
                <Sidebar currentLang="uk" isOpen={false} onClose={() => {}} />
                <Routes>
                  <Route path="x/:extId/*" element={<ExtensionRoute currentLang="uk" />} />
                  <Route path="profile/extensions" element={<ExtensionsSettings currentLang="uk" />} />
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
  storedDisabled = [];
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
    expect(screen.getByRole('link', { name: 'Перший розділ' }).getAttribute('href')).toBe('/uk/x/demo/one');
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

describe('extension settings', () => {
  it('hides a turned-off extension from the menu and does not load it', async () => {
    signedIn('player4@example.com');
    storedDisabled = ['demo'];
    fetchCatalog.mockResolvedValue([DEMO]);
    renderAt('/uk/x/demo/one');

    expect(await screen.findByText('Це доповнення вимкнено у вашому профілі.')).toBeTruthy();
    expect(screen.getByText('Керувати доповненнями').getAttribute('href')).toBe('/uk/profile/extensions');
    expect(screen.queryByText('Перший розділ')).toBeNull();
    expect(loadExtension).not.toHaveBeenCalled();
  });

  it('turns an extension off and back on from the profile page', async () => {
    signedIn('player5@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    renderAt('/uk/profile/extensions');

    const toggle = await screen.findByRole('switch', { name: 'Демо' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(screen.getByText('Перший розділ')).toBeTruthy();

    fireEvent.click(toggle);
    await waitFor(() => expect(saveDisabled).toHaveBeenCalledWith('player5@example.com', ['demo']));
    expect(toggle.checked).toBe(false);
    expect(screen.queryByText('Перший розділ')).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(saveDisabled).toHaveBeenLastCalledWith('player5@example.com', []));
    expect(toggle.checked).toBe(true);
    expect(screen.getByText('Перший розділ')).toBeTruthy();
  });

  it('puts the switch back and says so when saving fails', async () => {
    signedIn('player6@example.com');
    fetchCatalog.mockResolvedValue([DEMO]);
    saveDisabled.mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/uk/profile/extensions');

    const toggle = await screen.findByRole('switch', { name: 'Демо' }) as HTMLInputElement;
    fireEvent.click(toggle);

    expect(await screen.findByText('Не вдалося зберегти вибір. Спробуйте ще раз.')).toBeTruthy();
    expect(toggle.checked).toBe(true);
    expect(screen.getByText('Перший розділ')).toBeTruthy();
  });

  it('tells accounts without grants that there is nothing to manage', async () => {
    signedIn('stranger2@example.com');
    fetchCatalog.mockResolvedValue([]);
    renderAt('/uk/profile/extensions');

    expect(await screen.findByText('Для вашого акаунта доповнень немає.')).toBeTruthy();
  });
});
