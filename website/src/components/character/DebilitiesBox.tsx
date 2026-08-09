// Слабкості трьома групами, як на аркуші: стани, згуба, тягарі.
// Позначка тут одразу змінює максимальний і початковий імпульс —
// перерахунок робить MomentumTrack, обмеження поточного значення — useCharacterStore.

import type { Character, DebilityGroup, DebilityKey } from '../../utils/character/types';
import { DEBILITIES_BY_GROUP } from '../../utils/character/types';
import { DEBILITY_GROUP_LABELS, DEBILITY_LABELS } from '../../utils/character/labels';

const GROUPS: DebilityGroup[] = ['condition', 'bane', 'burden'];

const DebilitiesBox = ({
  character,
  onToggle,
}: {
  character: Character;
  onToggle: (debility: DebilityKey, marked: boolean) => void;
}) => (
  <div className="debilities">
    {GROUPS.map(group => (
      <div key={group} className="debility-group">
        <h3 className="debility-group__title">{DEBILITY_GROUP_LABELS[group]}</h3>
        <ul className="debility-list">
          {DEBILITIES_BY_GROUP[group].map(debility => (
            <li key={debility}>
              <label className="debility">
                <input
                  type="checkbox"
                  checked={character.debilities[debility]}
                  onChange={event => onToggle(debility, event.target.checked)}
                />
                <span>{DEBILITY_LABELS[debility]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default DebilitiesBox;
