// Журнал кидків: компактні рядки, найновіші зверху.

import type { SheetRoll } from '../../utils/character/diceEngine';
import { OUTCOME_LABELS, UI, formatScaleValue } from '../../utils/character/labels';

function describeRoll(roll: SheetRoll): string {
  const challenge = roll.challengeDice
    .map((value, index) =>
      roll.kind === 'action' && roll.canceledChallenge[index] ? `(${value})` : `${value}`,
    )
    .join(', ');

  if (roll.kind === 'progress') return `${roll.boxes} проти ${challenge}`;

  const adds = roll.adds !== 0 ? ` ${formatScaleValue(roll.adds)}` : '';
  const die = roll.actionDieCanceled ? `(${roll.actionDie})` : `${roll.actionDie}`;
  return `${die} ${formatScaleValue(roll.stat)}${adds} = ${roll.actionScore} проти ${challenge}`;
}

const RollLog = ({
  log,
  onRemove,
  onClear,
}: {
  log: SheetRoll[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) => {
  if (log.length === 0) return <p className="log-empty">{UI.emptyLog}</p>;

  return (
    <>
      <ul className="roll-log">
        {log.map(roll => (
          <li key={roll.id} className={`log-row log-row--${roll.outcome}`}>
            <span className="log-row__label">{roll.label}</span>
            <span className="log-row__dice">{describeRoll(roll)}</span>
            <span className="log-row__outcome">{OUTCOME_LABELS[roll.outcome]}</span>
            {roll.kind === 'action' && roll.momentumBurned && (
              <span className="log-row__flag" title={UI.burnMomentum}>
                🔥
              </span>
            )}
            {roll.matched && (
              <span className="log-row__flag" title={UI.matched}>
                ⚑
              </span>
            )}
            <button
              type="button"
              className="log-row__remove"
              onClick={() => onRemove(roll.id)}
              aria-label={`${UI.remove}: ${roll.label}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="log-clear" onClick={onClear}>
        {UI.clearLog}
      </button>
    </>
  );
};

export default RollLog;
