// Шкала імпульсу з обчисленими «Макс.» і «Початк.».
// Обидва поля read-only: вони випливають зі слабкостей (§3.3, §3.4).

import type { Character } from '../../utils/character/types';
import { BASE_MAX_MOMENTUM, MIN_MOMENTUM } from '../../utils/character/types';
import { countDebilities, maxMomentum, resetMomentum } from '../../utils/character/rules';
import { SHEET, debilityHint, formatScaleValue } from '../../utils/character/labels';
import ScaleTrack from './ScaleTrack';

const ALL_VALUES = Array.from(
  { length: BASE_MAX_MOMENTUM - MIN_MOMENTUM + 1 },
  (_, i) => BASE_MAX_MOMENTUM - i,
);

const MomentumTrack = ({
  character,
  onChange,
}: {
  character: Character;
  onChange: (momentum: number) => void;
}) => {
  const max = maxMomentum(character);
  const reset = resetMomentum(character);
  const hint = debilityHint(countDebilities(character));

  return (
    <>
      <ScaleTrack
        label={SHEET.momentum}
        values={ALL_VALUES}
        value={character.momentum}
        onSelect={onChange}
        isDisabled={candidate => candidate > max}
      />
      <dl className="scale-readouts">
        <div className="scale-readout">
          <dt>{SHEET.momentumMax}</dt>
          <dd>{formatScaleValue(max)}</dd>
        </div>
        <div className="scale-readout">
          <dt>{SHEET.momentumReset}</dt>
          <dd>{formatScaleValue(reset)}</dd>
        </div>
      </dl>
      {hint && <p className="scale-hint">{hint}</p>}
    </>
  );
};

export default MomentumTrack;
