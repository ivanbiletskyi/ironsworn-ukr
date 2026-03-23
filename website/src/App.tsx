import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import MarkdownRenderer from './components/MarkdownRenderer';
import './App.css';

// Groups of chapters to show on the Home Page and Sidebar
// Hardcoded structure based on the md files provided.
const CHAPTERS = [
  {
    prefix: '1-Basics',
    titleEn: '1. Basics',
    titleUk: '1. Основи',
    files: [
      '1-Basics_1-Playing-Ironsworn.md',
      '1-Basics_2-Moves.md',
      '1-Basics_3-The-Action-Roll.md',
      '1-Basics_4-Momentum.md',
      '1-Basics_5-Progress-Tracks.md',
      '1-Basics_6-Harm.md',
      '1-Basics_7-Stress.md',
      '1-Basics_8-Assets.md',
      '1-Basics_9-Oracles.md',
      '1-Basics_10-Bonds.md',
      '1-Basics_11-Other-Characters.md',
      '1-Basics_12-Equipment.md',
      '1-Basics_13-The-Flow-of-Play.md',
      '1-Basics_14-Whats-Next.md',
    ]
  },
  {
    prefix: '2-Your-Character',
    titleEn: '2. Your Character',
    titleUk: '2. Ваш Персонаж',
    files: [
      '2-Your-Character_1-You-Are-Ironsworn.md',
      '2-Your-Character_2-Character-Basics.md',
      '2-Your-Character_3-Vows.md',
      '2-Your-Character_4-Bonds.md',
      '2-Your-Character_5-Debilities.md',
      '2-Your-Character_6-Assets.md',
      '2-Your-Character_7-Experience.md',
      '2-Your-Character_8-Equipment.md',
      '2-Your-Character_9-Becoming-Ironsworn.md',
      '2-Your-Character_10-Character-Creation-Summary.md',
    ]
  },
  {
    prefix: '3-Moves',
    titleEn: '3. Moves',
    titleUk: '3. Ходи',
    files: [
      '3-Moves_1-Making-Moves.md',
      '3-Moves_2-Adventure-Moves.md',
      '3-Moves_3-Relationship-Moves.md',
      '3-Moves_4-Combat-Moves.md',
      '3-Moves_5-Suffer-Moves.md',
      '3-Moves_6-Quest-Moves.md',
      '3-Moves_7-Fate-Moves.md',
    ]
  },
  {
    prefix: '4-Your-World',
    titleEn: '4. Your World',
    titleUk: '4. Ваш Світ',
    files: [
      '4-Your-World_1-Welcome-to-the-Ironlands.md',
      '4-Your-World_2-Regions-of-the-Ironlands.md',
      '4-Your-World_3-Your-Truths.md',
      '4-Your-World_4-Mapping-Your-Journeys.md',
    ]
  },
  {
    prefix: '5-Foes-and-Encounters',
    titleEn: '5. Foes and Encounters',
    titleUk: '5. Вороги та Зустрічі',
    files: [
      '5-Foes-and-Encounters_1-NPCs-in-the-Ironlands.md',
      '5-Foes-and-Encounters_2-Ironlanders.md',
      '5-Foes-and-Encounters_3-Firstborn.md',
      '5-Foes-and-Encounters_4-Animals.md',
      '5-Foes-and-Encounters_5-Beasts.md',
      '5-Foes-and-Encounters_6-Horrors.md',
    ]
  },
  {
    prefix: '6-Oracles',
    titleEn: '6. Oracles',
    titleUk: '6. Оракули',
    files: [
      '6-Oracles_1-Seeking-Inspiration.md',
      '6-Oracles_2-Ironland-Oracles.md',
      '6-Oracles_3-More-Oracles.md',
    ]
  },
  {
    prefix: '7-Gameplay',
    titleEn: '7. Gameplay',
    titleUk: '7. Ігровий Процес',
    files: [
      '7-Gameplay_1-Starting-Your-Campaign.md',
      '7-Gameplay_2-The-Mechanics-and-the-Fiction.md',
      '7-Gameplay_3-Managing-Your-Quests.md',
      '7-Gameplay_4-Principles.md',
      '7-Gameplay_5-Gameplay-Options.md',
      '7-Gameplay_6-Hacking-Ironsworn.md',
      '7-Gameplay_7-Extended-Example-of-Play.md',
    ]
  }
];

