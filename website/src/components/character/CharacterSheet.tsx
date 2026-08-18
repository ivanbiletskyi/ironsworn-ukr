// Аркуш персонажа: маршрут, розкладка зон і зведення всіх дій докупи.
// Правила та розкладку описано в CHARACTER_SHEET_PLAN.md.

import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type {
  AttrKey,
  CharacterProfile,
  ExtraTrack,
  ProgressTrack,
  Track,
  TrackKind,
} from '../../utils/character/types';
import { emptyBond, emptyVow, newId } from '../../utils/character/storage';
import type { Profile } from '../../utils/profiles';
import { emptyCharacterProfile, resolveProfiles } from '../../utils/character/profiles';
import type { SheetRoll } from '../../utils/character/diceEngine';
import { commitBurn, previewBurn, rollAction, rollProgress } from '../../utils/character/diceEngine';
import { ATTR_LABELS, SHEET, UI } from '../../utils/character/labels';
import { clampAttribute, clampStat, nextXpState, resetMomentum } from '../../utils/character/rules';
import { useCharacterStore } from './useCharacterStore';
import { useSheetLog } from './useSheetLog';
import { useIsNarrow } from './useIsNarrow';
import AttributeBoxes from './AttributeBoxes';
import MomentumTrack from './MomentumTrack';
import StatTracks from './StatTracks';
import DebilitiesBox from './DebilitiesBox';
import RollToasts, { MAX_TOASTS } from './RollToasts';
import RollLog from './RollLog';
import VowRow from './VowRow';
import BondRow from './BondRow';
import XpTrack from './XpTrack';
import CharacterBar from './CharacterBar';
import ExtraTracksSection from './ExtraTracksSection';
import ProfilesZone from './ProfilesZone';
import ProfilesFooter from './ProfilesFooter';
import ProfilePicker from './ProfilePicker';
import './CharacterSheet.css';

const vowLabel = (name: string, index: number) => name.trim() || `Присяга ${index + 1}`;
const bondLabel = (name: string, index: number) => name.trim() || `Стосунок ${index + 1}`;

