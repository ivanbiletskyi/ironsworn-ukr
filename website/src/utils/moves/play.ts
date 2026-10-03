// Хід у контексті персонажа: що кидати, які шкали підходять, що означає
// наслідок і як його застосувати. Лише чисті функції — шторка на аркуші
// викликає їх, а кидки робить наявний diceEngine.
//
// Обмеження ті самі, що й на аркуші (rules.ts): імпульс у межах
// слабкостей, «Поранений» блокує Здоров’я, позначки прогресу за рангом.

import type { AttrKey, Character, DebilityKey, StatKey } from '../character/types';
import { MAX_STAT, MAX_TICKS, MIN_MOMENTUM, STAT_KEYS } from '../character/types';
import {
  blockingDebility,
  clampMomentum,
  clampStat,
  markBondProgress,
  markProgress,
} from '../character/rules';
import { ATTR_LABELS, DEBILITY_LABELS, STAT_LABELS } from '../character/labels';
import { profileLabel, resolveProfiles } from '../character/profiles';
import type { Effect, Move, MoveStat, MoveTable, RollOption, RollSpec, TrackKindForMove } from './move-types';
import { isTable } from './move-types';
import { getMove, statLabel } from './index';

// ── Форма кидка ───────────────────────────────────────────────────────

/** Форма кидка ходу: задана в даних або виведена з підходів і статів. */
export function rollSpec(move: Move): RollSpec {
  if (move.roll) return move.roll;
  if (move.rollKind !== 'action') return { kind: 'none' };
  const options: RollOption[] = move.approaches
    ? move.approaches.map(approach => ({ label: approach.when, stat: approach.stat }))
    : move.stats.map(stat => ({ label: statLabel(stat), stat }));
  return { kind: 'action', options };
}

export interface PlayOption {
  key: string;
  label: string;
  /** «Вістря» або «нижче з Розуму й Заліза». */
  statText: string;
  value: number;
}

const isStat = (stat: MoveStat): stat is StatKey => (STAT_KEYS as readonly string[]).includes(stat);

/** Значення стату персонажа. Здоров’я супутника береться окремо. */
export function statValue(character: Character, stat: Exclude<MoveStat, 'companionHealth'>): number {
  return isStat(stat) ? character.stats[stat] : character.attributes[stat as AttrKey];
}

/** Рядки панелі кидка ходу дії з уже порахованими значеннями. */
export function rollOptions(move: Move, character: Character): PlayOption[] {
  const spec = rollSpec(move);
  if (spec.kind !== 'action') return [];
  return spec.options.map((option, index) => {
    if ('lowerOf' in option) {
      const [a, b] = option.lowerOf;
      return {
        key: `${index}`,
        label: option.label,
        statText: `нижче з ${ATTR_LABELS[a]} і ${ATTR_LABELS[b]}`,
        value: Math.min(character.attributes[a], character.attributes[b]),
      };
    }
    const stat = option.stat === 'companionHealth' ? 'heart' : option.stat;
    return { key: `${index}`, label: option.label, statText: statLabel(stat), value: statValue(character, stat) };
  });
}

/** Чому хід зараз не кинути, або null. */
export function rollBlocker(move: Move, character: Character): string | null {
  if (move.id === 'check-your-gear' && character.stats.supply < 1) {
    return 'Потрібно щонайменше +1 Припас';
  }
  return null;
}

// ── Супутники ─────────────────────────────────────────────────────────

export interface Companion {
  /** id рядка профілю в руці персонажа. */
  id: string;
  name: string;
  /** Вибрана клітинка шкали картки: 0, +1 … +5. */
  health: number;
  max: number;
}

/** Супутники з руки персонажа — профілі зі шкалою здоров’я. */
export function companions(character: Character): Companion[] {
  return resolveProfiles(character.profiles)
    .filter(({ profile }) => profile.type === 'companion' && profile.track)
    .map(({ entry, profile }) => ({
      id: entry.id,
      name: profileLabel(entry, profile),
      health: entry.trackIndex ?? 0,
      max: (profile.track?.cells.length ?? 1) - 1,
    }));
}

