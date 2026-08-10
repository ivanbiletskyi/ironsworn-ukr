// Один рядок присяги. Присяг на аркуші рівно стільки, скільки гравець додав
// кнопкою «+» у заголовку зони, тож кожен рядок вміє себе прибрати.

import { useState } from 'react';
import type { ProgressTrack, Rank } from '../../utils/character/types';
import { isEmptyVow } from '../../utils/character/storage';
import { markProgress, toggleBoxTick } from '../../utils/character/rules';
import { confirmVowRemoval, UI } from '../../utils/character/labels';
import ProgressTrackRow from './ProgressTrackRow';

const VowRow = ({
  vow,
  label,
  isOnly,
  onUpdate,
  onRemove,
  onRoll,
}: {
  vow: ProgressTrack;
  /** Назва присяги або «Присяга N», якщо назви ще немає. */
  label: string;
  /** Єдина присяга на аркуші — її порожній рядок прибирати нема сенсу. */
  isOnly: boolean;
  onUpdate: (updater: (vow: ProgressTrack) => ProgressTrack) => void;
  onRemove: () => void;
  onRoll: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);

  const empty = isEmptyVow(vow);

  // Порожня присяга — це щойно натиснутий «+»: прибираємо без питань.
  // За назвою чи прогресом стоїть робота гравця, тож питаємо.
  const handleRemove = () => (empty ? onRemove() : setConfirming(true));

  return (
    <div className="vow">
      <ProgressTrackRow
        name={vow.name}
        rank={vow.rank}
        ticks={vow.ticks}
        namePlaceholder={UI.vowNamePlaceholder}
        onName={name => onUpdate(current => ({ ...current, name }))}
        onRank={(rank: Rank) => onUpdate(current => ({ ...current, rank }))}
        onMark={() =>
          onUpdate(current => ({ ...current, ticks: markProgress(current.ticks, current.rank) }))
        }
        onToggleBox={box =>
          onUpdate(current => ({ ...current, ticks: toggleBoxTick(current.ticks, box) }))
        }
        onRoll={onRoll}
        action={
          isOnly && empty ? undefined : (
            <button
              type="button"
              className="progress-track__remove"
              onClick={handleRemove}
              aria-label={`${UI.removeVow}: ${label}`}
              title={UI.removeVow}
            >
              ×
            </button>
          )
        }
      />

      {/* Підтвердження вбудоване, як і у панелі персонажів: системне вікно
          не стилізується і блокує сторінку. */}
      {confirming && (
        <div className="vow__confirm">
          <span className="vow__confirm-text">{confirmVowRemoval(label)}</span>
          <button
            type="button"
            className="track-button track-button--danger"
            onClick={() => {
              setConfirming(false);
              onRemove();
            }}
          >
            {UI.confirmRemove}
          </button>
          <button type="button" className="track-button" onClick={() => setConfirming(false)}>
            {UI.cancel}
          </button>
        </div>
      )}
    </div>
  );
};

export default VowRow;
