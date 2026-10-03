// Шпаргалка: усі ходи сіткою за категоріями. На десктопі — 3 колонки
// компактних карток; на телефоні й у друці кожна картка ще й з трьома
// результатами одним рядком. Друкований варіант — без посилань, на 2 аркуші
// A4 чорним по білому, з ромбами замість кольору.

import { Link, type To } from 'react-router-dom';
import type { Move } from '../../utils/moves';
import { CATEGORY_META, MOVE_CATEGORIES } from '../../utils/moves';
import { CategoryIcon, Diamonds, RollBadge } from './MoveBits';
import { OUTCOME_KEYS } from './outcomes';
import { outcomeSummary, plain } from './moveMarkup';

function OutcomeLines({ move }: { move: Move }) {
  if (!move.outcomes) {
    const first = move.lead.find((block): block is string => typeof block === 'string') ?? '';
    return <p className="cheat-card__body">{plain(first)}</p>;
  }
  const outcomes = move.outcomes;
  return (
    <ul className="cheat-card__outcomes">
      {OUTCOME_KEYS.map(key => (
        <li key={key} className={`cheat-card__outcome cheat-card__outcome--${key}`}>
          <Diamonds outcome={key} />
          <span>{outcomeSummary(outcomes[key])}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MoveCheatSheet({
  moves,
  selectedId,
  linkFor,
  linkState,
  print = false,
}: {
  moves: Move[];
  selectedId?: string;
  linkFor?: (move: Move) => To;
  linkState?: unknown;
  print?: boolean;
}) {
  return (
    <div className={print ? 'moves-print' : 'cheat-sheet'} aria-hidden={print ? 'true' : undefined}>
      {print && <h1 className="moves-print__title">Ходи «Залізної Присяги» — шпаргалка</h1>}
      {MOVE_CATEGORIES.map(category => {
        const inGroup = moves.filter(move => move.category === category);
        if (inGroup.length === 0) return null;
        return (
          <section key={category} className={`cheat-group cheat-group--${category}`}>
            <h3 className="cheat-group__title">
              {!print && <CategoryIcon category={category} />}
              {CATEGORY_META[category].title}
            </h3>
            {inGroup.map(move => {
              const head = (
                <>
                  <span className="cheat-card__row">
                    <span className="cheat-card__name">
                      {move.name}
                      {move.expedition && '*'}
                    </span>
                    <RollBadge move={move} />
                  </span>
                  <span className="cheat-card__trigger">{move.trigger}</span>
                </>
              );
              return (
                <div
                  key={move.id}
                  className={`cheat-card cheat-card--${move.category} ${
                    move.id === selectedId ? 'is-selected' : ''
                  }`}
                >
                  {linkFor && !print ? (
                    <Link to={linkFor(move)} state={linkState} className="cheat-card__link">
                      {head}
                    </Link>
                  ) : (
                    <div className="cheat-card__link">{head}</div>
                  )}
                  <OutcomeLines move={move} />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