// ── Спершу втрата, потім кидок ────────────────────────────────────────

export type LossTarget = 'health' | 'spirit' | 'companionHealth';

/** Скільки зараз у показника, від якого віднімається шкода чи стрес. */
export function lossValue(character: Character, lose: LossTarget, companionId?: string): number {
  if (lose === 'companionHealth') {
    return companions(character).find(c => c.id === companionId)?.health ?? 0;
  }
  return character.stats[lose];
}

/**
 * Втрата показника: «втратьте Здоров’я рівне шкоді; якщо Здоров’я 0 —
 * втратьте імпульс». Надлишок понад нуль іде з імпульсу.
 */
export function applyLoss(
  character: Character,
  lose: LossTarget,
  amount: number,
  companionId?: string,
): Character {
  const current = lossValue(character, lose, companionId);
  const excess = Math.max(0, amount - current);
  const next = Math.max(0, current - amount);
  const momentum = clampMomentum(character.momentum - excess, character);
  if (lose === 'companionHealth') {
    return {
      ...character,
      momentum,
      profiles: character.profiles.map(entry =>
        entry.id === companionId ? { ...entry, trackIndex: next } : entry,
      ),
    };
  }
  return { ...character, momentum, stats: { ...character.stats, [lose]: next } };
}

/** Значення кидка після втрати: вище з показника й атрибута. */
export function sufferRollValue(
  character: Character,
  spec: Extract<RollSpec, { kind: 'sufferThenRoll' }>,
  companionId?: string,
): { value: number; text: string } {
  const lost = lossValue(character, spec.lose, companionId);
  const attr = character.attributes[spec.versus];
  const lostName = spec.lose === 'companionHealth' ? 'Здоров’я супутника' : STAT_LABELS[spec.lose];
  return {
    value: Math.max(lost, attr),
    text: `вище з ${lostName} ${lost} і ${ATTR_LABELS[spec.versus]} ${attr}`,
  };
}

// ── Шкали прогресу ────────────────────────────────────────────────────

export interface PlayTrack {
  id: string;
  label: string;
  ticks: number;
  /** Немає лише у спільної шкали стосунків. */
  rank?: Character['vows'][number]['rank'];
}

export const BOND_TRACK_ID = 'bonds';

/** Шкали персонажа, що підходять ходу прогресу чи наслідку «Позначте прогрес». */
export function progressTracks(character: Character, kind: TrackKindForMove): PlayTrack[] {
  if (kind === 'bond') return [{ id: BOND_TRACK_ID, label: 'Стосунки', ticks: character.bondTicks }];
  if (kind === 'vow') {
    return character.vows.map((vow, index) => ({
      id: vow.id,
      label: vow.name.trim() || `Присяга ${index + 1}`,
      ticks: vow.ticks,
      rank: vow.rank,
    }));
  }
  return character.extraTracks
    .filter(track => track.kind === kind)
    .map(track => ({
      id: track.id,
      label: track.name.trim() || (kind === 'combat' ? 'Бій' : 'Подорож'),
      ticks: track.ticks,
      rank: track.rank,
    }));
}

export const NO_TRACKS: Record<TrackKindForMove, string> = {
  vow: 'Немає присяг — додайте присягу на аркуші',
  combat: 'Немає треку бою — додайте його в «Треках» аркуша',
  journey: 'Немає треку подорожі — додайте його в «Треках» аркуша',
  bond: 'Немає шкали стосунків',
};

