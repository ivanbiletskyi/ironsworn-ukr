// Бічне меню книги: глави-акордеони (розгорнута та, де ви зараз), фільтр за
// назвами розділів, підзаголовки відкритої сторінки з підсвіткою поточного
// і позначки вже переглянутих сторінок.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ExtensionsNav from '../../extensions/ExtensionsNav';
import { CHAPTERS, fileFromPath, pagePath, pageTitle, type Lang } from '../../utils/chapters';
import { useMediaQuery, WIDE_QUERY } from '../moves/useMediaQuery';
import { loadSet, OPEN_CHAPTERS_KEY, saveSet, VISITED_KEY } from './sidebarStorage';
import { usePageHeadings } from './usePageHeadings';
import './Sidebar.css';

const TEXT = {
  uk: {
    nav: 'Зміст книги',
    filter: 'Фільтр розділів…',
    clear: 'Очистити фільтр',
    close: 'Закрити меню',
    empty: 'Серед назв розділів нічого немає.',
    fullSearch: 'Шукати в тексті книги →',
    visited: 'переглянуто',
    progress: (seen: number, total: number) => `Переглянуто ${seen} з ${total}`,
  },
  en: {
    nav: 'Book contents',
    filter: 'Filter sections…',
    clear: 'Clear filter',
    close: 'Close menu',
    empty: 'No section titles match.',
    fullSearch: 'Search the book text →',
    visited: 'visited',
    progress: (seen: number, total: number) => `Visited ${seen} of ${total}`,
  },
} as const;

interface NavItem {
  key: string;
  to: string;
  title: string;
  file?: string;
  tool?: boolean;
}

// Інструменти сайту, що стосуються глави, — першими в її списку.
function chapterTools(prefix: string, lang: Lang): NavItem[] {
  if (prefix === '3-Moves' && lang === 'uk') {
    return [{ key: 'moves', to: '/uk/moves', title: '⚔️ Довідник ходів', tool: true }];
  }
  if (prefix === '6-Oracles') {
    const title = lang === 'uk' ? '🎲 Генератори оракулів' : '🎲 Oracle Generators';
    return [{ key: 'oracles', to: `/${lang}/oracles`, title, tool: true }];
  }
  return [];
}

