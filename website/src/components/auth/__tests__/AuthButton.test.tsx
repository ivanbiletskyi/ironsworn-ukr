// The header sign-in button and its sync menu.
// Firebase is mocked: these tests are about the UI, not about the network.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthProvider from '../AuthProvider';
import AuthButton from '../AuthButton';
import { setSyncUser } from '../../../utils/sync/engine';

interface FakeUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

let signedIn: FakeUser | null = null;

const signInWithPopup = vi.fn(async () => {});
const signInWithRedirect = vi.fn(async () => {});
const firebaseSignOut = vi.fn(async () => {});

vi.mock('../../../utils/firebase/client', () => ({
  getFirebase: async () => ({ app: {}, auth: {}, db: {} }),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: FakeUser | null) => void) => {
    callback(signedIn);
    return () => {};
  },
  getRedirectResult: async () => null,
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...(args as [])),
  signInWithRedirect: (...args: unknown[]) => signInWithRedirect(...(args as [])),
  signOut: (...args: unknown[]) => firebaseSignOut(...(args as [])),
}));

vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  onSnapshot: () => () => {},
  setDoc: async () => {},
}));

const renderButton = () =>
  render(
    <AuthProvider>
      <AuthButton currentLang="uk" />
    </AuthProvider>,
  );

beforeEach(() => {
  signedIn = null;
  vi.clearAllMocks();
});

afterEach(() => {
  // Двигун синхронізації — модульний синглтон, тож між тестами його
  // треба лишати вимкненим.
  setSyncUser(null);
});

describe('signed out', () => {
  it('offers a Google sign-in button', async () => {
    renderButton();
    expect(await screen.findByRole('button', { name: 'Увійти з Google' })).toBeTruthy();
  });

  it('opens the Google popup on click', async () => {
    renderButton();
    fireEvent.click(await screen.findByRole('button', { name: 'Увійти з Google' }));
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalledTimes(1));
  });
});

describe('signed in', () => {
  beforeEach(() => {
    signedIn = {
      uid: 'u1',
      displayName: 'Ульріка',
      email: 'ulrika@example.com',
      photoURL: null,
    };
  });

  it('shows the account menu with the sync status', async () => {
    renderButton();
    fireEvent.click(await screen.findByRole('button', { name: 'Акаунт і синхронізація' }));

    expect(screen.getByText('Ульріка')).toBeTruthy();
    expect(screen.getByText('ulrika@example.com')).toBeTruthy();
    // Знімок із Firestore у мока не приходить, тож стан лишається «Підключення…».
    expect(screen.getByText('Підключення…')).toBeTruthy();
  });

  it('signs out from the menu', async () => {
    renderButton();
    fireEvent.click(await screen.findByRole('button', { name: 'Акаунт і синхронізація' }));
    fireEvent.click(screen.getByRole('button', { name: 'Вийти' }));

    await waitFor(() => expect(firebaseSignOut).toHaveBeenCalledTimes(1));
  });
});
