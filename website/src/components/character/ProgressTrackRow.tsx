// Шкала прогресу: назва, ранг, десять клітин по чотири позначки, кнопки.
// Один компонент на присяги, стосунки й треки боїв — різниця лише в наявності
// рангу (шкала стосунків рангу не має і завжди отримує одну позначку).

import type { ReactNode } from 'react';
import type { Rank } from '../../utils/character/types';
import { RANKS, TICKS_PER_BOX, TRACK_BOXES } from '../../utils/character/types';
import { boxesFilled, ticksInBox } from '../../utils/character/rules';
import { RANK_LABELS, UI } from '../../utils/character/labels';

/**
 * Клітина малюється так само, як її заповнюють олівцем:
 * «/», потім «X», потім вертикаль, потім горизонталь — виходить зірка.
 */
const TICK_LINES = [
  { x1: 4, y1: 16, x2: 16, y2: 4 },
  { x1: 4, y1: 4, x2: 16, y2: 16 },
  { x1: 10, y1: 3, x2: 10, y2: 17 },
  { x1: 3, y1: 10, x2: 17, y2: 10 },
];

const ProgressBox = ({
  filled,
  index,
  onClick,
}: {
  filled: number;
  index: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`progress-box${filled === TICKS_PER_BOX ? ' progress-box--full' : ''}`}
    onClick={onClick}
    aria-label={`Клітина ${index + 1}: ${filled} з ${TICKS_PER_BOX} позначок`}
    title={filled === TICKS_PER_BOX ? 'Клік очистить цю клітину' : 'Клік додасть позначку'}
  >
    <svg viewBox="0 0 20 20" aria-hidden="true">
      {TICK_LINES.slice(0, filled).map((line, i) => (
        <line key={i} {...line} />
      ))}
    </svg>
  </button>
);

const ProgressTrackRow = ({
  name,
  rank,
  ticks,
  namePlaceholder,
  onName,
  onRank,
  onMark,
  onToggleBox,
  onRoll,
  action,
}: {
  name: string;
  /** Відсутній для шкали стосунків — вона рангу не має. */
  rank?: Rank;
  ticks: number;
  namePlaceholder: string;
  onName: (name: string) => void;
  onRank?: (rank: Rank) => void;
  onMark: () => void;
  onToggleBox: (boxIndex: number) => void;
  onRoll: () => void;
  /** Кнопка в кінці рядка назви — наприклад, видалення присяги. */
  action?: ReactNode;
}) => (
  <div className="progress-track">
    <div className="progress-track__head">
      <input
        className="progress-track__name"
        value={name}
        placeholder={namePlaceholder}
        aria-label={namePlaceholder}
        onChange={event => onName(event.target.value)}
      />
      {rank && onRank && (
        <select
          className="progress-track__rank"
          value={rank}
          aria-label="Ранг виклику"
          onChange={event => onRank(event.target.value as Rank)}
        >
          {RANKS.map(option => (
            <option key={option} value={option}>
              {RANK_LABELS[option]}
            </option>
          ))}
        </select>
      )}
      {action}
    </div>

    <div className="progress-track__body">
      <div className="progress-boxes">
        {Array.from({ length: TRACK_BOXES }, (_, index) => (
          <ProgressBox
            key={index}
            index={index}
            filled={ticksInBox(ticks, index)}
            onClick={() => onToggleBox(index)}
          />
        ))}
      </div>
      <span className="progress-track__count">
        {boxesFilled(ticks)}/{TRACK_BOXES}
      </span>
      <div className="progress-track__actions">
        <button type="button" className="track-button" onClick={onMark}>
          {UI.mark}
        </button>
        <button type="button" className="track-button track-button--roll" onClick={onRoll}>
          🎲 {UI.progressRoll}
        </button>
      </div>
    </div>
  </div>
);

export default ProgressTrackRow;
