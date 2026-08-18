// Смуга клітинок унизу картки: здоров'я супутника, сила ватаги, есенція,
// світло, обладунок. Підписи — рядками з каталогу, бо буває й «ВАЖКИЙ
// ОБЛАДУНОК», а не лише «+3».
//
// Числових правил шкала не має: жодних обмежень слабкостями, жодних кидків
// (рішення №17). Повторний клік по вибраній клітинці знімає вибір — інакше
// «0» і «нічого не вибрано» не розрізнити (§6.3).

import type { ProfileTrack } from '../../utils/profiles';

const ProfileTrackRow = ({
  track,
  value,
  label,
  onSelect,
  readOnly = false,
}: {
  track: ProfileTrack;
  value: number | null;
  /** «Шкала картки «Пес»» — у шкали на картці власної назви немає. */
  label: string;
  onSelect?: (next: number | null) => void;
  readOnly?: boolean;
}) => (
  <div
    className="profile-track"
    role={readOnly ? undefined : 'radiogroup'}
    aria-label={readOnly ? undefined : label}
  >
    {track.cells.map((cell, index) => {
      const current = index === value;
      const className = `profile-track__cell${current ? ' profile-track__cell--current' : ''}`;

      if (readOnly) {
        return (
          <span key={index} className={className}>
            {cell}
          </span>
        );
      }

      return (
        <button
          key={index}
          type="button"
          role="radio"
          aria-checked={current}
          aria-label={`${label}: ${cell}`}
          className={className}
          onClick={() => onSelect?.(current ? null : index)}
        >
          {cell}
        </button>
      );
    })}
  </div>
);

export default ProfileTrackRow;