const normalize = (s: string) => s.toLowerCase().replace(/[’ʼ`]/g, "'").trim();

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const at = normalize(text).indexOf(query);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

function splitChapterTitle(title: string): { num: string; name: string } {
  const m = /^(\d+)\.\s*(.+)$/.exec(title);
  return m ? { num: m[1], name: m[2] } : { num: '', name: title };
}

interface SidebarProps {
  currentLang: Lang;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ currentLang, isOpen, onClose }: SidebarProps) => {
  const t = TEXT[currentLang];
  const location = useLocation();
  const navigate = useNavigate();
  const isWide = useMediaQuery(WIDE_QUERY);
  const asideRef = useRef<HTMLElement>(null);

  const currentFile = fileFromPath(location.pathname, currentLang);
  const currentChapter = currentFile ? CHAPTERS.find(c => currentFile.startsWith(`${c.prefix}_`))?.prefix ?? null : null;
  const { headings, activeId } = usePageHeadings(currentFile ? `${currentLang}/${currentFile}` : null);

  const [filter, setFilter] = useState('');
  const query = normalize(filter);

  // Розгорнуті глави пам'ятаємо; глава відкритої сторінки розгортається сама.
  const [openChapters, setOpenChapters] = useState(() => {
    const stored = loadSet(OPEN_CHAPTERS_KEY);
    if (currentChapter) stored.add(currentChapter);
    return stored;
  });
  const [visited, setVisited] = useState(() => {
    const stored = loadSet(VISITED_KEY);
    if (currentFile) stored.add(currentFile);
    return stored;
  });
  const [seenFile, setSeenFile] = useState(currentFile);
  if (currentFile !== seenFile) {
    setSeenFile(currentFile);
    if (currentFile && !visited.has(currentFile)) setVisited(new Set(visited).add(currentFile));
    if (currentChapter && !openChapters.has(currentChapter)) setOpenChapters(new Set(openChapters).add(currentChapter));
  }
  useEffect(() => saveSet(OPEN_CHAPTERS_KEY, openChapters), [openChapters]);
  useEffect(() => saveSet(VISITED_KEY, visited), [visited]);

  const toggleChapter = (prefix: string) => {
    setOpenChapters(prev => {
      const next = new Set(prev);
      if (!next.delete(prefix)) next.add(prefix);
      return next;
    });
  };

  const chapters = useMemo(
    () =>
      CHAPTERS.map(chapter => {
        const title = currentLang === 'uk' ? chapter.titleUk : chapter.titleEn;
        const items: NavItem[] = [
          ...chapterTools(chapter.prefix, currentLang),
          ...chapter.files.map(file => ({
            key: file,
            file,
            to: pagePath(currentLang, file),
            title: pageTitle(file, chapter.prefix, currentLang),
          })),
        ];
        // Збіг у назві глави показує її повністю.
        const shown = !query || normalize(title).includes(query)
          ? items
          : items.filter(item => normalize(item.title).includes(query));
        return { chapter, title, items, shown };
      }),
    [currentLang, query],
  );
  const filtering = query.length > 0;
  const firstMatch = filtering ? chapters.flatMap(c => c.shown)[0] : undefined;

  // Активний пункт — у полі зору меню (лише прокрутка самого меню, без зсуву сторінки).
  useEffect(() => {
    const aside = asideRef.current;
    const active = aside?.querySelector<HTMLElement>('.sb-page.active');
    if (!aside || !active) return;
    const a = active.getBoundingClientRect();
    const s = aside.getBoundingClientRect();
    if (a.top < s.top + 80 || a.bottom > s.bottom) {
      aside.scrollTop += a.top - s.top - s.height / 3;
    }
  }, [currentFile, isOpen]);

  // Мобільна шухляда: Escape закриває, сторінка під нею не прокручується.
  const drawerOpen = isOpen && !isWide;
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Фокус на саму шухляду, щоб клавіатура й скрінрідер опинились у меню.
    asideRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen, onClose]);

  const jumpToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onClose();
  };

  return (
    <aside ref={asideRef} className={`sidebar ${isOpen ? 'open' : ''}`} aria-label={t.nav} tabIndex={-1}>
      <div className="sb-top">
        <div className="sb-filter">
          <svg className="sb-filter__icon" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.75" />
            <path d="M10.5 10.5 14 14" />
          </svg>
          <input
            type="text"
            className="sb-filter__input"
            value={filter}
            placeholder={t.filter}
            aria-label={t.filter}
            onChange={e => setFilter(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape' && filter) {
                e.stopPropagation();
                setFilter('');
              } else if (e.key === 'Enter' && firstMatch) {
                navigate(firstMatch.to);
                setFilter('');
                onClose();
              }
            }}
          />
          {filter && (
            <button type="button" className="sb-filter__clear" aria-label={t.clear} onClick={() => setFilter('')}>
              ×
            </button>
          )}
        </div>
        <button type="button" className="close-sidebar" aria-label={t.close} onClick={onClose}>
          ×
        </button>
      </div>

      <nav className="sb-chapters">
        {chapters.map(({ chapter, title, items, shown }) => {
          if (filtering && shown.length === 0) return null;
          const expanded = filtering || openChapters.has(chapter.prefix);
          const { num, name } = splitChapterTitle(title);
          const pages = items.filter(item => item.file);
          const seen = pages.filter(item => visited.has(item.file!)).length;
          const listId = `sb-${chapter.prefix}`;

          return (
            <section
              key={chapter.prefix}
              className={`sb-chapter ${chapter.prefix === currentChapter ? 'is-current' : ''}`}
            >
              <button
                type="button"
                className="sb-chapter__toggle"
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => toggleChapter(chapter.prefix)}
                disabled={filtering}
              >
                {num && <span className="sb-chapter__num">{num}</span>}
                <span className="sb-chapter__name">{highlight(name, query)}</span>
                {seen > 0 && (
                  <span
                    className={`sb-chapter__progress ${seen === pages.length ? 'is-done' : ''}`}
                    title={t.progress(seen, pages.length)}
                  >
                    {seen === pages.length ? '✓' : `${seen}/${pages.length}`}
                  </span>
                )}
                <span className="sb-chapter__chevron" aria-hidden="true" />
              </button>

              {expanded && (
                <ul id={listId} className="sb-pages">
                  {shown.map(item => {
                    const active = item.file
                      ? item.file === currentFile
                      : location.pathname.startsWith(item.to);
                    const showHeadings = active && !filtering && item.file && headings.length > 0;
                    return (
                      <li key={item.key}>
                        <Link
                          to={item.to}
                          className={`sb-page ${item.tool ? 'sb-page--tool' : ''} ${active ? 'active' : ''}`}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => {
                            setFilter('');
                            onClose();
                          }}
                        >
                          <span className="sb-page__title">{highlight(item.title, query)}</span>
                          {item.file && !active && visited.has(item.file) && (
                            <span className="sb-page__visited" title={t.visited} aria-label={t.visited}>
                              ✓
                            </span>
                          )}
                        </Link>
                        {showHeadings && (
                          <ul className="sb-headings">
                            {headings.map(h => (
                              <li key={h.id}>
                                <Link
                                  to={`${location.pathname}#${h.id}`}
                                  replace
                                  className={h.id === activeId ? 'active' : ''}
                                  onClick={() => jumpToHeading(h.id)}
                                >
                                  {h.text}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        {filtering && !firstMatch && (
          <div className="sb-empty">
            <p>{t.empty}</p>
            <Link
              to={`/${currentLang}/search?q=${encodeURIComponent(filter.trim())}`}
              onClick={() => {
                setFilter('');
                onClose();
              }}
            >
              {t.fullSearch}
            </Link>
          </div>
        )}
      </nav>

      {!filtering && <ExtensionsNav currentLang={currentLang} onNavigate={onClose} />}
    </aside>
  );
};

export default Sidebar;
