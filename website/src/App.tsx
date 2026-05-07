import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import MarkdownRenderer from './components/MarkdownRenderer';
import Search from './components/Search';
import OracleGenerators from './components/OracleGenerators';
import { CHAPTERS, UK_TITLES } from './utils/chapters';
import './App.css';

// Groups of chapters to show on the Home Page and Sidebar
// Hardcoded structure based on the md files provided.


const FLAT_FILES = CHAPTERS.flatMap(chapter => 
  chapter.files.map(file => ({
    file,
    prefix: chapter.prefix
  }))
);

const Sidebar = ({ currentLang, isOpen, onClose }: { currentLang: string, isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header mobile-only">
        <button className="close-sidebar" onClick={onClose}>×</button>
      </div>
      {CHAPTERS.map(chapter => (
        <div key={chapter.prefix}>
          <h3>{currentLang === 'uk' ? chapter.titleUk : chapter.titleEn}</h3>
          <ul>
            {chapter.prefix === '6-Oracles' && (
              <li>
                <Link
                  to={`/${currentLang}/oracles`}
                  className={location.pathname === `/${currentLang}/oracles` ? 'active' : ''}
                  onClick={() => { if (window.innerWidth <= 900) onClose(); }}
                >
                  {currentLang === 'uk' ? '🎲 Генератори оракулів' : '🎲 Oracle Generators'}
                </Link>
              </li>
            )}
            {chapter.files.map(file => {
              // Create readable link name from filename, e.g., "1-Basics_1-Playing-Ironsworn.md" -> "Playing Ironsworn"
              const linkName = currentLang === 'uk' 
                ? (UK_TITLES[file] || file) 
                : file.replace(`${chapter.prefix}_`, '').replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' ');
              const fullPath = `/${currentLang}/${file.replace('.md', '')}`;
              const isActive = location.pathname === fullPath || location.pathname === `${fullPath}.md` || location.pathname === fullPath + '/';
              
              return (
                <li key={file}>
                  <Link 
                    to={fullPath} 
                    className={isActive ? 'active' : ''}
                    onClick={() => {
                      if (window.innerWidth <= 900) {
                        onClose();
                      }
                    }}
                  >
                    {linkName}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
};

const HomePage = ({ currentLang }: { currentLang: string }) => {
  return (
    <div className="home-page">
      <h1>Ironsworn</h1>
      <p className="subtitle">
        {currentLang === 'uk' 
          ? 'Грайте в небезпечні квести у суворому фентезійному світі (Українська локалізація)' 
          : 'Perilous quests in a gritty fantasy world'}
      </p>
      
      <div className="chapters-grid">
        {CHAPTERS.map((chapter) => (
          <Link key={chapter.prefix} to={`/${currentLang}/${chapter.files[0].replace('.md', '')}`} className="chapter-card">
            <h2>{currentLang === 'uk' ? chapter.titleUk : chapter.titleEn}</h2>
            <p>{currentLang === 'uk' ? 'Дізнатися більше →' : 'Read more →'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

const PageRenderer = ({ currentLang }: { currentLang: string }) => {
  const { '*': pathParam } = useParams();
  
  if (!pathParam) {
    return <HomePage currentLang={currentLang} />;
  }

  // Support links that carry .md or without .md
  const fileName = pathParam.endsWith('.md') ? pathParam : `${pathParam}.md`;
  const markdownPath = `${currentLang}/${fileName}`;

  // Find index in flattened files to determine previous/next
  const currentIndex = FLAT_FILES.findIndex(f => f.file === fileName);
  const nextFile = currentIndex !== -1 && currentIndex < FLAT_FILES.length - 1 ? FLAT_FILES[currentIndex + 1] : null;

  return (
    <div className="page-content">
      <MarkdownRenderer markdownPath={markdownPath} />
      
      {nextFile && (
        <div className="next-chapter-container">
          <Link 
            to={`/${currentLang}/${nextFile.file.replace('.md', '')}`} 
            className="next-chapter-btn"
            onClick={() => window.scrollTo(0, 0)}
          >
            <div className="btn-label">{currentLang === 'uk' ? 'Далі' : 'Next'}</div>
            <div className="btn-title">
              {currentLang === 'uk' 
                ? (UK_TITLES[nextFile.file] || nextFile.file) 
                : nextFile.file.replace(`${nextFile.prefix}_`, '').replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' ')}
            </div>
            <span className="arrow">→</span>
          </Link>
        </div>
      )}
    </div>
  );
};

const Footer = ({ currentLang }: { currentLang: string }) => {
  const isUk = currentLang === 'uk';
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>{isUk ? '📜 Ліцензія та авторство' : '📜 License & Assets'}</h3>
          <div className="license-info">
            <p>
              <strong>{isUk ? 'Оригінальний автор:' : 'Original Author:'}</strong> Shawn Tomkin
            </p>
            <p>
              <strong>{isUk ? 'Оригінальна ліцензія:' : 'Original License:'}</strong>{' '}
              <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noopener noreferrer">
                CC BY-NC-SA 3.0
              </a>
            </p>
            <p>
              <strong>{isUk ? 'Офіційний сайт:' : 'Official Site:'}</strong>{' '}
              <a href="https://www.ironswornrpg.com/" target="_blank" rel="noopener noreferrer">
                ironswornrpg.com
              </a>
            </p>
          </div>
        </div>

        <div className="footer-section">
          <h3>{isUk ? '⚠️ Відмова від відповідальності' : '⚠️ Disclaimer'}</h3>
          <div className="disclaimer">
            <p>
              {isUk 
                ? 'Це неофіційна фан-адаптація та переклад tabletop RPG системи Ironsworn.'
                : 'This is an unofficial fan adaptation and translation of the Ironsworn tabletop RPG system.'}
            </p>
            <p>
              {isUk
                ? 'Цей проект не афілійований та не схвалений Шоном Томкіним.'
                : 'This project is not affiliated with or endorsed by Shawn Tomkin.'}
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © 2026 {isUk ? 'Українська фан-локалізація Ironsworn' : 'Ironsworn Ukrainian Fan Localization'} •{' '}
          <a href="https://github.com/ivanbiletskyi/ironsworn-ukr" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
};

const LayoutParamsWrapper = () => {
  const { lang } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Valid languages check
  const validLangs = ['en', 'uk'] as const;
  const currentLang: 'en' | 'uk' = validLangs.includes(lang as 'en' | 'uk') ? lang as 'en' | 'uk' : 'uk';

  // Toggle sidebar for mobile
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={`app ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Navigation currentLang={currentLang} onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="main-content">
        {currentLang && (
          <Sidebar 
            currentLang={currentLang} 
            isOpen={isSidebarOpen} 
            onClose={closeSidebar} 
          />
        )}
        <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
        <div className="content-wrapper">
          <Routes>
            <Route path="search" element={<Search />} />
            <Route path="oracles" element={<OracleGenerators currentLang={currentLang} />} />
            <Route path="*" element={<PageRenderer currentLang={currentLang} />} />
          </Routes>
          <Footer currentLang={currentLang} />
        </div>
      </div>
    </div>
  );
};

function App() {
  const basename = import.meta.env.PROD ? '/ironsworn-ukr' : '/';

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to="/uk" replace />} />
        <Route path="/:lang/*" element={<LayoutParamsWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;
