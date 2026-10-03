// Спільна секція «Доповнення» в бічному меню з підсекцією на кожне
// розширення, до якого в акаунта є доступ. Гість і акаунт без дозволів не
// бачать навіть заголовка секції.

import { Link, useLocation } from 'react-router-dom';
import type { Lang } from './api';
import { useExtensions } from './extensionsContext';
import './extensions.css';

const SECTION_TITLE: Record<Lang, string> = { uk: 'Доповнення', en: 'Supplements' };

const ExtensionsNav = ({ currentLang, onNavigate }: { currentLang: Lang; onNavigate: () => void }) => {
  const { catalog } = useExtensions();
  const location = useLocation();
  if (catalog.status !== 'ready') return null;

  const visible = catalog.entries.filter(entry => (entry.nav[currentLang] ?? []).length > 0);
  if (!visible.length) return null;

  return (
    <div className="ext-nav">
      <h3>{SECTION_TITLE[currentLang]}</h3>
      {visible.map(entry => (
        <div key={entry.id} className="ext-nav__group">
          <h4 className="ext-nav__title">{entry.title[currentLang] ?? entry.title.uk ?? entry.id}</h4>
          <ul>
            {(entry.nav[currentLang] ?? []).map(item => {
              const to = `/${currentLang}/x/${entry.id}/${item.path}`;
              return (
                <li key={item.path}>
                  <Link to={to} className={location.pathname === to ? 'active' : ''} onClick={onNavigate}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ExtensionsNav;