const UK_TITLES: Record<string, string> = {
  '1-Basics_1-Playing-Ironsworn.md': 'Гра в Ironsworn',
  '1-Basics_2-Moves.md': 'Ходи',
  '1-Basics_3-The-Action-Roll.md': 'Кидок дії',
  '1-Basics_4-Momentum.md': 'Імпульс',
  '1-Basics_5-Progress-Tracks.md': 'Шкали прогресу',
  '1-Basics_6-Harm.md': 'Шкода',
  '1-Basics_7-Stress.md': 'Стрес',
  '1-Basics_8-Assets.md': 'Активи',
  '1-Basics_9-Oracles.md': 'Оракули',
  '1-Basics_10-Bonds.md': 'Стосунки',
  '1-Basics_11-Other-Characters.md': 'Інші персонажі',
  '1-Basics_12-Equipment.md': 'Спорядження',
  '1-Basics_13-The-Flow-of-Play.md': 'Процес гри',
  '1-Basics_14-Whats-Next.md': 'Що далі',
  '2-Your-Character_1-You-Are-Ironsworn.md': 'Ви — Ironsworn',
  '2-Your-Character_2-Character-Basics.md': 'Основи персонажа',
  '2-Your-Character_3-Vows.md': 'Присяги',
  '2-Your-Character_4-Bonds.md': 'Стосунки',
  '2-Your-Character_5-Debilities.md': 'Слабкості',
  '2-Your-Character_6-Assets.md': 'Активи',
  '2-Your-Character_7-Experience.md': 'Досвід',
  '2-Your-Character_8-Equipment.md': 'Спорядження',
  '2-Your-Character_9-Becoming-Ironsworn.md': 'Становлення як Ironsworn',
  '2-Your-Character_10-Character-Creation-Summary.md': 'Коротко про створення',
  '3-Moves_1-Making-Moves.md': 'Виконання ходів',
  '3-Moves_2-Adventure-Moves.md': 'Ходи подорожі',
  '3-Moves_3-Relationship-Moves.md': 'Ходи стосунків',
  '3-Moves_4-Combat-Moves.md': 'Бойові ходи',
  '3-Moves_5-Suffer-Moves.md': 'Ходи страждань',
  '3-Moves_6-Quest-Moves.md': 'Ходи квесту',
  '3-Moves_7-Fate-Moves.md': 'Ходи долі',
  '4-Your-World_1-Welcome-to-the-Ironlands.md': 'Залізні землі',
  '4-Your-World_2-Regions-of-the-Ironlands.md': 'Регіони Залізних земель',
  '4-Your-World_3-Your-Truths.md': 'Ваші істини',
  '4-Your-World_4-Mapping-Your-Journeys.md': 'Картографування подорожей',
  '5-Foes-and-Encounters_1-NPCs-in-the-Ironlands.md': 'НПС у Залізних землях',
  '5-Foes-and-Encounters_2-Ironlanders.md': 'Залізоземці',
  '5-Foes-and-Encounters_3-Firstborn.md': 'Первородні',
  '5-Foes-and-Encounters_4-Animals.md': 'Тварини',
  '5-Foes-and-Encounters_5-Beasts.md': 'Звірі',
  '5-Foes-and-Encounters_6-Horrors.md': 'Жахи',
  '6-Oracles_1-Seeking-Inspiration.md': 'Пошук натхнення',
  '6-Oracles_2-Ironland-Oracles.md': 'Оракули Залізних земель',
  '6-Oracles_3-More-Oracles.md': 'Більше оракулів',
  '7-Gameplay_1-Starting-Your-Campaign.md': 'Початок кампанії',
  '7-Gameplay_2-The-Mechanics-and-the-Fiction.md': 'Механіка та фікшен',
  '7-Gameplay_3-Managing-Your-Quests.md': 'Керування присягами',
  '7-Gameplay_4-Principles.md': 'Принципи',
  '7-Gameplay_5-Gameplay-Options.md': 'Опції гри',
  '7-Gameplay_6-Hacking-Ironsworn.md': 'Модифікація Ironsworn',
  '7-Gameplay_7-Extended-Example-of-Play.md': 'Розширений приклад гри',
};

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
  const validLangs = ['en', 'uk'];
  const currentLang = validLangs.includes(lang || '') ? lang! : 'uk';

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
          <PageRenderer currentLang={currentLang} />
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
