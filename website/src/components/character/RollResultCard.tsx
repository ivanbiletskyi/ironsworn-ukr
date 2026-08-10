// Картка кидка: граники, результат і пропозиція спалити імпульс.
// Апка рахує наслідок спалення, але не вирішує за гравця (рішення №5).
// Картку показує стос сповіщень — див. RollToasts.tsx.

import type { ActionRollResult, SheetRoll } from '../../utils/character/diceEngine';
import { OUTCOME_LABELS, UI, formatScaleValue } from '../../utils/character/labels';

const OUTCOME_ICON = { strong: '✔', weak: '⚠', miss: '✘' } as const;

/** Один граник. Скасований — перекреслений і приглушений. */
const Die = ({
  value,
  kind,
  canceled = false,
}: {
  value: number;
  kind: 'action' | 'challenge' | 'progress';
  canceled?: boolean;
}) => (
  <span className={`die die--${kind}${canceled ? ' die--canceled' : ''}`}>{value}</span>
);

const ActionRollBody = ({ roll }: { roll: ActionRollResult }) => (
  <>
    <div className="roll-dice">
      <div className="roll-dice__group">
        {/* Перекреслений граник дає 0, тож рівність лишається правдивою. */}
        <Die value={roll.actionDie} kind="action" canceled={roll.actionDieCanceled} />
        <span className="roll-math">
          {formatScaleValue(roll.stat)}
          {roll.adds !== 0 && ` ${formatScaleValue(roll.adds)}`}
          {' = '}
          <strong>{roll.actionScore}</strong>
        </span>
      </div>
      <span className="roll-vs">проти</span>
      <div className="roll-dice__group">
        {roll.challengeDice.map((value, index) => (
          <Die
            key={index}
            value={value}
            kind="challenge"
            canceled={roll.canceledChallenge[index]}
          />
        ))}
      </div>
    </div>
    <div className="roll-legend">
      <span>граник дії</span>
      <span>граники виклику</span>
    </div>
  </>
);

const RollResultCard = ({
  roll,
  burnPreview,
  onBurn,
  onDismiss,
}: {
  roll: SheetRoll;
  /** Наслідок спалення, або null, якщо воно нічого не дає. */
  burnPreview: ActionRollResult | null;
  onBurn: () => void;
  /** Прибрати картку. Без нього кнопки «ОК» немає. */
  onDismiss?: () => void;
}) => (
  <div className={`roll-card roll-card--${roll.outcome}`}>
    <div className="roll-card__head">
      <span className="roll-card__label">{roll.label}</span>
      {roll.kind === 'action' && roll.momentumBurned && (
        <span className="roll-badge roll-badge--burn">{UI.burnMomentum}</span>
      )}
    </div>

    {roll.kind === 'action' ? (
      <ActionRollBody roll={roll} />
    ) : (
      <>
        <div className="roll-dice">
          <div className="roll-dice__group">
            <span className="roll-math">
              <strong>{roll.boxes}</strong> {roll.boxes === 1 ? 'клітина' : 'клітин'}
            </span>
          </div>
          <span className="roll-vs">проти</span>
          <div className="roll-dice__group">
            {roll.challengeDice.map((value, index) => (
              <Die key={index} value={value} kind="challenge" />
            ))}
          </div>
        </div>
        <div className="roll-legend">
          <span>заповнені клітини</span>
          <span>граники виклику</span>
        </div>
      </>
    )}

    {/* «ОК» стоїть у рядку результату, праворуч: там, де погляд уже спинився,
        прочитавши «точне влучання» чи «промах». */}
    <div className="roll-card__outcome-row">
      <p className="roll-outcome">
        {OUTCOME_ICON[roll.outcome]} {OUTCOME_LABELS[roll.outcome]}
      </p>
      {onDismiss && (
        <button
          type="button"
          className="roll-card__ok"
          onClick={onDismiss}
          title={UI.dismissRoll}
          aria-label={`${UI.dismissRoll}: ${roll.label}`}
        >
          {UI.ok}
        </button>
      )}
    </div>

    <div className="roll-notes">
      {roll.matched && <span className="roll-badge roll-badge--matched">{UI.matched}</span>}
      {roll.kind === 'action' && roll.actionDieCanceled && (
        <span className="roll-badge">{UI.actionDieCanceled}</span>
      )}
      {roll.kind === 'action' && roll.capped && <span className="roll-badge">{UI.capped}</span>}
    </div>

    {burnPreview && (
      <button type="button" className="burn-button" onClick={onBurn}>
        🔥 {UI.burnMomentum} → {OUTCOME_LABELS[burnPreview.outcome].toUpperCase()}
      </button>
    )}
  </div>
);

export default RollResultCard;
