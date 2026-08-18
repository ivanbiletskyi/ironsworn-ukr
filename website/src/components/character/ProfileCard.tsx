// Картка профілю: шапка, дерево блоків, шкала. Три варіанти —
// `raised` (піднята в зоні аркуша), `full` (фулскрін телефона),
// `preview` (прев'ю у вікні вибору, без правок).
//
// Картка суто довідкова: жодних кидків і «позначити прогрес» — текст не
// привʼязується до механік (рішення №19).

import { useState } from 'react';
import type { CharacterProfile } from '../../utils/character/types';
import type { Profile } from '../../utils/profiles';
import {
  PROFILE_TYPE_LABELS,
  UI,
  confirmProfileRemoval,
} from '../../utils/character/labels';
import { defaultMarks, isPristineProfile, profileLabel } from '../../utils/character/profiles';
import ProfileBlocks from './ProfileMarks';
import ProfileTrackRow from './ProfileTrackRow';

export type ProfileCardVariant = 'raised' | 'full' | 'preview';

/** Прев'ю у вікні вибору показує картку так, як вона надрукована на папері. */
function printedState(profile: Profile): Pick<CharacterProfile, 'marked' | 'fields' | 'trackIndex'> {
  return { marked: defaultMarks(profile), fields: {}, trackIndex: null };
}

const ProfileCard = ({
  profile,
  entry,
  variant,
  onToggleMark,
  onField,
  onTrack,
  onRemove,
  onClose,
}: {
  profile: Profile;
  /** Відсутній у прев'ю: там ще немає чиєї відмітки показувати. */
  entry?: CharacterProfile;
  variant: ProfileCardVariant;
  onToggleMark?: (path: string) => void;
  onField?: (id: string, value: string) => void;
  onTrack?: (index: number | null) => void;
  onRemove?: () => void;
  /** «×» у шапці піднятої карти опускає її; у фулскріні його малює екран. */
  onClose?: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const readOnly = variant === 'preview';
  const state = entry ?? printedState(profile);
  const label = entry ? profileLabel(entry, profile) : profile.name;
  const named = label !== profile.name;

  // Питаємо лише коли в картці є робота гравця; щойно додану прибираємо
  // молча (рішення №25).
  const handleRemove = () => {
    if (!entry || isPristineProfile(entry, profile)) onRemove?.();
    else setConfirming(true);
  };

  return (
    <article className={`profile-card profile-card--${variant}`}>
      <header className="profile-card__head">
        <span className={`profile-type profile-type--${profile.type}`}>
          {PROFILE_TYPE_LABELS[profile.type]}
        </span>
        <h3 className="profile-card__name">
          {label}
          {named && <span className="profile-card__origin">{profile.name}</span>}
        </h3>
        {onRemove && variant === 'raised' && (
          <button
            type="button"
            className="profile-card__remove"
            onClick={handleRemove}
            aria-label={`${UI.removeProfile}: ${label}`}
            title={UI.removeProfile}
          >
            ×
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="profile-card__close"
            onClick={onClose}
            aria-label={UI.lowerProfile}
            title={UI.lowerProfile}
          >
            ⌄
          </button>
        )}
      </header>

      <ProfileBlocks
        blocks={profile.blocks}
        marked={state.marked}
        fields={state.fields}
        onToggle={onToggleMark}
        onField={onField}
        readOnly={readOnly}
      />

      {profile.track && (
        <ProfileTrackRow
          track={profile.track}
          value={state.trackIndex}
          label={`${UI.profileScale} «${label}»`}
          onSelect={onTrack}
          readOnly={readOnly}
        />
      )}

      {/* Кнопка видалення у фулскріні стоїть під карткою, а не «×» у шапці:
          там шапку займають «‹ Профілі» й гортання (§5.2). */}
      {onRemove && variant === 'full' && !confirming && (
        <div className="profile-card__actions">
          <button type="button" className="track-button track-button--danger" onClick={handleRemove}>
            {UI.remove}
          </button>
        </div>
      )}

      {/* Вбудований рядок підтвердження, а не `window.confirm`: той не
          стилізується й блокує сторінку — так само зроблено в присягах. */}
      {confirming && (
        <div className="track-row__confirm">
          <span className="track-row__confirm-text">{confirmProfileRemoval(label)}</span>
          <button
            type="button"
            className="track-button track-button--danger"
            onClick={() => {
              setConfirming(false);
              onRemove?.();
            }}
          >
            {UI.confirmRemove}
          </button>
          <button type="button" className="track-button" onClick={() => setConfirming(false)}>
            {UI.cancel}
          </button>
        </div>
      )}
    </article>
  );
};

export default ProfileCard;
