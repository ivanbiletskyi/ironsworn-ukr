// Контекст входу через Google. Компонент-провайдер — в AuthProvider.tsx:
// тут навмисно немає JSX, щоб Fast Refresh не перезавантажував усе дерево
// щоразу, коли міняється хук.

import { createContext, useContext } from 'react';
import type { SyncState } from '../../utils/character/syncEngine';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface AuthValue {
  user: AuthUser | null;
  /** Поки Firebase не сказав, чи є збережена сесія, кнопка нічого не обіцяє. */
  loading: boolean;
  /** Триває вхід або вихід. */
  busy: boolean;
  /** Помилка входу; про помилки синхронізації розповідає `sync.error`. */
  error: string | null;
  sync: SyncState;
  signIn: () => void;
  signOut: () => void;
  syncNow: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth використано поза <AuthProvider>.');
  return value;
}
