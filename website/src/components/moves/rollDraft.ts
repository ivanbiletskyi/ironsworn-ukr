// Чернетка кидка на картці ходу: що гравець вибрав у панелі (підхід,
// додатки, шкалу, шанси) і який кидок із цього вийде. Чиста логіка без
// React — панель і нижня смуга шторки лише показують її.

import type { Character } from '../../utils/character/types';
import type { OracleRollResult, SheetLogEntry } from '../../utils/character/diceEngine';
import { rollAction, rollOracle, rollProgress } from '../../utils/character/diceEngine';
import { boxesFilled } from '../../utils/character/rules';
import { ATTR_LABELS, STAT_LABELS } from '../../utils/character/labels';
import type { Move, MoveTable } from '../../utils/moves';
import { isTable } from '../../utils/moves';
import {
  NO_TRACKS,
  companions,
  lossValue,
  oracleAnswer,
  oracleOdds,
  progressTracks,
  rollBlocker,
  rollOptions,
  rollSpec,
  sufferRollValue,
  tableRowFor,
} from '../../utils/moves/play';
import { plain } from './moveMarkup';

export interface RollDraft {
  /** Вибраний рядок панелі; null — підхід ще не вибрано. */
  optionKey: string | null;
  adds: number;
  /** Увімкнені чіпи бонусів «+1 за стосунки…». */
  bonuses: string[];
  trackId: string | null;
  companionId: string | null;
  /** Шкода чи стрес для кроку втрати. */
  harm: number;
  /** Крок втрати вже застосовано до персонажа. */
  lossApplied: boolean;
  /** Рядок таблиці шансів «Спитати Оракула». */
  oddsRow: number | null;
}

export const MAX_ADDS = 5;
export const MAX_HARM = 5;

/** Бонуси, що додають рівно +1 і тому стають перемикачами. */
export function toggleableBonuses(move: Move): string[] {
  return (move.bonuses ?? []).filter(bonus => bonus.startsWith('+1'));
}

export function initialDraft(move: Move, character: Character, preset: Partial<RollDraft> = {}): RollDraft {
  const options = rollOptions(move, character);
  const spec = rollSpec(move);
  return {
    optionKey: options.length === 1 ? options[0].key : null,
    adds: 0,
    bonuses: [],
    trackId: spec.kind === 'progress' ? (progressTracks(character, spec.tracks)[0]?.id ?? null) : null,
    companionId: companions(character)[0]?.id ?? null,
    harm: 1,
    lossApplied: false,
    oddsRow: null,
    ...preset,
  };
}

export interface PreparedRoll {
  ready: boolean;
  /** Текст кнопки: «Кинути: d6 + 3 + 1». */
  label: string;
  /** Чому кинути не можна. */
  reason?: string;
  roll?: () => SheetLogEntry;
  /** Кидок d100 по таблиці ходу: ключ таблиці, рядок якої підсвітиться. */
  tableKey?: string;
}

const plus = (n: number) => (n > 0 ? ` + ${n}` : '');

/** Задовгий рядок таблиці в журналі обрізається — повний текст на картці. */
function shorten(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Кидок d100 по таблиці ходу; у журнал іде рядок, що випав. */
export function rollTable(label: string, table: MoveTable): OracleRollResult {
  return rollOracle(label, value => {
    const row = table.rows.at(tableRowFor(table, value));
    return row ? shorten(plain(row[1])) : '—';
  });
}

/** Ключ таблиці d100 у «after» ходу «Сплатити ціну». */
export function afterTableKey(move: Move): string | null {
  const index = (move.after ?? []).findIndex(isTable);
  return index === -1 ? null : `after.${index}`;
}

/** Що станеться після тапу на головну кнопку; null — хід без кидка. */
export function prepareRoll(move: Move, character: Character, draft: RollDraft): PreparedRoll | null {
  const spec = rollSpec(move);
  switch (spec.kind) {
    case 'none':
      return null;

    case 'action': {
      const blocker = rollBlocker(move, character);
      if (blocker) return { ready: false, label: 'Кинути', reason: blocker };
      const option = rollOptions(move, character).find(o => o.key === draft.optionKey);
      if (!option) return { ready: false, label: 'Оберіть, як дієте', reason: 'Оберіть рядок у «Кидайте»' };
      const adds = draft.adds + draft.bonuses.length;
      return {
        ready: true,
        label: `Кинути: d6 + ${option.value}${plus(adds)}`,
        roll: () => rollAction(`${move.name} · ${option.statText}`, option.value, adds, character.momentum),
      };
    }

    case 'sufferThenRoll': {
      if (spec.lose === 'companionHealth' && !companions(character).some(c => c.id === draft.companionId)) {
        return { ready: false, label: 'Кинути', reason: 'У руці немає супутника зі шкалою здоров’я' };
      }
      const { value } = sufferRollValue(character, spec, draft.companionId ?? undefined);
      const lost = lossValue(character, spec.lose, draft.companionId ?? undefined);
      const lostName = spec.lose === 'companionHealth' ? 'Здоров’я супутника' : STAT_LABELS[spec.lose];
      const used = lost >= character.attributes[spec.versus] ? lostName : ATTR_LABELS[spec.versus];
      const adds = draft.adds;
      return {
        ready: true,
        label: `Кинути: d6 + ${value}${plus(adds)}`,
        roll: () => rollAction(`${move.name} · ${used}`, value, adds, character.momentum),
      };
    }

    case 'progress': {
      const tracks = progressTracks(character, spec.tracks);
      if (tracks.length === 0) return { ready: false, label: 'Кинути', reason: NO_TRACKS[spec.tracks] };
      const track = tracks.find(t => t.id === draft.trackId) ?? tracks[0];
      const boxes = boxesFilled(track.ticks);
      return {
        ready: true,
        label: `Кинути проти ${boxes} ${boxes === 1 ? 'клітини' : 'клітин'}`,
        roll: () => rollProgress(`${move.name} · ${track.label}`, track.ticks),
      };
    }

    case 'askTheOracle': {
      const odds = oracleOdds(move).find(o => o.row === draft.oddsRow);
      if (!odds) return { ready: false, label: 'Оберіть шанси', reason: 'Оберіть, наскільки ймовірне «так»' };
      return {
        ready: true,
        label: 'Кинути d100',
        roll: () => rollOracle(`${move.name} · ${odds.label}`, value => oracleAnswer(odds, value)),
      };
    }

    case 'payThePrice': {
      const key = afterTableKey(move);
      const table = (move.after ?? []).find(isTable);
      if (!key || !table) return null;
      return { ready: true, label: 'Кинути d100 по таблиці', roll: () => rollTable(move.name, table), tableKey: key };
    }
  }
}
