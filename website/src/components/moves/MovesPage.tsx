// Сторінка «Довідник ходів» (/uk/moves, /uk/moves/:moveId).
//
// Відповідає на одне питання за 5 секунд: «що я зараз роблю і що кидати?».
// Десктоп — дві панелі: список із пошуком і повна картка. Телефон — одна
// колонка і повноекранна шторка ходу, яку закриває системна «Назад».
//
// Увесь стан, яким можна поділитись, — у URL: хід у шляху, а запит,
// категорія, стат, «основні» й вигляд — у параметрах.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams, type To } from 'react-router-dom';
import type { AttrKey } from '../../utils/character/types';
import type { Move, MoveCategory } from '../../utils/moves';
import { FALLBACK_MOVE_IDS, FREQUENT_MOVE_IDS, MOVES, MOVE_CATEGORIES, getMove } from '../../utils/moves';
import { queryStems, searchMoves } from '../../utils/moves/search';
import MoveSearchBar from './MoveSearchBar';
import MoveList from './MoveList';
import MoveDetail, { RollPrimer } from './MoveDetail';
import MoveCheatSheet from './MoveCheatSheet';
import MoveTrainer from './MoveTrainer';
import { CategoryIcon } from './MoveBits';
import { useFavorites, useRecent } from './useMovesStorage';
import { WIDE_QUERY, useMediaQuery } from './useMediaQuery';
import './MovesPage.css';

type View = 'list' | 'sheet' | 'train';

const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'Список' },
  { id: 'sheet', label: 'Шпаргалка' },
  { id: 'train', label: 'Тренування' },
];

const ATTRS: readonly string[] = ['edge', 'heart', 'iron', 'shadow', 'wits'];

/**
 * Скільки записів історії відкрито поверх списку: «Назад» у шторці
 * повертається на стільки кроків, щоб закриття не лишало хвіст ходів.
 */
