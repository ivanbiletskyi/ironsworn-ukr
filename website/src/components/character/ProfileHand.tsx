// Рука карт: корінці профілів віялом, як під час гри в карткову гру
// (рішення №1–2). Сама піднята карта тут не малюється — її ставить поруч
// зона або фулскрін телефона; рука відповідає лише за корінці, гортання
// й клавіатуру.
//
// Геометрію (накладання, поворот) задає CSS через `--i` та `--count`:
// компонент не знає ні ширини зони, ні кутів.

import type { KeyboardEvent } from 'react';
import type { ResolvedProfile } from '../../utils/character/profiles';
import { markCount, profileLabel } from '../../utils/character/profiles';
import { PROFILE_TYPE_LABELS, UI, markCountHint } from '../../utils/character/labels';

const SPINE = '.profile-spine';

const ProfileHand = ({
  entries,
  raisedId,
  onPick,
  onClose,
}: {
  entries: ResolvedProfile[];
  /** Піднята карта: її корінець підсвічений і має `aria-expanded`. */
  raisedId: string | null;
  onPick: (id: string) => void;
  /** Esc опускає карту. */
  onClose: () => void;
}) => {
  // Фокус ходить корінцями стрілками, а Tab виводить із руки цілком: усередині
  // руки може бути двадцять карт, і протабувати їх усі — не спосіб її обійти.
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;

    const spines = [...event.currentTarget.querySelectorAll<HTMLElement>(SPINE)];
    const current = spines.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    event.preventDefault();
    spines[(current + step + spines.length) % spines.length].focus();
  };

  return (
    <ul
      className="profile-hand"
      style={{ '--count': entries.length } as React.CSSProperties}
      onKeyDown={handleKeyDown}
    >
      {entries.map(({ entry, profile }, index) => {
        const label = profileLabel(entry, profile);
        const { marked, total } = markCount(entry, profile);
        const raised = entry.id === raisedId;
        return (
          <li key={entry.id} className="profile-hand__slot">
            <button
              type="button"
              className={`profile-spine${raised ? ' profile-spine--raised' : ''}`}
              style={{ '--i': index } as React.CSSProperties}
              aria-expanded={raised}
              onClick={() => onPick(entry.id)}
              title={raised ? UI.lowerProfile : UI.raiseProfile}
            >
              <span className="profile-spine__type">{PROFILE_TYPE_LABELS[profile.type]}</span>
              <span className="profile-spine__name">{label}</span>
              {label !== profile.name && (
                <span className="profile-spine__origin">{profile.name}</span>
              )}
              <span className="profile-spine__marks" aria-hidden="true">
                {Array.from({ length: total }, (_, dot) => (
                  <span
                    key={dot}
                    className={`profile-dot${dot < marked ? ' profile-dot--filled' : ''}`}
                  />
                ))}
              </span>
              <span className="visually-hidden">{markCountHint(marked, total)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default ProfileHand;
