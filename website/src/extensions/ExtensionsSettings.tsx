// Сторінка профілю /:lang/profile/extensions: гравець вмикає й вимикає
// розширення, до яких має доступ. Вимкнене зникає з бічного меню, і його
// код не завантажується, доки його знову не ввімкнуть.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import type { Lang } from './api';
import { useExtensions } from './extensionsContext';
import type { CatalogEntry } from './loader';
import './extensions.css';

const LABELS = {
  uk: {
    title: 'Доповнення',
    intro: 'Доповнення, до яких має доступ ваш акаунт. Вимкнені зникають з бічного меню й не завантажуються; увімкнути їх знову можна будь-коли. Вибір зберігається в акаунті й діє на всіх пристроях.',
    loading: 'Завантаження…',
    signInText: 'Увійдіть, щоб керувати доповненнями.',
    signIn: 'Увійти з Google',
    empty: 'Для вашого акаунта доповнень немає.',
    open: 'Відкрити →',
    on: 'Увімкнено',
    off: 'Вимкнено',
    saveFailed: 'Не вдалося зберегти вибір. Спробуйте ще раз.',
  },
  en: {
    title: 'Supplements',
    intro: 'Supplements your account has access to. Turned-off ones disappear from the sidebar and are not loaded; you can turn them back on at any time. Your choice is saved to your account and applies on every device.',
    loading: 'Loading…',
    signInText: 'Sign in to manage supplements.',
    signIn: 'Sign in with Google',
    empty: 'There are no supplements for your account.',
    open: 'Open →',
    on: 'On',
    off: 'Off',
    saveFailed: 'Could not save your choice. Please try again.',
  },
} as const;

function titleOf(entry: CatalogEntry, lang: Lang): string {
  return entry.title[lang] ?? entry.title.uk ?? entry.id;
}

const ExtensionsSettings = ({ currentLang }: { currentLang: Lang }) => {
  const t = LABELS[currentLang];
  const { signIn, busy } = useAuth();
  const { catalog, disabled, setEnabled } = useExtensions();
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);

  const toggle = (id: string, enabled: boolean) => {
    setFailed(null);
    setSaving(current => new Set(current).add(id));
    setEnabled(id, enabled)
      .catch(cause => {
        console.error(`Не вдалося зберегти вибір для розширення ${id}:`, cause);
        setFailed(id);
      })
      .finally(() => setSaving(current => {
        const next = new Set(current);
        next.delete(id);
        return next;
      }));
  };

  let body;
  if (catalog.status === 'loading') {
    body = <div className="loading">{t.loading}</div>;
  } else if (catalog.status === 'signed-out') {
    body = (
      <div className="ext-gate">
        <p>{t.signInText}</p>
        <button type="button" className="ext-gate__signin" onClick={signIn} disabled={busy}>{t.signIn}</button>
      </div>
    );
  } else if (!catalog.entries.length) {
    body = <div className="ext-gate"><p>{t.empty}</p></div>;
  } else {
    body = (
      <ul className="ext-settings__list">
        {catalog.entries.map(entry => {
          const enabled = !disabled.has(entry.id);
          const first = entry.nav[currentLang]?.[0];
          const title = titleOf(entry, currentLang);
          return (
            <li key={entry.id} className={`ext-card ${enabled ? '' : 'ext-card--off'}`}>
              <div className="ext-card__text">
                <h2 className="ext-card__title">{title}</h2>
                {enabled && first && (
                  <Link to={`/${currentLang}/x/${entry.id}/${first.path}`} className="ext-card__open">{t.open}</Link>
                )}
                {failed === entry.id && <p className="ext-card__error">{t.saveFailed}</p>}
              </div>
              <label className="ext-switch">
                <span className="ext-switch__state">{enabled ? t.on : t.off}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="ext-switch__input"
                  checked={enabled}
                  disabled={saving.has(entry.id)}
                  onChange={event => toggle(entry.id, event.target.checked)}
                  aria-label={title}
                />
                <span className="ext-switch__track" aria-hidden="true" />
              </label>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="page-content ext-settings">
      <h1>{t.title}</h1>
      {catalog.status === 'ready' && catalog.entries.length > 0 && <p className="ext-settings__intro">{t.intro}</p>}
      {body}
    </div>
  );
};

export default ExtensionsSettings;
