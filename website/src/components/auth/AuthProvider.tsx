// Стан входу через Google: тримає користувача й вмикає/вимикає
// синхронізацію аркуша під ним.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { getFirebase } from '../../utils/firebase/client';
import type { SyncState } from '../../utils/character/syncEngine';
import { getSyncState, setSyncUser, subscribeSyncState, syncNow } from '../../utils/character/syncEngine';
import type { AuthUser, AuthValue } from './authContext';
import { AuthContext } from './authContext';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/**
 * Пояснення українською. `null` — це не помилка, а скасування: закрите
 * вікно входу нічого повідомляти не має.
 */
function describeAuthError(cause: unknown): string | null {
  const code = (cause as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null;
    case 'auth/popup-blocked':
      return 'Браузер заблокував вікно входу. Дозвольте спливальні вікна для цього сайту.';
    case 'auth/unauthorized-domain':
      return 'Цей домен не дозволено у Firebase (Authentication → Settings → Authorized domains).';
    case 'auth/configuration-not-found':
      return 'У проєкті Firebase не увімкнено Authentication (Console → Authentication → Get started).';
    case 'auth/operation-not-allowed':
      return 'Вхід через Google вимкнено в налаштуваннях Firebase (Sign-in method → Google).';
    case 'auth/network-request-failed':
      return 'Немає зв’язку з Firebase.';
    default:
      return cause instanceof Error ? cause.message : 'Не вдалося увійти.';
  }
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>(getSyncState);

  useEffect(() => subscribeSyncState(setSync), []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        const { auth } = await getFirebase();
        const { getRedirectResult, onAuthStateChanged } = await import('firebase/auth');
        if (!active) return;

        unsubscribe = onAuthStateChanged(auth, next => {
          const mapped = next ? toAuthUser(next) : null;
          setUser(mapped);
          setLoading(false);
          // Вхід міг завершитися успіхом попри помилку на шляху до нього
          // (наприклад, збій запису сесії). Скарга, поки гравець уже
          // всередині, лише збиває з пантелику.
          if (mapped) setError(null);
          setSyncUser(mapped?.uid ?? null);
        });

        // Запасний шлях входу (див. signIn) повертає гравця вже на сторінку,
        // тож його результат треба забрати тут, а не в обробнику кнопки.
        getRedirectResult(auth).catch(cause => {
          if (active) setError(describeAuthError(cause));
        });
      } catch (cause) {
        if (!active) return;
        // Firebase не завантажився — сайт лишається робочим, просто без хмари.
        setLoading(false);
        setError(describeAuthError(cause));
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(() => {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const { auth } = await getFirebase();
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import(
          'firebase/auth'
        );
        const provider = new GoogleAuthProvider();
        // Без цього браузер із кількома акаунтами Google мовчки бере перший.
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
          await signInWithPopup(auth, provider);
        } catch (cause) {
          const code = (cause as { code?: string } | null)?.code;
          if (
            code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment'
          ) {
            await signInWithRedirect(auth, provider);
            return;
          }
          throw cause;
        }
      } catch (cause) {
        setError(describeAuthError(cause));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const signOut = useCallback(() => {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const { auth } = await getFirebase();
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        await firebaseSignOut(auth);
        // Персонажі лишаються в localStorage: вихід зупиняє синхронізацію,
        // а не стирає аркуш із пристрою.
      } catch (cause) {
        setError(describeAuthError(cause));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, busy, error, sync, signIn, signOut, syncNow }),
    [user, loading, busy, error, sync, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