interface NavState {
  depth?: number;
  backTo?: string;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

function KeyboardHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['/', 'фокус у пошук'],
    ['↑ ↓', 'попередній / наступний хід у списку'],
    ['Enter', 'з пошуку — відкрити перший збіг'],
    ['Esc', 'очистити пошук → закрити хід'],
    ['F', 'закріпити поточний хід ★'],
    ['?', 'ця підказка'],
  ];
  return (
    <div className="moves-help-backdrop" onClick={onClose}>
      <div
        className="moves-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moves-help-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="moves-help-title">Клавіатурні скорочення</h2>
        <table className="moves-help__table">
          <tbody>
            {rows.map(([key, action]) => (
              <tr key={key}>
                <td>
                  <kbd>{key}</kbd>
                </td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onClose} autoFocus>
          Зрозуміло
        </button>
      </div>
    </div>
  );
}

function MovesPageInner() {
  const { moveId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = useMemo(() => (location.state ?? {}) as NavState, [location.state]);
  const isWide = useMediaQuery(WIDE_QUERY);
  const searchRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [barHidden, setBarHidden] = useState(false);

  const { favorites, toggleFavorite } = useFavorites();
  const { recent, pushRecent } = useRecent();

  const query = params.get('q') ?? '';
  const rawCat = params.get('cat');
  const category = (MOVE_CATEGORIES as readonly string[]).includes(rawCat ?? '') ? (rawCat as MoveCategory) : null;
  const rawStat = params.get('stat');
  const stat = ATTRS.includes(rawStat ?? '') ? (rawStat as AttrKey) : null;
  const coreOnly = params.get('core') === '1';
  const rawView = params.get('view');
  const view: View = rawView === 'sheet' || rawView === 'train' ? rawView : 'list';

  const move = getMove(moveId);
  const stems = useMemo(() => queryStems(query), [query]);
  const grouped = stems.length === 0;

  // На десктопі в групованому списку категорія прокручує до групи, а не
  // ховає інші — так зберігається контекст. В інших випадках фільтрує.
  const filterByCategory = !isWide || !grouped || view === 'sheet';
  const hits = useMemo(
    () => searchMoves(query, { category: filterByCategory ? category : null, stat, coreOnly }),
    [query, filterByCategory, category, stat, coreOnly],
  );
  const order = hits.map(hit => hit.move);

  const base = '/uk/moves';
  const search = location.search;

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true, state: location.state },
      );
    },
    [setParams, location.state],
  );

  const linkFor = useCallback((target: Move): To => ({ pathname: `${base}/${target.id}`, search }), [search]);

  // Відкриття зі списку: на десктопі вибір у панелі не засмічує історію,
  // на телефоні — новий запис, щоб «Назад» закривав шторку.
  const listLinkState = useMemo<NavState>(
    () => (isWide && move ? navState : { depth: (navState.depth ?? 0) + (move ? 0 : 1) }),
    [isWide, move, navState],
  );

  const openMove = useCallback(
    (target: Move) => {
      navigate(linkFor(target), {
        state: { depth: (navState.depth ?? 0) + 1, backTo: move?.id } satisfies NavState,
      });
    },
    [navigate, linkFor, navState.depth, move?.id],
  );

  const selectMove = useCallback(
    (target: Move) => {
      navigate(linkFor(target), { replace: true, state: location.state });
      document.getElementById(`move-card-${target.id}`)?.scrollIntoView?.({ block: 'nearest' });
    },
    [navigate, linkFor, location.state],
  );

  const closeMove = useCallback(() => {
    const depth = navState.depth ?? 0;
    if (depth > 0) navigate(-depth);
    else navigate({ pathname: base, search }, { replace: true });
  }, [navigate, navState.depth, search]);

  // Нещодавні — останні 5 відкритих ходів.
  useEffect(() => {
    if (move) pushRecent(move.id);
  }, [move, pushRecent]);

  useEffect(() => {
    const previous = document.title;
    document.title = move ? `${move.name} — Довідник ходів` : 'Довідник ходів — Ironsworn';
    return () => {
      document.title = previous;
    };
  }, [move]);

  // Шторка на телефоні: сторінка під нею не прокручується, фокус — у шторці.
  const sheetOpen = Boolean(move) && !isWide;
  useEffect(() => {
    if (!sheetOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('.move-sheet__back, .move-sheet__close')?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [sheetOpen, move?.id]);

  // Під час прокрутки вниз смуга пошуку ховається, вгору — повертається.
  useEffect(() => {
    if (isWide) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last + 4 && y > 160) setBarHidden(true);
      else if (y < last - 4) setBarHidden(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isWide]);

  // На десктопі категорія в групованому списку — прокрутка до групи.
  useEffect(() => {
    if (!isWide || filterByCategory || !category) return;
    document.getElementById(`move-group-${category}`)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [isWide, filterByCategory, category]);

  const step = useCallback(
    (delta: number) => {
      if (order.length === 0) return;
      const index = move ? order.findIndex(other => other.id === move.id) : -1;
      const next = index === -1 ? (delta > 0 ? 0 : order.length - 1) : index + delta;
      if (next < 0 || next >= order.length) return;
      selectMove(order[next]);
    },
    [order, move, selectMove],
  );

  const openFirst = useCallback(() => {
    if (order[0]) {
      navigate(linkFor(order[0]), { state: listLinkState });
      searchRef.current?.blur();
    }
  }, [order, navigate, linkFor, listLinkState]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const typing = isTyping(event.target);
      const inSearch = event.target === searchRef.current;

      if (event.key === 'Escape') {
        if (helpOpen) setHelpOpen(false);
        else if (inSearch && query) setParam('q', null);
        else if (inSearch) searchRef.current?.blur();
        else if (move && (!isWide || view === 'sheet')) closeMove();
        else return;
        event.preventDefault();
        return;
      }
      if (typing && !inSearch) return;

      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && view === 'list' && (inSearch || !typing)) {
        if (!isWide && !inSearch) return; // на телефоні стрілки лишаються прокрутці
        event.preventDefault();
        step(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (typing) return;

      if (event.key === '/' || (event.code === 'Slash' && !event.shiftKey)) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === '?' || (event.code === 'Slash' && event.shiftKey)) {
        event.preventDefault();
        setHelpOpen(open => !open);
      } else if (event.code === 'KeyF' && move) {
        event.preventDefault();
        toggleFavorite(move.id);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [helpOpen, query, move, isWide, view, setParam, closeMove, step, toggleFavorite]);

  /** Пастка фокусу в шторці: Tab ходить по колу всередині. */
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !sheetRef.current) return;
    const focusable = [
      ...sheetRef.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
    ].filter(element => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const swipe = useRef<{ x: number; y: number } | null>(null);

  const detailFor = (target: Move, floatingSwitcher: boolean) => (
    <MoveDetail
      move={target}
      favorite={favorites.includes(target.id)}
      onToggleFavorite={toggleFavorite}
      onOpen={openMove}
      floatingSwitcher={floatingSwitcher}
      bookBase="/uk"
    />
  );

  const notFound = moveId !== undefined && !move && (
    <div className="move-not-found">
      <p>Ходу «{moveId}» немає в довіднику.</p>
      <Link to={{ pathname: base, search }}>← До списку ходів</Link>
    </div>
  );

  const backTarget = navState.backTo ? getMove(navState.backTo) : undefined;
  const index = move ? order.findIndex(other => other.id === move.id) : -1;

  const emptyResult = hits.length === 0 && (
    <div className="moves-empty">
      <p>Не знайшли такого ходу.</p>
      <p>
        Не знаєте, що робити?{' '}
        {FALLBACK_MOVE_IDS.map((id, i) => {
          const fallback = getMove(id)!;
          return (
            <span key={id}>
              {i > 0 && ' або '}
              <Link to={linkFor(fallback)} state={listLinkState}>
                {fallback.name}
              </Link>
            </span>
          );
        })}
        .
      </p>
    </div>
  );

  const recentMoves = recent.map(id => getMove(id)).filter((m): m is Move => m !== undefined);

  const listPane = (
    <>
      <MoveSearchBar
        ref={searchRef}
        query={query}
        onQuery={value => setParam('q', value)}
        onSubmit={openFirst}
        category={category}
        onCategory={value => setParam('cat', value)}
        stat={stat}
        onStat={value => setParam('stat', value)}
        coreOnly={coreOnly}
        onCoreOnly={value => setParam('core', value ? '1' : null)}
        compact={!isWide}
        hidden={barHidden}
      />
      <p className="moves-sr-only" aria-live="polite">
        {grouped && !stat && !coreOnly && !(filterByCategory && category) ? '' : `Знайдено ходів: ${hits.length}`}
      </p>
      {grouped && recentMoves.length > 0 && view === 'list' && (
        <div className="recent-row">
          <span className="recent-row__label">Нещодавні:</span>
          {recentMoves.map(other => (
            <Link key={other.id} to={linkFor(other)} state={listLinkState} className="recent-chip">
              <CategoryIcon category={other.category} size={14} />
              {other.name}
            </Link>
          ))}
        </div>
      )}
    </>
  );

  const list = emptyResult || (
    <MoveList
      hits={hits}
      grouped={grouped}
      stems={stems}
      selectedId={move?.id}
      favorites={favorites}
      showFavorites={grouped && favorites.length > 0}
      linkFor={linkFor}
      replaceLinks={isWide && Boolean(move)}
      linkState={listLinkState}
      onToggleFavorite={toggleFavorite}
    />
  );

  const viewSwitch = (
    <div className="view-switch" role="group" aria-label="Вигляд">
      {VIEWS.map(option => (
        <button
          key={option.id}
          type="button"
          className={`view-switch__btn ${view === option.id ? 'is-active' : ''}`}
          aria-pressed={view === option.id}
          onClick={() => setParam('view', option.id === 'list' ? null : option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const header = (
    <header className="moves-header">
      <div>
        <h1 className="moves-header__title">Довідник ходів</h1>
        <p className="moves-header__subtitle">
          36 ходів грального набору · <Link to="/uk/3-Moves_1-Making-Moves">правила ходів у книзі</Link>
        </p>
      </div>
      {viewSwitch}
    </header>
  );

  // Шторка ходу на телефоні — і для списку, і для шпаргалки.
  const mobileSheet = sheetOpen && move && (
    <div
      ref={sheetRef}
      className={`move-sheet move-sheet--${move.category}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`move-title-${move.id}`}
      onKeyDown={trapFocus}
    >
      <div
        className="move-sheet__bar"
        onTouchStart={event => {
          const touch = event.touches[0];
          swipe.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={event => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const touch = event.changedTouches[0];
          if (touch.clientY - start.y > 80 && Math.abs(touch.clientX - start.x) < 60) closeMove();
        }}
      >
        {backTarget ? (
          <button type="button" className="move-sheet__back" onClick={() => navigate(-1)}>
            ← Назад до {backTarget.name}
          </button>
        ) : (
          <button type="button" className="move-sheet__close" onClick={closeMove} aria-label="Закрити хід">
            ←
          </button>
        )}
        <span className="move-sheet__grip" aria-hidden="true" />
        <div className="move-sheet__nav">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index <= 0}
            aria-label="Попередній хід"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={index === -1 || index >= order.length - 1}
            aria-label="Наступний хід"
          >
            ›
          </button>
        </div>
      </div>
      <div className="move-sheet__scroll">{detailFor(move, true)}</div>
    </div>
  );

  const frequent = FREQUENT_MOVE_IDS.map(id => getMove(id)!);

  return (
    <div className={`moves-page moves-page--${view} ${isWide ? 'moves-page--wide' : 'moves-page--narrow'}`}>
      {view === 'train' ? (
        <div className="moves-single">
          {header}
          <MoveTrainer />
        </div>
      ) : view === 'sheet' ? (
        <div className="moves-single">
          {header}
          {listPane}
          {emptyResult || (
            <MoveCheatSheet moves={order} selectedId={move?.id} linkFor={linkFor} linkState={listLinkState} />
          )}
          {isWide && (move || notFound) && (
            <aside className="move-drawer" aria-label="Хід">
              <button type="button" className="move-drawer__close" onClick={closeMove} aria-label="Закрити хід">
                ×
              </button>
              {move ? detailFor(move, false) : notFound}
            </aside>
          )}
        </div>
      ) : isWide ? (
        <div className="moves-split">
          {header}
          <div className="moves-list-pane">
            {listPane}
            <div className="moves-list-scroll">{list}</div>
          </div>
          <main className="moves-detail-pane">
            {move ? detailFor(move, false) : notFound || <RollPrimer frequent={frequent} onOpen={openMove} />}
          </main>
        </div>
      ) : (
        <div className="moves-single">
          {header}
          {listPane}
          {notFound}
          {list}
        </div>
      )}
      {mobileSheet}
      {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
      <MoveCheatSheet moves={MOVES} print />
    </div>
  );
}

/** Довідник існує лише українською, як і аркуш персонажа. */
const MovesPage = ({ currentLang }: { currentLang: string }) => {
  const location = useLocation();
  if (currentLang !== 'uk') {
    return <Navigate to={location.pathname.replace(/^\/en/, '/uk') + location.search} replace />;
  }
  return <MovesPageInner />;
};

export default MovesPage;
