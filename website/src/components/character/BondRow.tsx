// Один рядок стосунків — те саме, що присяга, лише без рангу: шкала стосунків
// завжди отримує одну позначку. Додають і прибирають стосунки так само, як
// присяги (рішення №17).

import type { Track } from '../../utils/character/types';
import { markBondProgress, toggleBoxTick } from '../../utils/character/rules';
import { UI } from '../../utils/character/labels';
import ProgressTrackRow from './ProgressTrackRow';
import { useTrackRemoval } from './useTrackRemoval';

const BondRow = ({
  bond,
  label,
  isOnly,
  onUpdate,
  onRemove,
  onRoll,
}: {
  bond: Track;
  /** Назва стосунку або «Стосунок N», якщо назви ще немає. */
  label: string;
  /** Єдиний стосунок на аркуші — його порожній рядок прибирати нема сенсу. */
  isOnly: boolean;
  onUpdate: (updater: (bond: Track) => Track) => void;
  onRemove: () => void;
  onRoll: () => void;
}) => {
  const { action, confirm } = useTrackRemoval({
    track: bond,
    label,
    removeLabel: UI.removeBond,
    isOnly,
    onRemove,
  });

  return (
    <div className="track-row">
      <ProgressTrackRow
        name={bond.name}
        ticks={bond.ticks}
        namePlaceholder={UI.bondNamePlaceholder}
        onName={name => onUpdate(current => ({ ...current, name }))}
        /* Рангу немає: за правилами стосунки завжди отримують одну позначку. */
        onMark={() => onUpdate(current => ({ ...current, ticks: markBondProgress(current.ticks) }))}
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

export default BondRow;
