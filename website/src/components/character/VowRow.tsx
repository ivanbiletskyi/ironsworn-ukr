// Один рядок присяги. Присяг на аркуші рівно стільки, скільки гравець додав
// кнопкою «+» у заголовку зони, тож кожен рядок вміє себе прибрати.

import type { ProgressTrack, Rank } from '../../utils/character/types';
import { markProgress, toggleBoxTick } from '../../utils/character/rules';
import { isEmptyTrack } from '../../utils/character/storage';
import { confirmTrackRemoval, UI } from '../../utils/character/labels';
import ProgressTrackRow from './ProgressTrackRow';
import { useTrackRemoval } from './useTrackRemoval';

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
  const { action, confirm } = useTrackRemoval({
    empty: isEmptyTrack(vow),
    label,
    removeLabel: UI.removeVow,
    confirmText: confirmTrackRemoval(label),
    isOnly,
    onRemove,
  });

  return (
    <div className="track-row">
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
        action={action}
      />

      {confirm}
    </div>
  );
};

export default VowRow;
