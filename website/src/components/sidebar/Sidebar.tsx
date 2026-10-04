// Бічне меню: глави книги й доповнення як однакові групи-акордеони
// (розгорнута та, де ви зараз), фільтр за назвами, підзаголовки відкритої
// сторінки з підсвіткою поточного і позначки вже переглянутих сторінок.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EXTENSIONS_SETTINGS_PATH } from '../../extensions/extensionsContext';
import { useExtensionNav } from '../../extensions/useExtensionNav';
import { CHAPTERS, pagePath, pageTitle, type Lang } from '../../utils/chapters';
import { useMediaQuery, WIDE_QUERY } from '../moves/useMediaQuery';
import { GROUPS_KEY, loadFlags, loadSet, save, VISITED_KEY } from './sidebarStorage';
import { usePageHeadings } from './usePageHeadings';
import './Sidebar.css';

const TEXT = {
  uk: {
    nav: 'Зміст книги',
    book: 'Книга правил',
    supplements: 'Доповнення',
    manage: 'Налаштувати доповнення',
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
    book: 'Rulebook',
    supplements: 'Supplements',
    manage: 'Manage supplements',
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
  /** Інструмент сайту (довідник, генератори) — не сторінка тексту. */
  tool?: boolean;
  /** Ключ позначки «переглянуто»; у книзі — ім'я файлу, як і раніше. */
  track?: string;
  /** `data-source` її Markdown — звідти беруться підзаголовки. */
  source?: string;
}

interface NavGroup {
  key: string;
  section: 'book' | 'ext';
  badge: string;
  title: string;
  items: NavItem[];
  /** Доповнень мало, тож вони розгорнуті, доки гравець не згорне сам. */
  defaultOpen: boolean;
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

function bookGroups(lang: Lang): NavGroup[] {
  return CHAPTERS.map(chapter => {
    const full = lang === 'uk' ? chapter.titleUk : chapter.titleEn;
    const m = /^(\d+)\.\s*(.+)$/.exec(full);
    return {
      key: chapter.prefix,
      section: 'book',
      badge: m ? m[1] : '',
      title: m ? m[2] : full,
      defaultOpen: false,
      items: [
        ...chapterTools(chapter.prefix, lang),
        ...chapter.files.map(file => ({
          key: file,
          to: pagePath(lang, file),
          title: pageTitle(file, chapter.prefix, lang),
          track: file,
          source: `${lang}/${file}`,
        })),
      ],
    };
  });
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
  const extensions = useExtensionNav(currentLang);

  const groups = useMemo<NavGroup[]>(
    () => [
      ...bookGroups(currentLang),
      ...extensions.map(ext => ({
        key: `x:${ext.id}`,
        section: 'ext' as const,
        badge: ext.title.charAt(0).toUpperCase(),
        title: ext.title,
        defaultOpen: true,
        items: ext.items.map(item => ({
          key: item.path,
          to: item.to,
          title: item.label,
          track: `x/${ext.id}/${item.path}`,
          source: item.to,
        })),
      })),
    ],
    [currentLang, extensions],
  );

  // Де ми зараз: сторінка тексту — точний збіг, інструмент — за префіксом.
  const here = location.pathname.replace(/\/$/, '').replace(/\.md$/, '');
  const isActive = (item: NavItem) => (item.tool ? here.startsWith(item.to) : here === item.to);
  const currentGroup = groups.find(g => g.items.some(isActive)) ?? null;
  const currentItem = currentGroup?.items.find(isActive) ?? null;
  const { headings, activeId } = usePageHeadings(currentItem?.source ?? null);

  const [filter, setFilter] = useState('');
  const query = normalize(filter);
  const filtering = query.length > 0;

  const [openFlags, setOpenFlags] = useState(() => loadFlags(GROUPS_KEY));
  const [visited, setVisited] = useState(() => loadSet(VISITED_KEY));
  const isExpanded = (group: NavGroup) => filtering || (openFlags[group.key] ?? group.defaultOpen);

  // Перехід на нову сторінку: її група розгортається, сторінка — «переглянута».
  // Каталог доповнень приходить асинхронно, тож стежимо за ключем, а не за маршрутом.
  const [seen, setSeen] = useState<string | null>(null);
  const seenKey = currentItem ? `${currentGroup!.key}|${currentItem.key}` : null;
  if (seenKey !== seen) {
    setSeen(seenKey);
    if (currentGroup && !(openFlags[currentGroup.key] ?? currentGroup.defaultOpen)) {
      setOpenFlags({ ...openFlags, [currentGroup.key]: true });
    }
    if (currentItem?.track && !visited.has(currentItem.track)) {
      setVisited(new Set(visited).add(currentItem.track));
    }
  }
  useEffect(() => save(GROUPS_KEY, openFlags), [openFlags]);
  useEffect(() => save(VISITED_KEY, visited), [visited]);

  const toggleGroup = (group: NavGroup) => {
    setOpenFlags(prev => ({ ...prev, [group.key]: !(prev[group.key] ?? group.defaultOpen) }));
  };

  // Збіг у назві групи показує її повністю.
  const shownItems = (group: NavGroup) =>
    !filtering || normalize(group.title).includes(query)
      ? group.items
      : group.items.filter(item => normalize(item.title).includes(query));
  const visibleGroups = groups
    .map(group => ({ group, shown: shownItems(group) }))
    .filter(({ shown }) => !filtering || shown.length > 0);
  const firstMatch = filtering ? visibleGroups[0]?.shown[0] : undefined;
  const hasExtensions = visibleGroups.some(({ group }) => group.section === 'ext');

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
  }, [seenKey, isOpen]);

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

  const leave = () => {
    setFilter('');
    onClose();
  };

  const renderGroup = (group: NavGroup, shown: NavItem[]) => {
    const expanded = isExpanded(group);
    const pages = group.items.filter(item => item.track);
    const seenCount = pages.filter(item => visited.has(item.track!)).length;
    const listId = `sb-${group.key.replace(/[^\w-]/g, '-')}`;

    return (
      <section
        key={group.key}
        className={`sb-chapter sb-chapter--${group.section} ${group === currentGroup ? 'is-current' : ''}`}
      >
        <button
          type="button"
          className="sb-chapter__toggle"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => toggleGroup(group)}
          disabled={filtering}
        >
          {group.badge && <span className="sb-chapter__num" aria-hidden="true">{group.badge}</span>}
          <span className="sb-chapter__name">{highlight(group.title, query)}</span>
          {seenCount > 0 && pages.length > 1 && (
            <span
              className={`sb-chapter__progress ${seenCount === pages.length ? 'is-done' : ''}`}
              title={t.progress(seenCount, pages.length)}
            >
              {seenCount === pages.length ? '✓' : `${seenCount}/${pages.length}`}
            </span>
          )}
          <span className="sb-chapter__chevron" aria-hidden="true" />
        </button>

        {expanded && (
          <ul id={listId} className="sb-pages">
            {shown.map(item => {
              const active = isActive(item);
              const showHeadings = active && !filtering && item.source && headings.length > 0;
              return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className={`sb-page ${item.tool ? 'sb-page--tool' : ''} ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={leave}
                  >
                    <span className="sb-page__title">{highlight(item.title, query)}</span>
                    {item.track && !active && visited.has(item.track) && (
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
                            onClick={() => {
                              document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              onClose();
                            }}
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
  };

  const bookShown = visibleGroups.filter(({ group }) => group.section === 'book');
  const extShown = visibleGroups.filter(({ group }) => group.section === 'ext');

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
                leave();
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
        {hasExtensions && bookShown.length > 0 && <h2 className="sb-section">{t.book}</h2>}
        {bookShown.map(({ group, shown }) => renderGroup(group, shown))}

        {extShown.length > 0 && (
          <>
            <h2 className="sb-section sb-section--ext">
              <span>{t.supplements}</span>
              <Link
                to={`/${currentLang}/${EXTENSIONS_SETTINGS_PATH}`}
                className="sb-section__manage"
                aria-label={t.manage}
                title={t.manage}
                onClick={leave}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 4h7M13 4h1M2 8h2M8 8h6M2 12h8M14 12h0" />
                  <circle cx="11" cy="4" r="1.6" />
                  <circle cx="6" cy="8" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                </svg>
              </Link>
            </h2>
            {extShown.map(({ group, shown }) => renderGroup(group, shown))}
          </>
        )}

        {filtering && !firstMatch && (
          <div className="sb-empty">
            <p>{t.empty}</p>
            <Link to={`/${currentLang}/search?q=${encodeURIComponent(filter.trim())}`} onClick={leave}>
              {t.fullSearch}
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
