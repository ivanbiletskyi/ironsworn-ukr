// Зона «Стосунки»: одна спільна шкала прогресу й перелік, з ким стосунки
// скріплено. За правилами (розділ «Стосунки», хід «Скріпити стосунки») шкала
// стосунків у персонажа одна: успішне «Скріпити стосунки» додає до неї одну
// позначку незалежно від того, з ким; а «Написати свій епілог» робить кидок
// прогресу за її заповненими клітинами. Перелік імен — нотатка, як лінійки
// під шкалою на паперовому аркуші (рішення №17).

import type { Bond } from '../../utils/character/types';
import { markBondProgress, toggleBoxTick } from '../../utils/character/rules';
import { isEmptyBond } from '../../utils/character/storage';
import { confirmBondRemoval, SHEET, UI } from '../../utils/character/labels';
import ProgressTrackRow from './ProgressTrackRow';
import { useTrackRemoval } from './useTrackRemoval';

/** Назва стосунку або «Стосунок N», якщо назви ще немає. */
const bondLabel = (name: string, index: number) => name.trim() || `Стосунок ${index + 1}`;

const BondEntry = ({
  bond,
  label,
  isOnly,
  onName,
  onRemove,
}: {
  bond: Bond;
  label: string;
  /** Єдиний рядок переліку — його порожнім прибирати нема сенсу. */
  isOnly: boolean;
  onName: (name: string) => void;
  onRemove: () => void;
}) => {
  const { action, confirm } = useTrackRemoval({
    empty: isEmptyBond(bond),
    label,
    removeLabel: UI.removeBond,
    confirmText: confirmBondRemoval(label),
    isOnly,
    onRemove,
  });

  return (
    <li className="bond-entry">
      <div className="bond-entry__row">
        <input
          className="bond-entry__name"
          value={bond.name}
          placeholder={UI.bondNamePlaceholder}
          aria-label={UI.bondNamePlaceholder}
          onChange={event => onName(event.target.value)}
        />
        {action}
      </div>
      {confirm}
    </li>
  );
};

const BondsBox = ({
  ticks,
  bonds,
  onTicks,
  onName,
  onRemove,
  onRoll,
}: {
  /** Спільна шкала стосунків, 0–40 позначок. */
  ticks: number;
  bonds: Bond[];
  onTicks: (updater: (ticks: number) => number) => void;
  onName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  /** Кидок прогресу за шкалою — це і є «Написати свій епілог». */
  onRoll: () => void;
}) => (
  <div className="bonds-box">
    <ProgressTrackRow
      ticks={ticks}
      /* Рангу немає: за правилами стосунки завжди отримують одну позначку. */
      onMark={() => onTicks(markBondProgress)}
      onToggleBox={box => onTicks(current => toggleBoxTick(current, box))}
      onRoll={onRoll}
      rollTitle={UI.bondsRollTitle}
    />

    <ul className="bond-list" aria-label={SHEET.bonds}>
      {bonds.map((bond, index) => (
        <BondEntry
          key={bond.id}
          bond={bond}
          label={bondLabel(bond.name, index)}
          isOnly={bonds.length === 1}
          onName={name => onName(bond.id, name)}
          onRemove={() => onRemove(bond.id)}
        />
      ))}
    </ul>
  </div>
);

export default BondsBox;