function markTrack(character: Character, kind: TrackKindForMove, trackId: string): Character {
  if (kind === 'bond') return { ...character, bondTicks: markBondProgress(character.bondTicks) };
  if (kind === 'vow') {
    return {
      ...character,
      vows: character.vows.map(vow =>
        vow.id === trackId ? { ...vow, ticks: markProgress(vow.ticks, vow.rank) } : vow,
      ),
    };
  }
  return {
    ...character,
    extraTracks: character.extraTracks.map(track =>
      track.id === trackId ? { ...track, ticks: markProgress(track.ticks, track.rank) } : track,
    ),
  };
}

// ── Наслідки ──────────────────────────────────────────────────────────

/** Контекст наслідку: яку шкалу позначати, коли їх кілька. */
export interface EffectContext {
  trackId?: string;
}

export interface EffectPreview {
  label: string;
  /** «4 → 5»; немає для наслідків без числа. */
  change?: string;
  /** Чому наслідок нічого не змінить. */
  disabled?: string;
  /** Хід із правил, до якого веде вичерпаний показник. */
  followUp?: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Хід, що підхоплює, коли показник уже на нулі. */
const EXHAUSTED_MOVE: Partial<Record<StatKey, string>> = { supply: 'out-of-supply' };

export function effectLabel(effect: Effect): string {
  switch (effect.kind) {
    case 'momentum':
      return `Імпульс ${signed(effect.delta)}`;
    case 'stat':
      return `${STAT_LABELS[effect.stat]} ${signed(effect.delta)}`;
    case 'progress':
      return effect.tracks === 'bond' ? 'Позначка на шкалі стосунків' : 'Позначити прогрес';
    case 'debility':
      return `${effect.marked ? 'Відмітити' : 'Зняти'} «${DEBILITY_LABELS[effect.key]}»`;
    case 'move': {
      const target = getMove(effect.moveId);
      const name = target?.name ?? effect.moveId;
      return effect.harm ? `→ ${name} (${effect.harm})` : `→ ${name}`;
    }
  }
}

export function previewEffect(character: Character, effect: Effect, context: EffectContext = {}): EffectPreview {
  const label = effectLabel(effect);
  switch (effect.kind) {
    case 'momentum': {
      const from = character.momentum;
      const to = clampMomentum(from + effect.delta, character);
      if (to !== from) return { label, change: `${signed(from)} → ${signed(to)}` };
      return effect.delta > 0
        ? { label, disabled: 'Імпульс уже максимальний' }
        : {
            label,
            disabled: 'Імпульс уже мінімальний',
            followUp: from === MIN_MOMENTUM ? 'face-a-setback' : undefined,
          };
    }
    case 'stat': {
      const from = character.stats[effect.stat];
      if (effect.delta > 0) {
        const blocker = blockingDebility(character, effect.stat);
        if (blocker) return { label, disabled: `${DEBILITY_LABELS[blocker]}: не можна підняти` };
        if (from >= MAX_STAT) return { label, disabled: `${STAT_LABELS[effect.stat]} уже максимум` };
      }
      const to = clampStat(from + effect.delta);
      if (to === from) {
        return { label, disabled: `${STAT_LABELS[effect.stat]} уже 0`, followUp: EXHAUSTED_MOVE[effect.stat] };
      }
      return { label, change: `${from} → ${to}` };
    }
    case 'progress': {
      const tracks = progressTracks(character, effect.tracks);
      if (tracks.length === 0) return { label, disabled: NO_TRACKS[effect.tracks] };
      const track = tracks.find(t => t.id === context.trackId) ?? tracks[0];
      if (track.ticks >= MAX_TICKS) return { label, disabled: `«${track.label}» уже заповнено` };
      const next = effect.tracks === 'bond' ? markBondProgress(track.ticks) : markProgress(track.ticks, track.rank!);
      return { label, change: `${track.label}: ${track.ticks} → ${next} позначок` };
    }
    case 'debility':
      return character.debilities[effect.key] === effect.marked
        ? { label, disabled: effect.marked ? 'Уже відмічено' : 'Не відмічено' }
        : { label };
    case 'move':
      return { label };
  }
}

/** Застосувати наслідок. Наслідок-хід персонажа не змінює. */
export function applyEffect(character: Character, effect: Effect, context: EffectContext = {}): Character {
  switch (effect.kind) {
    case 'momentum':
      return { ...character, momentum: clampMomentum(character.momentum + effect.delta, character) };
    case 'stat': {
      if (effect.delta > 0 && blockingDebility(character, effect.stat)) return character;
      const value = clampStat(character.stats[effect.stat] + effect.delta);
      return { ...character, stats: { ...character.stats, [effect.stat]: value } };
    }
    case 'progress': {
      const tracks = progressTracks(character, effect.tracks);
      const track = tracks.find(t => t.id === context.trackId) ?? tracks[0];
      return track ? markTrack(character, effect.tracks, track.id) : character;
    }
    case 'debility':
      return { ...character, debilities: { ...character.debilities, [effect.key]: effect.marked } };
    case 'move':
      return character;
  }
}

/**
 * Скасувати застосований наслідок: повернути лише те поле, яке він змінив,
 * зі знімка `before`. Решта змін, зроблених відтоді, лишається.
 */
export function revertEffect(
  current: Character,
  before: Character,
  effect: Effect,
  context: EffectContext = {},
): Character {
  switch (effect.kind) {
    case 'momentum':
      return { ...current, momentum: before.momentum };
    case 'stat':
      return { ...current, stats: { ...current.stats, [effect.stat]: before.stats[effect.stat] } };
    case 'progress': {
      if (effect.tracks === 'bond') return { ...current, bondTicks: before.bondTicks };
      const id = context.trackId ?? progressTracks(before, effect.tracks)[0]?.id;
      const key = effect.tracks === 'vow' ? 'vows' : 'extraTracks';
      const old = (before[key] as { id: string; ticks: number }[]).find(t => t.id === id);
      if (!old) return current;
      return {
        ...current,
        [key]: (current[key] as { id: string; ticks: number }[]).map(t =>
          t.id === id ? { ...t, ticks: old.ticks } : t,
        ),
      };
    }
    case 'debility':
      return {
        ...current,
        debilities: { ...current.debilities, [effect.key]: before.debilities[effect.key as DebilityKey] },
      };
    case 'move':
      return current;
  }
}

// ── d100 ──────────────────────────────────────────────────────────────

/** «1–2», «51–00» → межі; «00» на d100 — це 100. */
function parseRange(range: string): [number, number] | null {
  const match = range.match(/^(\d+)\s*[–-]\s*(\d+)$/);
  if (!match) return null;
  const read = (part: string) => (part === '00' ? 100 : Number(part));
  return [read(match[1]), read(match[2])];
}

/** Чи кидається таблиця на d100: перший стовпчик — діапазони. */
export function isD100Table(table: MoveTable): boolean {
  return table.head[0] === 'd100' && table.rows.every(([range]) => parseRange(range) !== null);
}

/** Індекс рядка, у який падає значення d100. */
export function tableRowFor(table: MoveTable, value: number): number {
  return table.rows.findIndex(([range]) => {
    const bounds = parseRange(range);
    return bounds !== null && value >= bounds[0] && value <= bounds[1];
  });
}

export interface OracleOdds {
  label: string;
  /** Відповідь «так», якщо результат не менший. */
  min: number;
  /** Рядок таблиці «Спитати Оракула», що підсвічується. */
  row: number;
}

/** Шанси «Спитати Оракула» — з таблиці самого ходу, а не продубльовані. */
export function oracleOdds(move: Move): OracleOdds[] {
  const table = (move.after ?? []).find(isTable);
  if (!table) return [];
  return table.rows.map(([label, rule], row) => ({ label, min: Number.parseInt(rule, 10), row }));
}

export function oracleAnswer(odds: OracleOdds, value: number): 'Так' | 'Ні' {
  return value >= odds.min ? 'Так' : 'Ні';
}
