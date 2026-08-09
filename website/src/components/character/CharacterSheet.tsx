// Аркуш персонажа. Етап 2: маршрут, каркас розкладки, автозбереження.
// Вміст зон додається на етапах 3–8 (див. CHARACTER_SHEET_PLAN.md §11).

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AttrKey, ExtraTrack, ProgressTrack, TrackKind } from '../../utils/character/types';
import { newId } from '../../utils/character/storage';
import type { SheetRoll } from '../../utils/character/diceEngine';
import { commitBurn, previewBurn, rollAction, rollProgress } from '../../utils/character/diceEngine';
import { ATTR_LABELS, SHEET, UI } from '../../utils/character/labels';
import {
  clampAttribute,
  clampStat,
  markBondProgress,
  markProgress,
  nextXpState,
  resetMomentum,
  toggleBoxTick,
} from '../../utils/character/rules';
import { useCharacterStore } from './useCharacterStore';
import { useSheetLog } from './useSheetLog';
import AttributeBoxes from './AttributeBoxes';
import MomentumTrack from './MomentumTrack';
import StatTracks from './StatTracks';
import DebilitiesBox from './DebilitiesBox';
import RollResultCard from './RollResultCard';
import RollLog from './RollLog';
import ProgressTrackRow from './ProgressTrackRow';
import XpTrack from './XpTrack';
import CharacterBar from './CharacterBar';
import ExtraTracksSection from './ExtraTracksSection';
import './CharacterSheet.css';

const vowLabel = (name: string, index: number) => name.trim() || `Присяга ${index + 1}`;

/** Зона аркуша. `area` — ім'я з grid-template-areas. */
const Zone = ({
  area,
  title,
  vertical = false,
  children,
}: {
  area: string;
  title?: string;
  vertical?: boolean;
  children?: ReactNode;
}) => (
  <section
    className={`sheet-zone sheet-zone--${area}${vertical ? ' sheet-zone--rail' : ''}`}
    style={{ gridArea: area }}
    aria-label={title}
  >
    {title && <h2 className="sheet-zone__title">{title}</h2>}
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

  // Картка живе лише в межах сесії. Якби вона бралася з журналу, після
  // перезавантаження гравцеві пропонували б спалити імпульс на кидку,
  // зробленому минулого разу.
  const [lastRoll, setLastRoll] = useState<SheetRoll | null>(null);

  if (!character) return <p className="sheet-empty">{UI.noCharacter}</p>;

  const handleRoll = (attribute: AttrKey, adds: number) => {
    const roll = rollAction(
      ATTR_LABELS[attribute],
      character.attributes[attribute],
      adds,
      character.momentum,
    );
    setLastRoll(roll);
    push(roll);
  };

  const burnPreview =
    lastRoll?.kind === 'action' ? previewBurn(lastRoll, character.momentum) : null;

  const handleBurn = () => {
    if (lastRoll?.kind !== 'action') return;
    const burned = commitBurn(lastRoll, character.momentum);
    if (!burned) return;
    setLastRoll(burned);
    push(burned);
    patchCharacter({ momentum: resetMomentum(character) });
  };

  const handleProgressRoll = (label: string, ticks: number) => {
    const roll = rollProgress(label, ticks);
    setLastRoll(roll);
    push(roll);
  };

  /** Присяга змінюється завжди від актуального стану, а не від пропса. */
  const updateVow = (index: number, updater: (vow: ProgressTrack) => ProgressTrack) =>
    updateCharacter(current => ({
      ...current,
      vows: current.vows.map((vow, i) => (i === index ? updater(vow) : vow)),
    }));

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

  return (
    <div className="character-sheet-page">
      <CharacterBar
        store={store}
        character={character}
        onSelect={selectCharacter}
        onAdd={addCharacter}
        onDuplicate={duplicateActive}
        onRemove={removeCharacter}
        onImport={importFromText}
      />

      <div className="character-sheet">
        <section className="sheet-zone sheet-zone--name" style={{ gridArea: 'name' }}>
          <h2 className="sheet-zone__title">{SHEET.character}</h2>
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

        {lastRoll && (
          <Zone area="roll">
            {/* key змушує картку перемонтуватись, щоб анімація граників
                програлася на кожному кидку, а не лише на першому. */}
            <RollResultCard
              key={lastRoll.id}
              roll={lastRoll}
              burnPreview={burnPreview}
              onBurn={handleBurn}
            />
          </Zone>
        )}

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

        <Zone area="vows" title={SHEET.vows}>
          {character.vows.map((vow, index) => (
            <ProgressTrackRow
              key={vow.id}
              name={vow.name}
              rank={vow.rank}
              ticks={vow.ticks}
              namePlaceholder={UI.vowNamePlaceholder}
              onName={name => updateVow(index, current => ({ ...current, name }))}
              onRank={rank => updateVow(index, current => ({ ...current, rank }))}
              onMark={() =>
                updateVow(index, current => ({
                  ...current,
                  ticks: markProgress(current.ticks, current.rank),
                }))
              }
              onToggleBox={box =>
                updateVow(index, current => ({
                  ...current,
                  ticks: toggleBoxTick(current.ticks, box),
                }))
              }
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

        <Zone area="bonds" title={SHEET.bonds}>
          <ProgressTrackRow
            name={character.bondsNotes}
            ticks={character.bondsTicks}
            namePlaceholder={UI.bondsNotesPlaceholder}
            onName={bondsNotes => patchCharacter({ bondsNotes })}
            /* Рангу немає: за правилами стосунки завжди отримують одну позначку. */
            onMark={() =>
              updateCharacter(current => ({
                ...current,
                bondsTicks: markBondProgress(current.bondsTicks),
              }))
            }
            onToggleBox={box =>
              updateCharacter(current => ({
                ...current,
                bondsTicks: toggleBoxTick(current.bondsTicks, box),
              }))
            }
            onRoll={() => handleProgressRoll(SHEET.bonds, character.bondsTicks)}
          />
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
