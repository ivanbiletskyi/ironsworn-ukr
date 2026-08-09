// Досвід: 30 кружечків, три стани на кожен.
// Клік циклічно: порожній → зароблений → витрачений → порожній.

import type { Character, XpCell } from '../../utils/character/types';
import { XP_CELLS } from '../../utils/character/types';
import { availableXp, earnedXp, spentXp } from '../../utils/character/rules';
import { UI } from '../../utils/character/labels';

const STATE_LABEL: Record<XpCell, string> = {
  0: 'порожній',
  1: 'зароблений',
  2: 'витрачений',
};

const XpTrack = ({
  character,
  onToggle,
}: {
  character: Character;
  onToggle: (index: number) => void;
}) => (
  <div className="xp-track">
    <div className="xp-summary">
      <span className="xp-summary__available">
        {UI.xpAvailable}: <strong>{availableXp(character)}</strong>
      </span>
      <span className="xp-summary__detail">
        {UI.xpEarned}: {earnedXp(character)} · {UI.xpSpent}: {spentXp(character)}
      </span>
    </div>
    <div className="xp-cells">
      {Array.from({ length: XP_CELLS }, (_, index) => {
        const state = character.xp[index] ?? 0;
        return (
          <button
            key={index}
            type="button"
            className={`xp-cell xp-cell--${state}`}
            onClick={() => onToggle(index)}
            aria-label={`Досвід ${index + 1}: ${STATE_LABEL[state]}`}
          >
            {state === 2 ? '✕' : ''}
          </button>
        );
      })}
    </div>
  </div>
);

export default XpTrack;
