// Шкала зі значеннями — спільна основа для імпульсу та показників.
// На папері це стовпчик клітинок із маркером; тут маркер — вибрана клітинка.
// Орієнтацію (стовпчик чи ряд) задає CSS, а не пропси.

import { formatScaleValue } from '../../utils/character/labels';

const ScaleTrack = ({
  label,
  values,
  value,
  onSelect,
  isDisabled,
}: {
  label: string;
  values: number[];
  value: number;
  onSelect: (next: number) => void;
  /** Значення, недосяжні за правилами: понад максимум або заблоковані слабкістю. */
  isDisabled?: (candidate: number) => boolean;
}) => (
  <div className="scale-track" role="radiogroup" aria-label={label}>
    {values.map(candidate => {
      const disabled = isDisabled?.(candidate) ?? false;
      const current = candidate === value;
      return (
        <button
          key={candidate}
          type="button"
          role="radio"
          aria-checked={current}
          aria-label={`${label}: ${formatScaleValue(candidate)}`}
          className={`scale-cell${current ? ' scale-cell--current' : ''}`}
          disabled={disabled && !current}
          onClick={() => onSelect(candidate)}
        >
          {formatScaleValue(candidate)}
        </button>
      );
    })}
  </div>
);

export default ScaleTrack;
