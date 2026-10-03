// Повна картка ходу: шапка, «Коли», «Кидайте», три смуги результатів,
// спільні варіанти, повʼязані ходи й посилання на книгу.
//
// Смуги однакові в усіх 36 ходах — око звикає шукати результат в одному
// місці. Перемикач результату приглушує дві інші смуги: сценарій «кидок
// уже зроблено, що мені випало?».

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Move } from '../../utils/moves';
import { relatedMoves, statLabel } from '../../utils/moves';
import { CATEGORY_META } from '../../utils/moves';
import { MoveBlocks } from './MoveText';
import type { OpenMove } from './moveMarkup';
import { CategoryIcon, Diamonds, RollBadge, StarButton } from './MoveBits';
import { OUTCOME_KEYS, OUTCOME_TEXT, type OutcomeKey } from './outcomes';

export function ApproachTable({ move }: { move: Move }) {
  if (!move.approaches) return null;
  return (
    <table className="approach-table">
      <thead className="moves-sr-only">
        <tr>
          <th scope="col">Як ви дієте</th>
          <th scope="col">Додайте</th>
        </tr>
      </thead>
      <tbody>
        {move.approaches.map(approach => (
          <tr key={approach.when}>
            <td>
              {approach.when}
              {approach.note && <span className="approach-note"> ({approach.note})</span>}
            </td>
            <td className="approach-stat">+{statLabel(approach.stat)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OutcomeSwitcher({
  selected,
  onSelect,
  floating = false,
}: {
  selected: OutcomeKey | null;
  onSelect: (outcome: OutcomeKey | null) => void;
  floating?: boolean;
}) {
  return (
    <div
      className={`outcome-switcher ${floating ? 'outcome-switcher--floating' : ''}`}
      role="group"
      aria-label="Що випало на кидку"
    >
      {OUTCOME_KEYS.map(key => (
        <button
          key={key}
          type="button"
          className={`outcome-switcher__btn outcome-switcher__btn--${key}`}
          aria-pressed={selected === key}
          onClick={() => onSelect(selected === key ? null : key)}
        >
          <Diamonds outcome={key} />
          <span>{OUTCOME_TEXT[key].short}</span>
        </button>
      ))}
    </div>
  );
}

export function OutcomeBands({
  move,
  selected,
  onOpen,
}: {
  move: Move;
  selected: OutcomeKey | null;
  onOpen?: OpenMove;
}) {
  const refs = useRef<Partial<Record<OutcomeKey, HTMLElement | null>>>({});

  useEffect(() => {
    if (!selected) return;
    const band = refs.current[selected];
    // jsdom не вміє прокручувати; у браузері — плавно, якщо рух не вимкнено.
    band?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  if (!move.outcomes) return null;
  const outcomes = move.outcomes;
  return (
    <div className={`outcome-bands ${selected ? 'outcome-bands--focused' : ''}`}>
      {OUTCOME_KEYS.map(key => (
        <section
          key={key}
          ref={element => {
            refs.current[key] = element;
          }}
          className={`outcome-band outcome-band--${key} ${
            selected && selected !== key ? 'outcome-band--dimmed' : ''
          }`}
          aria-label={OUTCOME_TEXT[key].full}
          data-outcome={key}
        >
          <h4 className="outcome-band__title">
            <Diamonds outcome={key} />
            {OUTCOME_TEXT[key].full}
          </h4>
          <div className="outcome-band__body">
            <MoveBlocks blocks={outcomes[key]} onOpen={onOpen} />
          </div>
        </section>
      ))}
    </div>
  );
}

const ROLL_HINT: Partial<Record<Move['rollKind'], string>> = {
  progress: 'Кидайте граники виклику проти прогресу · імпульс не застосовується',
  oracle: 'Кидайте d100 по таблиці',
};

export interface MoveDetailProps {
  move: Move;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: OpenMove;
  /** Перемикач унизу екрана (мобільна шторка) замість вбудованого. */
  floatingSwitcher?: boolean;
  bookBase: string;
}

export default function MoveDetail({
  move,
  favorite,
  onToggleFavorite,
  onOpen,
  floatingSwitcher = false,
  bookBase,
}: MoveDetailProps) {
  const [selected, setSelected] = useState<OutcomeKey | null>(null);
  const [copied, setCopied] = useState(false);
  const related = relatedMoves(move);

  // Новий хід — новий кидок: вибір результату не переноситься.
  const [shownId, setShownId] = useState(move.id);
  if (shownId !== move.id) {
    setShownId(move.id);
    setSelected(null);
    setCopied(false);
  }

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <article className={`move-detail move-detail--${move.category}`} aria-labelledby={`move-title-${move.id}`}>
      <header className="move-detail__head">
        <div className="move-detail__category">
          <CategoryIcon category={move.category} size={18} />
          {CATEGORY_META[move.category].title}
        </div>
        <div className="move-detail__title-row">
          <h2 id={`move-title-${move.id}`} className="move-detail__title">
            {move.name}
          </h2>
          <StarButton move={move} active={favorite} onToggle={onToggleFavorite} />
        </div>
        <div className="move-detail__badges">
          <RollBadge move={move} />
          {move.expedition && <span className="tag-badge">* експедиційний хід</span>}
          {move.core && <span className="tag-badge tag-badge--core">основний</span>}
          <button type="button" className="copy-link-btn" onClick={copyLink}>
            {copied ? 'Скопійовано ✓' : 'Копіювати посилання'}
          </button>
        </div>
        <div className="move-detail__rule" aria-hidden="true" />
      </header>

      <section className="move-section">
        <h3 className="move-section__label">{move.rollKind === 'none' ? 'Що робити' : 'Коли'}</h3>
        <div className="move-section__body">
          <MoveBlocks blocks={move.lead} onOpen={onOpen} />
        </div>
        {ROLL_HINT[move.rollKind] && <p className="move-roll-hint">{ROLL_HINT[move.rollKind]}</p>}
      </section>

      {(move.approaches || move.bonuses) && (
        <section className="move-section">
          <h3 className="move-section__label">Кидайте</h3>
          <ApproachTable move={move} />
          {move.bonuses && (
            <div className="bonus-chips">
              {move.bonuses.map(bonus => (
                <span key={bonus} className="bonus-chip">
                  {bonus}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {move.outcomes && (
        <section className="move-section move-section--outcomes">
          <div className="move-section__label-row">
            <h3 className="move-section__label">Результати</h3>
            {!floatingSwitcher && <OutcomeSwitcher selected={selected} onSelect={setSelected} />}
          </div>
          <OutcomeBands move={move} selected={selected} onOpen={onOpen} />
        </section>
      )}

      {move.after && (
        <section className="move-section move-section--after">
          <MoveBlocks blocks={move.after} onOpen={onOpen} />
        </section>
      )}

      <footer className="move-detail__foot">
        {related.length > 0 && (
          <div className="related-moves">
            <span className="related-moves__label">Повʼязані ходи:</span>
            {related.map(other => (
              <button key={other.id} type="button" className="related-chip" onClick={() => onOpen(other)}>
                <CategoryIcon category={other.category} size={14} />
                {other.name}
              </button>
            ))}
          </div>
        )}
        {move.bookRef && (
          <Link className="book-link" to={`${bookBase}/${move.bookRef}`}>
            Детальніше в книзі →
          </Link>
        )}
        <span className="move-source">Гральний набір, с. {Number(move.source.slice(5))}</span>
      </footer>

      {floatingSwitcher && move.outcomes && (
        <OutcomeSwitcher selected={selected} onSelect={setSelected} floating />
      )}
    </article>
  );
}

/** Памʼятка кидка: що показує порожня панель деталей на десктопі. */
export function RollPrimer({
  frequent,
  onOpen,
}: {
  frequent: Move[];
  onOpen: OpenMove;
}) {
  return (
    <div className="roll-primer">
      <h2 className="roll-primer__title">Памʼятка кидка</h2>
      <p>
        Киньте <strong>граник дії (d6)</strong> + стат + додатки і порівняйте суму з кожним із двох{' '}
        <strong>граників виклику (d10)</strong>. Сума має бути <em>більшою</em> за граник виклику.
      </p>
      <ul className="roll-primer__outcomes">
        {OUTCOME_KEYS.map(key => (
          <li key={key} className={`roll-primer__outcome roll-primer__outcome--${key}`}>
            <Diamonds outcome={key} />
            <strong>{OUTCOME_TEXT[key].full}</strong> —{' '}
            {key === 'strong'
              ? 'побито обидва d10'
              : key === 'weak'
                ? 'побито один d10'
                : 'не побито жодного'}
          </li>
        ))}
      </ul>
      <p className="roll-primer__note">
        Хід прогресу: замість d6 + стат — кількість заповнених клітин шкали; імпульс не застосовується.
      </p>
      <h3 className="roll-primer__subtitle">Найчастіші ходи</h3>
      <div className="roll-primer__frequent">
        {frequent.map(move => (
          <button key={move.id} type="button" className="related-chip" onClick={() => onOpen(move)}>
            <CategoryIcon category={move.category} size={14} />
            {move.name}
          </button>
        ))}
      </div>
      <p className="roll-primer__keys">
        Натисніть <kbd>?</kbd>, щоб побачити клавіатурні скорочення.
      </p>
    </div>
  );
}

