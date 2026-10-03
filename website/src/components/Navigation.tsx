import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthButton from './auth/AuthButton';

interface NavigationProps {
  currentLang: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentLang, onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Аркуш існує лише українською, тож перемикач на EN тут лише спричинив би
  // редирект назад і мигання — вимикаємо його явно.
  // Те саме з довідником ходів.
  const path = location.pathname.replace(/\/$/, '');
  const isCharacterPage = path.endsWith('/character');
  const isMovesPage = /\/moves(\/[^/]+)?$/.test(path);
  const ukOnly = isCharacterPage || isMovesPage;

  const handleLanguageSwitch = (lang: string) => {
    if (lang === currentLang) return;
    
    // Replace the language prefix in the current path
    const regex = new RegExp(`^/${currentLang}(/|$)`);
    let newPath = location.pathname.replace(regex, `/${lang}/`);
    
    // If we're at the root of a language, redirect to the exact language root
    if (newPath === `/${lang}//`) {
      newPath = `/${lang}`;
    }
    
    navigate(newPath + location.hash + location.search);
  };

  return (
    <header className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <button 
            className={`mobile-menu-toggle ${isSidebarOpen ? 'active' : ''}`} 
            onClick={onToggleSidebar}
            aria-label="Toggle Menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          <Link to={`/${currentLang}`} className="nav-brand">
            <h1>Ironsworn</h1>
            <p className="nav-subtitle">
              {currentLang === 'uk' ? 'Фан-переклад українською' : 'TTRPG Rules Engine'}
            </p>
          </Link>
        </div>
        <div className="nav-controls">
          {currentLang === 'uk' && (
            <Link
              to="/uk/character"
              className="nav-icon-btn"
              aria-label="Аркуш персонажа"
              title="Аркуш персонажа"
            >
              📜
            </Link>
          )}
          {currentLang === 'uk' && (
            <Link
              to="/uk/moves"
              className="nav-icon-btn"
              aria-label="Довідник ходів"
              title="Довідник ходів"
            >
              ⚔️
            </Link>
          )}
          <Link
            to={`/${currentLang}/oracles`}
            className="nav-icon-btn"
            aria-label={currentLang === 'uk' ? 'Генератори оракулів' : 'Oracle Generators'}
            title={currentLang === 'uk' ? 'Генератори оракулів' : 'Oracle Generators'}
          >
            🎲
          </Link>
          <Link
            to={`/${currentLang}/search`}
            className="nav-icon-btn"
            aria-label="Search"
            title={currentLang === 'uk' ? 'Пошук' : 'Search'}
          >
            🔍
          </Link>
          <div className="lang-switch">
            <button
              className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageSwitch('en')}
              disabled={ukOnly}
              title={
                isCharacterPage
                  ? 'Аркуш персонажа доступний лише українською'
                  : isMovesPage
                    ? 'Довідник ходів доступний лише українською'
                    : undefined
              }
            >
              EN
            </button>
            <button
              className={`lang-btn ${currentLang === 'uk' ? 'active' : ''}`}
              onClick={() => handleLanguageSwitch('uk')}
            >
              UK
            </button>
          </div>
          <AuthButton currentLang={currentLang} />
        </div>
      </div>
    </header>
  );
};

export default Navigation;
