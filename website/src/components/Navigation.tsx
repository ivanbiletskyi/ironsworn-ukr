import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  currentLang: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentLang, onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
        </div>
      </div>
    </header>
  );
};

export default Navigation;
