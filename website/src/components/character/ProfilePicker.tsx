// Повноекранне вікно вибору профілю: пошук, групи за типом, прев'ю картки.
//
// Тап по плитці розкриває повну картку з кнопкою «+ Додати» (рішення №12):
// вибирати з 78 карток «наосліп» не можна. Уже додані профілі у вікні не
// показуються — один профіль додається не більше одного разу (рішення №23).

import { useMemo, useState } from 'react';
import type { Profile } from '../../utils/profiles';
import { PROFILES, PROFILES_BY_TYPE, PROFILE_TYPES } from '../../utils/profiles';
import { profileSearchText, profileSummary } from '../../utils/character/profiles';
import { PROFILE_GROUP_LABELS, PROFILE_TYPE_LABELS, UI } from '../../utils/character/labels';
import ProfileCard from './ProfileCard';
import { useDialog } from './useDialog';

const ProfilePicker = ({
  taken,
  onAdd,
  onClose,
}: {
  /** Ключі профілів, які вже в руці. */
  taken: string[];
  onAdd: (profile: Profile) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<Profile | null>(null);
  const dialog = useDialog<HTMLDivElement>(onClose);

  // Пошук іде і за назвою, і за текстом навичок: шукати «щит», «припаси»,
  // «стосунки» — головний спосіб знайти потрібне серед 78 (§5.3).
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const skip = new Set(taken);
    return PROFILE_TYPES.map(type => ({
      type,
      items: PROFILES_BY_TYPE[type].filter(
        profile =>
          !skip.has(profile.id) && (needle === '' || profileSearchText(profile).includes(needle)),
      ),
    })).filter(group => group.items.length > 0);
  }, [query, taken]);

  const empty = groups.length === 0;

  return (
    <div className="profile-modal" role="dialog" aria-modal="true" aria-label={UI.addProfile} ref={dialog}>
      <div className="profile-modal__head">
        <h2 className="profile-modal__title">{preview ? preview.name : UI.addProfile}</h2>
        {preview ? (
          <button type="button" className="bar-button" onClick={() => setPreview(null)}>
            ‹ {UI.back}
          </button>
        ) : null}
        <button
          type="button"
          className="profile-modal__close"
          onClick={onClose}
          aria-label={UI.closeRollPanel}
          title={UI.closeRollPanel}
        >
          ×
        </button>
      </div>

      {preview ? (
        <div className="profile-modal__body profile-modal__body--preview">
          <ProfileCard profile={preview} variant="preview" />
          <div className="profile-modal__actions">
            <button type="button" className="roll-button" onClick={() => onAdd(preview)}>
              {UI.addToHand}
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-modal__body">
          <input
            className="profile-search"
            type="search"
            value={query}
            placeholder={UI.profileSearchPlaceholder}
            aria-label={UI.profileSearchPlaceholder}
            onChange={event => setQuery(event.target.value)}
          />

          {empty && (
            <p className="profiles-empty__text">
              {taken.length >= PROFILES.length ? UI.profilesAllAdded : UI.profileNothingFound}
            </p>
          )}

          {groups.map(({ type, items }) => (
            <section key={type} className="profile-group">
              {/* Лічильник — кількість доступних, а не всіх у наборі: додані
                  профілі з вікна зникають, і «37» під сімома плитками брехало б. */}
              <h3 className="profile-group__title">
                {PROFILE_GROUP_LABELS[type]} · {items.length}
              </h3>
              <div className="profile-tiles">
                {items.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    className="profile-tile"
                    onClick={() => setPreview(profile)}
                  >
                    <span className={`profile-type profile-type--${profile.type}`}>
                      {PROFILE_TYPE_LABELS[profile.type]}
                    </span>
                    <span className="profile-tile__name">{profile.name}</span>
                    <span className="profile-tile__summary">{profileSummary(profile)}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePicker;
