// Каталог ходів грального набору «Залізна Присяга»: 36 ходів у 6 категоріях,
// у порядку набору. Порядок незмінний — на ньому тримається просторова
// памʼять гравця (дизайн-план, «Запамʼятовування»).

export type {
  Approach,
  Effect,
  MoveListItem,
  RollOption,
  RollSpec,
  TrackKindForMove,
  Move,
  MoveBlock,
  MoveCategory,
  MoveOutcomes,
  MoveStat,
  MoveTable,
  RollKind,
} from './move-types';
export { MOVE_CATEGORIES, isTable, itemEffects, itemText } from './move-types';
export { OTHER_COMBAT_MOVES } from './moves-combat';

import type { Move, MoveBlock, MoveCategory, MoveStat } from './move-types';
import { MOVE_CATEGORIES, isTable, itemText } from './move-types';
import { ATTR_LABELS, STAT_LABELS } from '../character/labels';
import ADVENTURE from './moves-adventure';
import RELATIONSHIP from './moves-relationship';
import COMBAT from './moves-combat';
import SUFFER from './moves-suffer';
import QUEST from './moves-quest';
import FATE from './moves-fate';
import { normalize } from './normalize';

export const MOVES_BY_CATEGORY: Record<MoveCategory, Move[]> = {
  adventure: ADVENTURE,
  relationship: RELATIONSHIP,
  combat: COMBAT,
  suffer: SUFFER,
  quest: QUEST,
  fate: FATE,
};

export const MOVES: Move[] = MOVE_CATEGORIES.flatMap(category => MOVES_BY_CATEGORY[category]);

export interface CategoryMeta {
  /** Як у заголовку набору: «Ходи пригоди». */
  title: string;
  /** Для чіпів: «Пригода». */
  short: string;
}

export const CATEGORY_META: Record<MoveCategory, CategoryMeta> = {
  adventure: { title: 'Ходи пригоди', short: 'Пригода' },
  relationship: { title: 'Ходи стосунків', short: 'Стосунки' },
  combat: { title: 'Ходи битви', short: 'Битва' },
  suffer: { title: 'Ходи пошкоджень', short: 'Пошкодження' },
  quest: { title: 'Ходи завдань', short: 'Завдання' },
  fate: { title: 'Ходи оракулів', short: 'Оракул' },
};

const BY_ID = new Map(MOVES.map(move => [move.id, move]));

export function getMove(id: string | undefined): Move | undefined {
  return id === undefined ? undefined : BY_ID.get(id);
}

/**
 * Назва чи форма ходу → id. Форма, що підходить двом ходам («досвід»,
 * «відпочити»), годиться для пошуку, але не для посилання — її в індексі
 * немає, і курсив лишається просто курсивом.
 */
const NAME_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string | null>();
  for (const move of MOVES) {
    for (const form of [move.name, ...move.aliases]) {
      const key = normalize(form);
      const known = index.get(key);
      if (known === undefined) index.set(key, move.id);
      else if (known !== move.id) index.set(key, null);
    }
  }
  return new Map([...index].filter((entry): entry is [string, string] => entry[1] !== null));
})();

export function findMoveByName(text: string): Move | undefined {
  const id = NAME_INDEX.get(normalize(text));
  return id === undefined ? undefined : BY_ID.get(id);
}

const STAT_NAMES: Record<MoveStat, string> = {
  ...ATTR_LABELS,
  ...STAT_LABELS,
  companionHealth: 'Здоров’я супутника',
};

export function statLabel(stat: MoveStat): string {
  return STAT_NAMES[stat];
}

/** Бейдж кидка на картці: «+Розум», «на вибір», «прогрес», «без кидка», «d100». */
export function rollBadge(move: Move): string {
  if (move.badge) return move.badge;
  switch (move.rollKind) {
    case 'progress':
      return 'прогрес';
    case 'none':
      return 'без кидка';
    case 'oracle':
      return 'd100';
    case 'action':
      return move.stats.length > 2
        ? 'на вибір'
        : `+${move.stats.map(statLabel).join('/')}`;
  }
}

/** Усі рядки тексту ходу — для пошуку по решті тексту й для посилань. */
export function moveTexts(move: Move): string[] {
  const fromBlocks = (blocks: MoveBlock[] = []): string[] =>
    blocks.flatMap(block =>
      typeof block === 'string'
        ? [block]
        : isTable(block)
          ? block.rows.flat()
          : block.map(itemText),
    );
  return [
    ...fromBlocks(move.lead),
    ...(move.approaches ?? []).map(a => a.when),
    ...fromBlocks(move.outcomes?.strong),
    ...fromBlocks(move.outcomes?.weak),
    ...fromBlocks(move.outcomes?.miss),
    ...fromBlocks(move.after),
  ];
}

/** Курсив у тексті, без вкладеного жирного: `*Сплатіть ціну*`. */
export function italics(text: string): string[] {
  const plain = text.replace(/\*\*/g, '\uE000');
  return [...plain.matchAll(/\*([^*]+?)\*/g)].map(match => match[1].replace(/\uE000/g, ''));
}

/** Ходи, згадані курсивом у тексті цього ходу, у порядку першої згадки. */
export function relatedMoves(move: Move): Move[] {
  const seen = new Set<string>([move.id]);
  const related: Move[] = [];
  for (const text of moveTexts(move)) {
    for (const name of italics(text)) {
      const target = findMoveByName(name);
      if (target && !seen.has(target.id)) {
        seen.add(target.id);
        related.push(target);
      }
    }
  }
  return related;
}

/** Хід, що ставиться за замовчуванням, коли не знаєте, що робити. */
export const FALLBACK_MOVE_IDS = ['face-danger', 'ask-the-oracle'] as const;

/** Найчастіші ходи для порожньої панелі деталей на десктопі. */
export const FREQUENT_MOVE_IDS = [
  'face-danger',
  'secure-an-advantage',
  'gather-information',
  'strike',
  'clash',
  'pay-the-price',
] as const;
