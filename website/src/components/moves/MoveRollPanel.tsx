// Панель «Кидайте» на картці ходу в шторці аркуша: рядки з числами
// персонажа, додатки, крок втрати, вибір шкали чи шансів. Сама кнопка
// кидка — у нижній смузі шторки (MovesDrawer), щоб завжди була під рукою.

import type { Character } from '../../utils/character/types';
import { boxesFilled } from '../../utils/character/rules';
import { RANK_LABELS, STAT_LABELS } from '../../utils/character/labels';
import type { Move } from '../../utils/moves';
import {
  NO_TRACKS,
  applyLoss,
  companions,
  lossValue,
  oracleOdds,
  progressTracks,
  rollBlocker,
  rollOptions,
  rollSpec,
  sufferRollValue,
} from '../../utils/moves/play';
import { MAX_ADDS, MAX_HARM, toggleableBonuses, type RollDraft } from './rollDraft';

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <span className="play-stepper">
      <span className="play-stepper__label">{label}</span>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label}: зменшити`}>
        −
      </button>
      <output className="play-stepper__value" aria-label={label}>
        {label === 'Додатки' ? signed(value) : value}
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label}: збільшити`}>
        +
      </button>
    </span>
  );
}

function RadioRow({
  checked,
  label,
  value,
  onSelect,
}: {
  checked: boolean;
  label: string;
  value: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={`play-option ${checked ? 'is-checked' : ''}`}
      onClick={onSelect}
    >
      <span className="play-option__dot" aria-hidden="true" />
      <span className="play-option__label">{label}</span>
      <span className="play-option__value">{value}</span>
    </button>
  );
}

export default function MoveRollPanel({
  move,
  character,
  draft,
  onDraft,
  onCharacter,
}: {
  move: Move;
  character: Character;
  draft: RollDraft;
  onDraft: (patch: Partial<RollDraft>) => void;
  /** Крок втрати змінює персонажа одразу, ще до кидка. */
  onCharacter: (next: (current: Character) => Character) => void;
}) {
  const spec = rollSpec(move);
  const adds = <Stepper label="Додатки" value={draft.adds} min={0} max={MAX_ADDS} onChange={value => onDraft({ adds: value })} />;

  if (spec.kind === 'action') {
    const options = rollOptions(move, character);
    const bonuses = toggleableBonuses(move);
    const blocker = rollBlocker(move, character);
    return (
      <div className="play-panel">
        <div className="play-options" role="radiogroup" aria-label="Як ви дієте">
          {options.map(option => (
            <RadioRow
              key={option.key}
              checked={draft.optionKey === option.key}
              label={option.label}
              value={`${option.statText} ${signed(option.value)}`}
              onSelect={() => onDraft({ optionKey: option.key })}
            />
          ))}
        </div>
        <div className="play-row">
          {adds}
          {bonuses.map(bonus => {
            const on = draft.bonuses.includes(bonus);
            return (
              <button
                key={bonus}
                type="button"
                className={`play-bonus ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                onClick={() =>
                  onDraft({ bonuses: on ? draft.bonuses.filter(b => b !== bonus) : [...draft.bonuses, bonus] })
                }
              >
                {bonus}
              </button>
            );
          })}
        </div>
        {blocker && <p className="play-note">{blocker}</p>}
      </div>
    );
  }

  if (spec.kind === 'sufferThenRoll') {
    const list = companions(character);
    const needsCompanion = spec.lose === 'companionHealth';
    const current = lossValue(character, spec.lose, draft.companionId ?? undefined);
    const after = applyLoss(character, spec.lose, draft.harm, draft.companionId ?? undefined);
    const lostName = spec.lose === 'companionHealth' ? 'Здоров’я супутника' : STAT_LABELS[spec.lose];
    const momentumLoss = character.momentum - after.momentum;
    const roll = sufferRollValue(character, spec, draft.companionId ?? undefined);
    return (
      <div className="play-panel">
        {needsCompanion &&
          (list.length === 0 ? (
            <p className="play-note">У руці немає супутника зі шкалою здоров’я — додайте профіль-супутника.</p>
          ) : (
            <div className="play-options" role="radiogroup" aria-label="Супутник">
              {list.map(companion => (
                <RadioRow
                  key={companion.id}
                  checked={draft.companionId === companion.id}
                  label={companion.name}
                  value={`Здоров’я ${companion.health}`}
                  onSelect={() => onDraft({ companionId: companion.id, lossApplied: false })}
                />
              ))}
            </div>
          ))}
        <p className="play-step">1. Втрата</p>
        <div className="play-row">
          <Stepper
            label={spec.lose === 'spirit' ? 'Стрес' : 'Шкода'}
            value={draft.harm}
            min={1}
            max={MAX_HARM}
            onChange={value => onDraft({ harm: value, lossApplied: false })}
          />
          {draft.lossApplied ? (
            <span className="play-done">✓ Втрату застосовано</span>
          ) : (
            <button
              type="button"
              className="play-apply"
              disabled={needsCompanion && list.length === 0}
              onClick={() => {
                onCharacter(c => applyLoss(c, spec.lose, draft.harm, draft.companionId ?? undefined));
                onDraft({ lossApplied: true });
              }}
            >
              Застосувати: {lostName} {current} → {lossValue(after, spec.lose, draft.companionId ?? undefined)}
              {momentumLoss > 0 && `, імпульс −${momentumLoss}`}
            </button>
          )}
        </div>
        <p className="play-step">2. Кидок</p>
        <div className="play-row">
          <span className="play-sum">
            {roll.text} → <strong>{signed(roll.value)}</strong>
          </span>
          {adds}
        </div>
      </div>
    );
  }

  if (spec.kind === 'progress') {
    const tracks = progressTracks(character, spec.tracks);
    if (tracks.length === 0) return <p className="play-note">{NO_TRACKS[spec.tracks]}</p>;
    return (
      <div className="play-panel">
        <div className="play-options" role="radiogroup" aria-label="Шкала прогресу">
          {tracks.map(track => {
            const boxes = boxesFilled(track.ticks);
            const rank = track.rank ? `${RANK_LABELS[track.rank]} · ` : '';
            return (
              <RadioRow
                key={track.id}
                checked={(draft.trackId ?? tracks[0].id) === track.id}
                label={track.label}
                value={`${rank}${boxes} ${boxes === 1 ? 'клітина' : 'клітин'}`}
                onSelect={() => onDraft({ trackId: track.id })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (spec.kind === 'askTheOracle') {
    return (
      <div className="play-panel">
        <div className="play-options" role="radiogroup" aria-label="Шанси на «так»">
          {oracleOdds(move).map(odds => (
            <RadioRow
              key={odds.row}
              checked={draft.oddsRow === odds.row}
              label={odds.label}
              value={`«так» від ${odds.min}`}
              onSelect={() => onDraft({ oddsRow: odds.row })}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
