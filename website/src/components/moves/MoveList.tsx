// Список ходів: компактні картки «назва + бейдж + тригер». Без запиту —
// групами за категоріями в порядку набору з липкими заголовками; із
// запитом — одним списком за рангом збігу.

import { Link, type To } from 'react-router-dom';
import type { Move } from '../../utils/moves';
import { CATEGORY_META, MOVE_CATEGORIES, OTHER_COMBAT_MOVES, getMove } from '../../utils/moves';
import type { MoveHit } from '../../utils/moves/search';
import { CategoryIcon, Highlight, RollBadge, StarButton } from './MoveBits';

export interface MoveCardProps {
  move: Move;
  stems: string[];
  via?: string;
  selected: boolean;
  favorite: boolean;
  to: To;
  replace: boolean;
  linkState?: unknown;
  onToggleFavorite: (id: string) => void;
  /** Префікс id елемента: картка «Моїх ходів» дублює картку в групі. */
  idPrefix?: string;
}

export function MoveCardCompact({
  move,
  stems,
  via,
  selected,
  favorite,
  to,
  replace,
  linkState,
  onToggleFavorite,
  idPrefix = 'move-card',
}: MoveCardProps) {
  return (
    <li
      id={`${idPrefix}-${move.id}`}
      className={`move-card move-card--${move.category} ${selected ? 'is-selected' : ''}`}
    >
      <Link
        to={to}
        replace={replace}
        state={linkState}
        className="move-card__link"
        aria-current={selected ? 'true' : undefined}
        data-move-id={move.id}
      >
        <span className="move-card__row">
          <span className="move-card__name">
            <Highlight text={move.name} stems={stems} />
            {move.expedition && <span className="move-card__star-mark">*</span>}
          </span>
          <RollBadge move={move} />
        </span>
        <span className="move-card__trigger">
          <Highlight text={move.trigger} stems={stems} />
        </span>
        {via && <span className="move-card__via">за запитом: {via}</span>}
      </Link>
      <StarButton move={move} active={favorite} onToggle={onToggleFavorite} />
    </li>
  );
}

function CombatHint({ linkFor, linkState }: { linkFor: (move: Move) => To; linkState?: unknown }) {
  return (
    <details className="combat-hint">
      <summary>Інші ходи у бою</summary>
      <ul>
        {OTHER_COMBAT_MOVES.map(entry => {
          const target = entry.moveId ? getMove(entry.moveId) : undefined;
          return (
            <li key={entry.label}>
              {target ? (
                <Link to={linkFor(target)} state={linkState}>
                  {entry.label}
                </Link>
              ) : (
                <strong>{entry.label}</strong>
              )}
              : {entry.when}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export interface MoveListProps {
  hits: MoveHit[];
  grouped: boolean;
  stems: string[];
  selectedId?: string;
  favorites: string[];
  /** Закріплені ходи групою «Мої ходи» зверху — лише в групованому вигляді. */
  showFavorites: boolean;
  linkFor: (move: Move) => To;
  replaceLinks: boolean;
  /** Стан історії для посилань — скільки кроків «Назад» закриває хід. */
  linkState?: unknown;
  onToggleFavorite: (id: string) => void;
}

export default function MoveList({
  hits,
  grouped,
  stems,
  selectedId,
  favorites,
  showFavorites,
  linkFor,
  replaceLinks,
  linkState,
  onToggleFavorite,
}: MoveListProps) {
  const card = (hit: MoveHit, idPrefix?: string) => (
    <MoveCardCompact
      key={hit.move.id}
      move={hit.move}
      stems={stems}
      via={hit.via}
      selected={hit.move.id === selectedId}
      favorite={favorites.includes(hit.move.id)}
      to={linkFor(hit.move)}
      replace={replaceLinks}
      linkState={linkState}
      onToggleFavorite={onToggleFavorite}
      idPrefix={idPrefix}
    />
  );

  if (!grouped) {
    return <ul className="move-list-cards move-list-cards--flat">{hits.map(hit => card(hit))}</ul>;
  }

  const visible = new Set(hits.map(hit => hit.move.id));
  const pinned = favorites
    .map(id => getMove(id))
    .filter((move): move is Move => move !== undefined && visible.has(move.id));

  return (
    <div className="move-groups">
      {showFavorites && (
        <section className="move-group move-group--favorites" aria-label="Мої ходи">
          <h3 className="move-group__title">
            <span className="move-group__star" aria-hidden="true">★</span>
            Мої ходи
          </h3>
          {pinned.length > 0 ? (
            <ul className="move-list-cards">{pinned.map(move => card({ move, score: 0 }, 'move-fav'))}</ul>
          ) : (
            <p className="move-group__empty">Позначте ☆ ходи, які часто використовуєте, — вони зʼявляться тут.</p>
          )}
        </section>
      )}
      {MOVE_CATEGORIES.map(category => {
        const inGroup = hits.filter(hit => hit.move.category === category);
        if (inGroup.length === 0) return null;
        return (
          <section
            key={category}
            id={`move-group-${category}`}
            className={`move-group move-group--${category}`}
            aria-label={CATEGORY_META[category].title}
          >
            <h3 className="move-group__title">
              <CategoryIcon category={category} />
              {CATEGORY_META[category].title}
              <span className="move-group__count">{inGroup.length}</span>
            </h3>
            {category === 'combat' && <CombatHint linkFor={linkFor} linkState={linkState} />}
            <ul className="move-list-cards">{inGroup.map(hit => card(hit))}</ul>
          </section>
        );
      })}
    </div>
  );
}
