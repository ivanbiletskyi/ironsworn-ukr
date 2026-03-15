import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  currentLang: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentLang }) => {
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
        <Link to={`/${currentLang}`} className="nav-brand">
          <h1>Ironsworn</h1>
          <p className="nav-subtitle">
            {currentLang === 'uk' ? 'Фан-переклад українською' : 'TTRPG Rules Engine'}
          </p>
        </Link>
        <div className="nav-controls">
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
