// Кнопка входу в шапці сайту та меню синхронізації під нею.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SyncState } from '../../utils/sync/engine';
import { useAuth } from './authContext';
import './AuthButton.css';

interface Labels {
  signIn: string;
  signInShort: string;
  signOut: string;
  account: string;
  syncNow: string;
  loading: string;
  hint: string;
  status: Record<SyncState['status'], string>;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
}

const LABELS: Record<'uk' | 'en', Labels> = {
  uk: {
    signIn: 'Увійти з Google',
    signInShort: 'Увійти',
    signOut: 'Вийти',
    account: 'Акаунт і синхронізація',
    syncNow: 'Синхронізувати зараз',
    loading: 'Перевіряємо вхід…',
    hint: 'Аркуш персонажа синхронізується між пристроями.',
    status: {
      off: 'Синхронізація вимкнена',
      connecting: 'Підключення…',
      saving: 'Збереження…',
      synced: 'Синхронізовано',
      error: 'Помилка синхронізації',
    },
    justNow: 'щойно',
    minutesAgo: (n: number) => `${n} хв тому`,
    hoursAgo: (n: number) => `${n} год тому`,
  },
  en: {
    signIn: 'Sign in with Google',
    signInShort: 'Sign in',
    signOut: 'Sign out',
    account: 'Account and sync',
    syncNow: 'Sync now',
    loading: 'Checking sign-in…',
    hint: 'Your character sheet syncs across devices.',
    status: {
      off: 'Sync is off',
      connecting: 'Connecting…',
      saving: 'Saving…',
      synced: 'Synced',
      error: 'Sync error',
    },
    justNow: 'just now',
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n} h ago`,
  },
};

function relativeTime(at: number, labels: Labels): string {
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return labels.justNow;
  if (minutes < 60) return labels.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hoursAgo(hours);
  return new Date(at).toLocaleDateString();
}

function statusLine(sync: SyncState, labels: Labels): string {
  const text = labels.status[sync.status];
  if (sync.status === 'synced' && sync.lastSyncedAt) {
    return `${text} • ${relativeTime(sync.lastSyncedAt, labels)}`;
  }
  return text;
}

const GoogleMark = () => (
  <svg className="auth-google" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.5 6.7v5.5h7.3c4.3-3.9 6.5-9.7 6.5-16.2z"
    />
    <path
      fill="#34A853"
      d="M24 46c6.1 0 11.2-2 14.9-5.4l-7.3-5.5c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-4-12.6-9.3H3.9v5.7C7.6 41.1 15.2 46 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.4 28c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5v-5.7H3.9C2.3 16.5 1.4 20.1 1.4 23.5S2.3 30.5 3.9 33.7L11.4 28z"
    />
    <path
      fill="#EA4335"
      d="M24 10.2c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35.2 3.6 30.1 1.5 24 1.5 15.2 1.5 7.6 6.4 3.9 13.3l7.5 5.7c1.8-5.3 6.7-8.8 12.6-8.8z"
    />
  </svg>
);

const AuthButton = ({ currentLang }: { currentLang: string }) => {
  const { user, loading, busy, error, sync, signIn, signOut, syncNow } = useAuth();
  const labels = currentLang === 'en' ? LABELS.en : LABELS.uk;

  const menuRoot = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Рядок «синхронізовано 5 хв тому» старіє мовчки, тож поки меню
  // відкрите, підганяємо його самі.
  const [, setTick] = useState(0);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRoot.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const timer = setInterval(() => setTick(value => value + 1), 30_000);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  if (loading) {
    return (
      <span className="auth-btn auth-btn--loading" title={labels.loading} aria-live="polite">
        <GoogleMark />
      </span>
    );
  }

  if (!user) {
    return (
      <div className="auth" ref={menuRoot}>
        <button
          type="button"
          className="auth-btn"
          onClick={signIn}
          disabled={busy}
          title={labels.signIn}
          aria-label={labels.signIn}
        >
          <GoogleMark />
          <span className="auth-btn__text">{labels.signInShort}</span>
        </button>
        {error && <p className="auth-error auth-error--floating">{error}</p>}
      </div>
    );
  }

  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="auth" ref={menuRoot}>
      <button
        type="button"
        className={`auth-btn auth-btn--user auth-btn--${sync.status}`}
        onClick={() => setOpen(current => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${user.email ?? user.displayName ?? ''} — ${statusLine(sync, labels)}`}
        aria-label={labels.account}
      >
        {user.photoURL ? (
          <img className="auth-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="auth-avatar auth-avatar--letter">{initial}</span>
        )}
        <span className="auth-dot" aria-hidden="true" />
      </button>

      {open && (
        <div className="auth-menu">
          <div className="auth-menu__who">
            {user.displayName && <strong>{user.displayName}</strong>}
            {user.email && <span className="auth-menu__email">{user.email}</span>}
          </div>

          <p className={`auth-menu__status auth-menu__status--${sync.status}`}>
            <span className="auth-dot" aria-hidden="true" />
            {statusLine(sync, labels)}
          </p>

          {sync.error && <p className="auth-error">{sync.error}</p>}
          {error && <p className="auth-error">{error}</p>}

          <p className="auth-menu__hint">{labels.hint}</p>

          <div className="auth-menu__actions">
            <button
              type="button"
              className="auth-menu__button"
              onClick={syncNow}
              disabled={sync.status === 'connecting' || sync.status === 'saving'}
            >
              {labels.syncNow}
            </button>
            <button
              type="button"
              className="auth-menu__button auth-menu__button--danger"
              onClick={() => {
                close();
                signOut();
              }}
              disabled={busy}
            >
              {labels.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthButton;
