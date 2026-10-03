import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Sidebar from './components/sidebar/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';
import Search from './components/Search';
import OracleGenerators from './components/OracleGenerators';
import CharacterSheet from './components/character/CharacterSheet';
import MovesPage from './components/moves/MovesPage';
import AuthProvider from './components/auth/AuthProvider';
import ExtensionsProvider from './extensions/ExtensionsProvider';
import ExtensionRoute from './extensions/ExtensionRoute';
import ExtensionsSettings from './extensions/ExtensionsSettings';
import { EXTENSIONS_SETTINGS_PATH } from './extensions/extensionsContext';
import { CHAPTERS, FLAT_FILES, pageTitle } from './utils/chapters';
import './App.css';

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

const PageRenderer = ({ currentLang }: { currentLang: 'en' | 'uk' }) => {
  const { '*': pathParam } = useParams();
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const fileKey = pathParam?.replace(/\.md$/, '') ?? '';

  // Нова сторінка відкривається з початку: на десктопі прокручується
  // .content-wrapper, і без цього лишалася позиція попередньої сторінки.
  // Посилання на заголовок чи результат пошуку прокручує MarkdownRenderer.
  useEffect(() => {
    if (location.hash || location.search) return;
    pageRef.current?.closest('.content-wrapper')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- лише при зміні сторінки
  }, [fileKey]);

  if (!pathParam) {
    return <HomePage currentLang={currentLang} />;
  }

  // Support links that carry .md or without .md
  const fileName = pathParam.endsWith('.md') ? pathParam : `${pathParam}.md`;
  const markdownPath = `${currentLang}/${fileName}`;

  // Find index in flattened files to determine previous/next
  const currentIndex = FLAT_FILES.findIndex(f => f.file === fileName);
  const nextFile = currentIndex !== -1 && currentIndex < FLAT_FILES.length - 1 ? FLAT_FILES[currentIndex + 1] : null;

  // Розділи ходів книги ведуть у коротку довідку — і навпаки.
  const isMovesChapter = currentLang === 'uk' && fileName.startsWith('3-Moves_');

  return (
    <div className="page-content" ref={pageRef}>
      {isMovesChapter && (
        <Link to="/uk/moves" className="moves-quick-link">
          ⚔️ Коротка довідка ходів →
        </Link>
      )}
      <MarkdownRenderer markdownPath={markdownPath} />
      
      {nextFile && (
        <div className="next-chapter-container">
          <Link 
            to={`/${currentLang}/${nextFile.file.replace('.md', '')}`} 
            className="next-chapter-btn"
            onClick={() => window.scrollTo(0, 0)}
          >
            <div className="btn-label">{currentLang === 'uk' ? 'Далі' : 'Next'}</div>
            <div className="btn-title">{pageTitle(nextFile.file, nextFile.prefix, currentLang)}</div>
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

        {isUk && (
          <div className="footer-section">
            <h3>📢 Офіційна локалізація</h3>
            <div className="disclaimer">
              <p>
                Наразі готується офіційна локалізація українською мовою від студії{' '}
                <a href="https://dense-forest-camp.itch.io/" target="_blank" rel="noopener noreferrer">
                  DENSE FOREST CAMP
                </a>
                .
              </p>
              <p>
                Ігровий набір «Залізна Присяга» вже доступний за посиланням:{' '}
                <a href="https://dense-forest-camp.itch.io/zalizna-prysiaha-playkit" target="_blank" rel="noopener noreferrer">
                  Zalizna Prysiaha Playkit
                </a>
                .
              </p>
            </div>
          </div>
        )}
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
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

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
            <Route path="character" element={<CharacterSheet currentLang={currentLang} />} />
            <Route path="moves" element={<MovesPage currentLang={currentLang} />} />
            <Route path="moves/:moveId" element={<MovesPage currentLang={currentLang} />} />
            <Route path="x/:extId/*" element={<ExtensionRoute currentLang={currentLang} />} />
            <Route path={EXTENSIONS_SETTINGS_PATH} element={<ExtensionsSettings currentLang={currentLang} />} />
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

  // Провайдер стоїть над роутером: кнопка входу живе в шапці, а вона
  // спільна для всіх сторінок.
  return (
    <AuthProvider>
      <ExtensionsProvider>
        <Router basename={basename}>
          <Routes>
            <Route path="/" element={<Navigate to="/uk" replace />} />
            <Route path="/:lang/*" element={<LayoutParamsWrapper />} />
          </Routes>
        </Router>
      </ExtensionsProvider>
    </AuthProvider>
  );
}

export default App;
