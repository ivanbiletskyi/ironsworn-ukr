// Маршрут /:lang/x/:extId/*. Тексти тут навмисно нейтральні: сторінка не
// називає розширення й не підтверджує його існування тим, хто не має доступу.

import { useEffect, useState } from 'react';
import { Link, Routes, useParams } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import type { ExtensionDefinition, Lang } from './api';
import ExtensionBoundary from './ExtensionBoundary';
import { EXTENSIONS_SETTINGS_PATH, useExtensions } from './extensionsContext';
import { ExtensionIncompatibleError } from './loader';
import { ExtensionIntegrityError } from './verify';
import './extensions.css';

const LABELS = {
  uk: {
    loading: 'Завантаження…',
    signInText: 'Увійдіть, щоб переглянути цю сторінку.',
    signIn: 'Увійти з Google',
    notFound: 'Сторінку не знайдено.',
    disabled: 'Це доповнення вимкнено у вашому профілі.',
    manage: 'Керувати доповненнями',
    integrity: 'Не вдалося перевірити цілісність сторінки.',
    incompatible: 'Ця сторінка потребує новішої версії сайту.',
    failed: 'Не вдалося завантажити сторінку.',
    crashed: 'На цій сторінці сталася помилка.',
  },
  en: {
    loading: 'Loading…',
    signInText: 'Sign in to view this page.',
    signIn: 'Sign in with Google',
    notFound: 'Page not found.',
    disabled: 'This supplement is turned off in your profile.',
    manage: 'Manage supplements',
    integrity: 'Could not verify this page.',
    incompatible: 'This page needs a newer version of the site.',
    failed: 'Could not load this page.',
    crashed: 'Something went wrong on this page.',
  },
} as const;

type Loaded = { id: string; definition?: ExtensionDefinition; error?: unknown };

const ExtensionRoute = ({ currentLang }: { currentLang: Lang }) => {
  const t = LABELS[currentLang];
  const { extId } = useParams();
  const { signIn, busy } = useAuth();
  const { catalog, disabled, load } = useExtensions();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const granted = catalog.status === 'ready' ? catalog.entries.find(e => e.id === extId) : undefined;
  // Вимкнене розширення не завантажується зовсім, навіть за прямим посиланням.
  const entry = granted && !disabled.has(granted.id) ? granted : undefined;

  useEffect(() => {
    if (!entry) return;
    let active = true;
    load(entry).then(
      definition => { if (active) setLoaded({ id: entry.id, definition }); },
      error => {
        console.error(`Розширення ${entry.id} не завантажилося:`, error);
        if (active) setLoaded({ id: entry.id, error });
      },
    );
    return () => { active = false; };
  }, [entry, load]);

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
  } else if (granted && !entry) {
    body = (
      <div className="ext-gate">
        <p>{t.disabled}</p>
        <Link to={`/${currentLang}/${EXTENSIONS_SETTINGS_PATH}`} className="ext-gate__signin">{t.manage}</Link>
      </div>
    );
  } else if (!entry) {
    body = <div className="ext-gate"><p>{t.notFound}</p></div>;
  } else if (loaded?.id !== entry.id) {
    body = <div className="loading">{t.loading}</div>;
  } else if (loaded.error) {
    const message = loaded.error instanceof ExtensionIntegrityError
      ? t.integrity
      : loaded.error instanceof ExtensionIncompatibleError ? t.incompatible : t.failed;
    body = <div className="ext-gate"><p>{message}</p></div>;
  } else {
    body = (
      <ExtensionBoundary key={entry.id} fallback={<div className="ext-gate"><p>{t.crashed}</p></div>}>
        <Routes>{loaded.definition?.routes}</Routes>
      </ExtensionBoundary>
    );
  }

  return <div className="page-content">{body}</div>;
};

export default ExtensionRoute;