/** Зона аркуша. `area` — ім'я з grid-template-areas. */
const Zone = ({
  area,
  title,
  vertical = false,
  action,
  children,
}: {
  area: string;
  title?: string;
  vertical?: boolean;
  /** Кнопка праворуч від заголовка зони. */
  action?: ReactNode;
  children?: ReactNode;
}) => (
  <section
    className={`sheet-zone sheet-zone--${area}${vertical ? ' sheet-zone--rail' : ''}`}
    style={{ gridArea: area }}
    aria-label={title}
  >
    {title &&
      (action ? (
        <div className="sheet-zone__head">
          <h2 className="sheet-zone__title">{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className="sheet-zone__title">{title}</h2>
      ))}
    <div className="sheet-zone__body">{children ?? <span className="sheet-placeholder" />}</div>
  </section>
);

const CharacterSheetInner = () => {
  const {
    store,
    character,
    patchCharacter,
    updateCharacter,
    selectCharacter,
    addCharacter,
    duplicateActive,
    removeCharacter,
    importFromText,
  } = useCharacterStore();
  const { log, push, remove, clear } = useSheetLog();
  const narrow = useIsNarrow();

  // Картки-сповіщення живуть лише в межах сесії. Якби вони бралися з журналу,
  // після перезавантаження гравцеві пропонували б спалити імпульс на кидку,
  // зробленому минулого разу. Найновіша — перша.
  const [toasts, setToasts] = useState<SheetRoll[]>([]);

  // Яка карта піднята й чи відкрите вікно вибору — стан екрана, не персонажа:
  // після перезавантаження рука лежить закритою.
  const [raisedProfileId, setRaisedProfileId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dismissToast = useCallback(
    (id: string) => setToasts(current => current.filter(roll => roll.id !== id)),
    [],
  );

  if (!character) return <p className="sheet-empty">{UI.noCharacter}</p>;

  const showRoll = (roll: SheetRoll) => {
    setToasts(current => [roll, ...current].slice(0, MAX_TOASTS));
    push(roll);
  };

  const handleRoll = (attribute: AttrKey, adds: number) =>
    showRoll(
      rollAction(
        ATTR_LABELS[attribute],
        character.attributes[attribute],
        adds,
        character.momentum,
      ),
    );

  const lastRoll = toasts[0];
  const burnPreview =
    lastRoll?.kind === 'action' ? previewBurn(lastRoll, character.momentum) : null;

  const handleBurn = () => {
    if (lastRoll?.kind !== 'action') return;
    const burned = commitBurn(lastRoll, character.momentum);
    if (!burned) return;
    // Спалення переписує саме ту картку, на якій його запропонували: два
    // сповіщення про один кидок нічого не додають. У журналі записи окремі.
    setToasts(current => [burned, ...current.slice(1)]);
    push(burned);
    patchCharacter({ momentum: resetMomentum(character) });
  };

  const handleProgressRoll = (label: string, ticks: number) =>
    showRoll(rollProgress(label, ticks));

  /** Присяга змінюється завжди від актуального стану, а не від пропса. */
  const updateVow = (index: number, updater: (vow: ProgressTrack) => ProgressTrack) =>
    updateCharacter(current => ({
      ...current,
      vows: current.vows.map((vow, i) => (i === index ? updater(vow) : vow)),
    }));

  const addVow = () =>
    updateCharacter(current => ({ ...current, vows: [...current.vows, emptyVow()] }));

  /** Прибрати можна будь-яку присягу, але один рядок лишається завжди:
      видалена остання присяга поступається місцем порожній. */
  const removeVow = (id: string) =>
    updateCharacter(current => {
      const vows = current.vows.filter(vow => vow.id !== id);
      return { ...current, vows: vows.length > 0 ? vows : [emptyVow()] };
    });

  /** Стосунки живуть за тими самими правилами, що й присяги. */
  const updateBond = (index: number, updater: (bond: Track) => Track) =>
    updateCharacter(current => ({
      ...current,
      bonds: current.bonds.map((bond, i) => (i === index ? updater(bond) : bond)),
    }));

  const addBond = () =>
    updateCharacter(current => ({ ...current, bonds: [...current.bonds, emptyBond()] }));

  const removeBond = (id: string) =>
    updateCharacter(current => {
      const bonds = current.bonds.filter(bond => bond.id !== id);
      return { ...current, bonds: bonds.length > 0 ? bonds : [emptyBond()] };
    });

  const updateExtraTrack = (id: string, updater: (track: ExtraTrack) => ExtraTrack) =>
    updateCharacter(current => ({
      ...current,
      extraTracks: current.extraTracks.map(track => (track.id === id ? updater(track) : track)),
    }));

  const addExtraTrack = (kind: TrackKind) =>
    updateCharacter(current => ({
      ...current,
      extraTracks: [
        ...current.extraTracks,
        { id: newId(), name: '', rank: 'dangerous', ticks: 0, kind },
      ],
    }));

  // ── Профілі ─────────────────────────────────────────────────────────
  // Каталог у стан не копіюється: у персонажі лежить лише ключ картки
  // та робота гравця над нею (PROFILES_PLAN.md §4.2).
  const profiles = resolveProfiles(character.profiles);

  /** Доданий профіль стає останнім у руці й одразу піднятим (§6.1). */
  const addProfile = (profile: Profile) => {
    const entry = emptyCharacterProfile(profile);
    updateCharacter(current => ({ ...current, profiles: [...current.profiles, entry] }));
    setRaisedProfileId(entry.id);
    setPickerOpen(false);
  };

  const updateProfile = (
    id: string,
    updater: (entry: CharacterProfile) => CharacterProfile,
  ) =>
    updateCharacter(current => ({
      ...current,
      profiles: current.profiles.map(entry => (entry.id === id ? updater(entry) : entry)),
    }));

  const removeProfile = (id: string) => {
    updateCharacter(current => ({
      ...current,
      profiles: current.profiles.filter(entry => entry.id !== id),
    }));
    setRaisedProfileId(current => (current === id ? null : current));
  };

  const addProfileButton = (
    <button
      type="button"
      className="zone-add"
      onClick={() => setPickerOpen(true)}
      aria-label={UI.addProfile}
      title={UI.addProfile}
    >
      +
    </button>
  );

  return (
    <div className="character-sheet-page">
      <div className="character-sheet">
        <section className="sheet-zone sheet-zone--name" style={{ gridArea: 'name' }}>
          <div className="sheet-zone__head">
            <h2 className="sheet-zone__title">{SHEET.character}</h2>
            <CharacterBar
              store={store}
              character={character}
              onSelect={selectCharacter}
              onAdd={addCharacter}
              onDuplicate={duplicateActive}
              onRemove={removeCharacter}
              onImport={importFromText}
            />
          </div>
          <input
            className="sheet-name-input"
            value={character.name}
            onChange={event => patchCharacter({ name: event.target.value })}
            placeholder={UI.namePlaceholder}
            aria-label={UI.namePlaceholder}
          />
        </section>

        <Zone area="xp" title={SHEET.experience}>
          <XpTrack
            character={character}
            onToggle={index =>
              updateCharacter(current => ({
                ...current,
                xp: current.xp.map((cell, i) => (i === index ? nextXpState(cell) : cell)),
              }))
            }
          />
        </Zone>

        <Zone area="attrs">
          <AttributeBoxes
            character={character}
            onStep={(attribute, delta) =>
              updateCharacter(current => ({
                ...current,
                attributes: {
                  ...current.attributes,
                  [attribute]: clampAttribute(current.attributes[attribute] + delta),
                },
              }))
            }
            onRoll={handleRoll}
          />
        </Zone>

        <Zone area="momentum" title={SHEET.momentum} vertical>
          <MomentumTrack
            character={character}
            onChange={momentum => patchCharacter({ momentum })}
          />
        </Zone>

        <Zone area="stats" title={SHEET.stats} vertical>
          <StatTracks
            character={character}
            onChange={(stat, value) =>
              updateCharacter(current => ({
                ...current,
                stats: { ...current.stats, [stat]: clampStat(value) },
              }))
            }
          />
        </Zone>

        <Zone
          area="vows"
          title={SHEET.vows}
          action={
            <button
              type="button"
              className="zone-add"
              onClick={addVow}
              aria-label={UI.addVow}
              title={UI.addVow}
            >
              +
            </button>
          }
        >
          {character.vows.map((vow, index) => (
            <VowRow
              key={vow.id}
              vow={vow}
              label={vowLabel(vow.name, index)}
              isOnly={character.vows.length === 1}
              onUpdate={updater => updateVow(index, updater)}
              onRemove={() => removeVow(vow.id)}
              onRoll={() => handleProgressRoll(vowLabel(vow.name, index), vow.ticks)}
            />
          ))}
        </Zone>

        <Zone area="notes" title={SHEET.notes}>
          <textarea
            className="notes-input"
            value={character.notes}
            placeholder={UI.notesPlaceholder}
            aria-label={SHEET.notes}
            onChange={event => patchCharacter({ notes: event.target.value })}
          />
        </Zone>

        <Zone
          area="bonds"
          title={SHEET.bonds}
          action={
            <button
              type="button"
              className="zone-add"
              onClick={addBond}
              aria-label={UI.addBond}
              title={UI.addBond}
            >
              +
            </button>
          }
        >
          {character.bonds.map((bond, index) => (
            <BondRow
              key={bond.id}
              bond={bond}
              label={bondLabel(bond.name, index)}
              isOnly={character.bonds.length === 1}
              onUpdate={updater => updateBond(index, updater)}
              onRemove={() => removeBond(bond.id)}
              onRoll={() => handleProgressRoll(bondLabel(bond.name, index), bond.ticks)}
            />
          ))}
        </Zone>

        <Zone area="debil" title={SHEET.debilities}>
          <DebilitiesBox
            character={character}
            onToggle={(debility, marked) =>
              updateCharacter(current => ({
                ...current,
                debilities: { ...current.debilities, [debility]: marked },
              }))
            }
          />
        </Zone>

        {/* На телефоні зони немає — замість неї приклеєний футер (рішення №5). */}
        {!narrow && (
          <Zone area="profiles" title={SHEET.profiles} action={addProfileButton}>
            <ProfilesZone
              entries={profiles}
              raisedId={raisedProfileId}
              onRaise={setRaisedProfileId}
              onUpdate={updateProfile}
              onRemove={removeProfile}
            />
          </Zone>
        )}

        <Zone area="tracks" title={SHEET.tracks}>
          <ExtraTracksSection
            character={character}
            onAdd={addExtraTrack}
            onUpdate={updateExtraTrack}
            onRemove={id =>
              updateCharacter(current => ({
                ...current,
                extraTracks: current.extraTracks.filter(track => track.id !== id),
              }))
            }
            onRoll={handleProgressRoll}
          />
        </Zone>

        <Zone area="log" title={SHEET.log}>
          <RollLog log={log} onRemove={remove} onClear={clear} />
        </Zone>
      </div>

      {/* Поза сіткою: стос висить над сторінкою, а не займає в ній зону. */}
      <RollToasts
        rolls={toasts}
        burnPreview={burnPreview}
        onBurn={handleBurn}
        onDismiss={dismissToast}
      />

      {narrow && (
        <ProfilesFooter
          entries={profiles}
          onAdd={() => setPickerOpen(true)}
          onUpdate={updateProfile}
          onRemove={removeProfile}
        />
      )}

      {pickerOpen && (
        <ProfilePicker
          taken={character.profiles.map(entry => entry.profileId)}
          onAdd={addProfile}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Аркуш існує лише українською (CHARACTER_SHEET_PLAN.md §10),
 * тож будь-яка інша мова веде на /uk/character.
 */
const CharacterSheet = ({ currentLang }: { currentLang: string }) =>
  currentLang === 'uk' ? <CharacterSheetInner /> : <Navigate to="/uk/character" replace />;

export default CharacterSheet;
