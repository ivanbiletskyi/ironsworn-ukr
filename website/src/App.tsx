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

const Sidebar = ({ currentLang }: { currentLang: string }) => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {CHAPTERS.map(chapter => (
        <div key={chapter.prefix}>
          <h3>{currentLang === 'uk' ? chapter.titleUk : chapter.titleEn}</h3>
          <ul>
            {chapter.files.map(file => {
              // Create readable link name from filename, e.g., "1-Basics_1-Playing-Ironsworn.md" -> "Playing Ironsworn"
              const linkName = file.replace(`${chapter.prefix}_`, '').replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' ');
              const fullPath = `/${currentLang}/${file.replace('.md', '')}`;
              const isActive = location.pathname === fullPath || location.pathname === `${fullPath}.md` || location.pathname === fullPath + '/';
              
              return (
                <li key={file}>
                  <Link to={fullPath} className={isActive ? 'active' : ''}>
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

  return (
    <div className="page-content">
      <MarkdownRenderer markdownPath={markdownPath} />
    </div>
  );
};

const LayoutParamsWrapper = () => {
  const { lang } = useParams();
  
  // Valid languages check
  const validLangs = ['en', 'uk'];
  const currentLang = validLangs.includes(lang || '') ? lang! : 'uk';

  return (
    <div className="app">
      <Navigation currentLang={currentLang} />
      <div className="main-content">
        {currentLang && <Sidebar currentLang={currentLang} />}
        <PageRenderer currentLang={currentLang} />
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
