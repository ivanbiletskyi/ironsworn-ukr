// Телефон: приклеєний до низу екрана футер профілів у трьох станах —
// вузька смужка «ПРОФІЛІ · 4 ▴», шухляда з рукою карт і фулскрін картки
// (рішення №5–6). Читати текст картки у віялі на телефоні неможливо, тож
// тап по карті відкриває її на весь екран.
//
// Закриття фулскріна повертає до шухляди, а не до аркуша: гравець зазвичай
// дивиться другу карту одразу після першої (§5.2).

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CharacterProfile } from '../../utils/character/types';
import type { ResolvedProfile } from '../../utils/character/profiles';
import { toggleMark } from '../../utils/character/profiles';
import { SHEET, UI } from '../../utils/character/labels';
import ProfileCard from './ProfileCard';
import ProfileHand from './ProfileHand';
import { useDialog } from './useDialog';

const DRAWER_ID = 'profiles-drawer';

/** Від якої відстані (px) горизонтальний жест перегортає карту. Те саме
    значення, що й у карток кидків: жести аркуша мають відчуватися однаково. */
const SWIPE_THRESHOLD = 80;

const ProfilesFooter = ({
  entries,
  onAdd,
  onUpdate,
  onRemove,
  onOpenMoves,
}: {
  entries: ResolvedProfile[];
  /** Ліва половина футера — шторка ходів, у зоні великого пальця. */
  onOpenMoves?: () => void;
  onAdd: () => void;
  onUpdate: (id: string, updater: (entry: CharacterProfile) => CharacterProfile) => void;
  onRemove: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [fullId, setFullId] = useState<string | null>(null);

  const index = entries.findIndex(({ entry }) => entry.id === fullId);
  const full = index === -1 ? null : entries[index];

  return (
    <>
      {open && (
        <div
          className="profiles-drawer__backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`profiles-footer${open ? ' profiles-footer--open' : ''}`}>
        <div className="profiles-footer__bar">
          {onOpenMoves && !open && (
            <button type="button" className="profiles-footer__moves" onClick={onOpenMoves}>
              ⚔ Ходи
            </button>
          )}
          <button
            type="button"
            className="profiles-footer__toggle"
            aria-expanded={open}
            aria-controls={DRAWER_ID}
            onClick={() => setOpen(current => !current)}
          >
            <span className="profiles-footer__label">
              {SHEET.profiles} · {entries.length}
            </span>
            <span className="profiles-footer__chevron" aria-hidden="true">
              {open ? '▾' : '▴'}
            </span>
            <span className="visually-hidden">{open ? UI.closeProfiles : UI.openProfiles}</span>
          </button>
          {open && (
            <button
              type="button"
              className="zone-add"
              onClick={onAdd}
              aria-label={UI.addProfile}
              title={UI.addProfile}
            >
              +
            </button>
          )}
        </div>

        {open && (
          <div className="profiles-drawer" id={DRAWER_ID}>
            {entries.length === 0 ? (
              <p className="profiles-empty__text">{UI.noProfiles}</p>
            ) : (
              <ProfileHand
                entries={entries}
                raisedId={fullId}
                onPick={setFullId}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {full && (
        <ProfileFullscreen
          entries={entries}
          index={index}
          onPick={setFullId}
          onClose={() => setFullId(null)}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      )}
    </>
  );
};

/** Картка на весь екран із гортанням «‹ 2 з 4 ›» по руці. */
const ProfileFullscreen = ({
  entries,
  index,
  onPick,
  onClose,
  onUpdate,
  onRemove,
}: {
  entries: ResolvedProfile[];
  index: number;
  onPick: (id: string) => void;
  onClose: () => void;
  onUpdate: (id: string, updater: (entry: CharacterProfile) => CharacterProfile) => void;
  onRemove: (id: string) => void;
}) => {
  const dialog = useDialog<HTMLDivElement>(onClose);
  const { entry, profile } = entries[index];
  const step = (delta: number) =>
    onPick(entries[(index + delta + entries.length) % entries.length].entry.id);

  // Свайп убік перегортає карту, не закриваючи екран (§5.2). Кружечки,
  // поля й кнопки лишаються собою: жест на них не починається.
  const origin = useRef<number | null>(null);
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, a')) return;
    origin.current = event.clientX;
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    origin.current = null;
    if (start === null || entries.length < 2) return;
    const distance = event.clientX - start;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) step(distance < 0 ? 1 : -1);
  };

  return (
    <div
      className="profile-modal profile-modal--card"
      role="dialog"
      aria-modal="true"
      aria-label={profile.name}
      ref={dialog}
    >
      <div className="profile-modal__head">
        <button type="button" className="bar-button" onClick={onClose}>
          ‹ {SHEET.profiles}
        </button>
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

      <div
        className="profile-modal__body"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => (origin.current = null)}
      >
        <ProfileCard
          profile={profile}
          entry={entry}
          variant="full"
          onToggleMark={path =>
            onUpdate(entry.id, current => ({ ...current, marked: toggleMark(current.marked, path) }))
          }
          onField={(id, value) =>
            onUpdate(entry.id, current => ({ ...current, fields: { ...current.fields, [id]: value } }))
          }
          onTrack={trackIndex => onUpdate(entry.id, current => ({ ...current, trackIndex }))}
          onRemove={() => {
            // Рука могла лишитися порожньою — тоді фулскрін нічого не покаже.
            if (entries.length === 1) onClose();
            else step(1);
            onRemove(entry.id);
          }}
        />
      </div>

      {entries.length > 1 && (
        <div className="profile-modal__pager">
          <button
            type="button"
            className="track-button"
            onClick={() => step(-1)}
            aria-label={UI.back}
          >
            ‹
          </button>
          <span className="profile-modal__position">
            {index + 1} з {entries.length}
          </span>
          <button type="button" className="track-button" onClick={() => step(1)} aria-label="Далі">
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilesFooter;
