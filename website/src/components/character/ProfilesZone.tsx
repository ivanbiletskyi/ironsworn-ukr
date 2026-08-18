// Зона «ПРОФІЛІ» на десктопі й планшеті: рука карт, піднята карта поруч,
// порожній стан. Клік по корінцю підіймає карту в межах зони — аркуш
// лишається видним, ніякого модального вікна (рішення №3).

import type { CharacterProfile } from '../../utils/character/types';
import type { ResolvedProfile } from '../../utils/character/profiles';
import { toggleMark } from '../../utils/character/profiles';
import { UI } from '../../utils/character/labels';
import ProfileCard from './ProfileCard';
import ProfileHand from './ProfileHand';

const ASSETS_CHAPTER = '/uk/2-Your-Character_6-Assets';

const ProfilesZone = ({
  entries,
  raisedId,
  onRaise,
  onUpdate,
  onRemove,
}: {
  entries: ResolvedProfile[];
  raisedId: string | null;
  onRaise: (id: string | null) => void;
  onUpdate: (id: string, updater: (entry: CharacterProfile) => CharacterProfile) => void;
  onRemove: (id: string) => void;
}) => {
  if (entries.length === 0) {
    return (
      <div className="profiles-empty">
        <p className="profiles-empty__text">{UI.noProfiles}</p>
        {/* Звичайний `a`, а не `Link`: зона рендериться і без роутера
            (у тестах аркуша), а перехід у главу правил однаково залишає аркуш. */}
        <p className="profiles-empty__hint">
          {UI.profilesRulesHint} — <a href={ASSETS_CHAPTER}>{UI.profilesRulesLink}</a>
        </p>
      </div>
    );
  }

  const raised = entries.find(({ entry }) => entry.id === raisedId) ?? null;

  return (
    <div className={`profiles-zone${raised ? ' profiles-zone--raised' : ''}`}>
      {raised && (
        <ProfileCard
          profile={raised.profile}
          entry={raised.entry}
          variant="raised"
          onToggleMark={path =>
            onUpdate(raised.entry.id, current => ({
              ...current,
              marked: toggleMark(current.marked, path),
            }))
          }
          onField={(id, value) =>
            onUpdate(raised.entry.id, current => ({
              ...current,
              fields: { ...current.fields, [id]: value },
            }))
          }
          onTrack={index =>
            onUpdate(raised.entry.id, current => ({ ...current, trackIndex: index }))
          }
          onRemove={() => onRemove(raised.entry.id)}
          onClose={() => onRaise(null)}
        />
      )}

      <ProfileHand
        entries={entries}
        raisedId={raisedId}
        onPick={id => onRaise(id === raisedId ? null : id)}
        onClose={() => onRaise(null)}
      />
    </div>
  );
};

export default ProfilesZone;
