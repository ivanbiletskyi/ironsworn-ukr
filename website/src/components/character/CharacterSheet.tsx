// Аркуш персонажа. Етап 2: маршрут, каркас розкладки, автозбереження.
// Вміст зон додається на етапах 3–8 (див. CHARACTER_SHEET_PLAN.md §11).

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AttrKey } from '../../utils/character/types';
import type { SheetRoll } from '../../utils/character/diceEngine';
import { commitBurn, previewBurn, rollAction } from '../../utils/character/diceEngine';
import { ATTR_LABELS, SHEET, UI } from '../../utils/character/labels';
import { clampAttribute, clampStat, resetMomentum } from '../../utils/character/rules';
import { useCharacterStore } from './useCharacterStore';
import { useSheetLog } from './useSheetLog';
import AttributeBoxes from './AttributeBoxes';
import MomentumTrack from './MomentumTrack';
import StatTracks from './StatTracks';
import DebilitiesBox from './DebilitiesBox';
import RollResultCard from './RollResultCard';
import RollLog from './RollLog';
import './CharacterSheet.css';

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
  const { character, patchCharacter, updateCharacter } = useCharacterStore();
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

  return (
    <div className="character-sheet-page">
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

        <Zone area="xp" title={SHEET.experience} />

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

        <Zone area="vows" title={SHEET.vows} />
        <Zone area="notes" title={SHEET.notes} />
        <Zone area="bonds" title={SHEET.bonds} />

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

        <Zone area="tracks" title={SHEET.tracks} />

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
