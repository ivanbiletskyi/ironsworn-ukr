// Розділи розширень у бічному меню — лише ті, до яких у акаунта є доступ.
// Гість і акаунт без дозволів не бачать тут нічого.

import { Link, useLocation } from 'react-router-dom';
import type { Lang } from './api';
import { useExtensions } from './extensionsContext';

const ExtensionsNav = ({ currentLang, onNavigate }: { currentLang: Lang; onNavigate: () => void }) => {
  const { catalog } = useExtensions();
  const location = useLocation();
  if (catalog.status !== 'ready') return null;

  return (
    <>
      {catalog.entries.map(entry => {
        const items = entry.nav[currentLang] ?? [];
        const title = entry.title[currentLang] ?? entry.title.uk ?? entry.id;
        if (!items.length) return null;
        return (
          <div key={entry.id}>
            <h3>{title}</h3>
            <ul>
              {items.map(item => {
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
        );
      })}
    </>
  );
};

export default ExtensionsNav;
