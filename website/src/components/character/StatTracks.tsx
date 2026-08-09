// Три показники: здоров'я, дух, припаси. Кожен — шкала 0…+5.
// Якщо відмічено відповідну слабкість, підвищувати показник не можна (§3.9).

import type { Character, StatKey } from '../../utils/character/types';
import { MAX_STAT, MIN_STAT, STAT_KEYS } from '../../utils/character/types';
import { blockingDebility } from '../../utils/character/rules';
import { STAT_LABELS, blockedStatHint } from '../../utils/character/labels';
import ScaleTrack from './ScaleTrack';

const VALUES = Array.from({ length: MAX_STAT - MIN_STAT + 1 }, (_, i) => MAX_STAT - i);

const StatTracks = ({
  character,
  onChange,
}: {
  character: Character;
  onChange: (stat: StatKey, value: number) => void;
}) => (
  <div className="stat-tracks">
    {STAT_KEYS.map(stat => {
      const blocker = blockingDebility(character, stat);
      const current = character.stats[stat];
      return (
        <div key={stat} className="stat-track">
          <h3 className="stat-track__title">{STAT_LABELS[stat]}</h3>
          <ScaleTrack
            label={STAT_LABELS[stat]}
            values={VALUES}
            value={current}
            onSelect={value => onChange(stat, value)}
            isDisabled={candidate => blocker !== null && candidate > current}
          />
          {blocker && <p className="scale-hint">{blockedStatHint(blocker, stat)}</p>}
        </div>
      );
    })}
  </div>
);

export default StatTracks;
