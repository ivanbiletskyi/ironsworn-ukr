// Пошук ходів за назвою, синонімами й тригером. 36 записів фільтруються
// локально на кожне натискання, тож жодних бібліотек: зважена сума збігів
// основ слів по полях.
//
// Ранжування: початок назви > слово в назві > синонім > тригер > решта тексту.

import type { AttrKey } from '../character/types';
import type { Move, MoveCategory } from './move-types';
import { MOVES, moveTexts } from './index';
import { normalize, stem, words } from './normalize';

export interface MoveFilters {
  category?: MoveCategory | null;
  stat?: AttrKey | null;
  coreOnly?: boolean;
}

export interface MoveHit {
  move: Move;
  score: number;
  /** Синонім, через який знайдено хід, якщо назва запиту не містить. */
  via?: string;
}

const WEIGHT = { namePrefix: 1000, nameFirst: 120, name: 100, alias: 60, trigger: 40, text: 10 };

interface Indexed {
  move: Move;
  name: string;
  nameWords: string[];
  aliases: { text: string; words: string[] }[];
  triggerWords: string[];
  textWords: string[];
}

const INDEX: Indexed[] = MOVES.map(move => ({
  move,
  name: normalize(move.name),
  nameWords: words(move.name),
  aliases: move.aliases.map(text => ({ text, words: words(text) })),
  triggerWords: words(move.trigger),
  textWords: [...new Set(moveTexts(move).flatMap(words))],
}));

const hasStem = (list: string[], s: string) => list.some(word => word.startsWith(s));

/** Основи слів запиту — їх же підсвічує список. */
export function queryStems(query: string): string[] {
  return words(query).map(stem);
}

export function matchesFilters(move: Move, filters: MoveFilters = {}): boolean {
  if (filters.category && move.category !== filters.category) return false;
  if (filters.stat && !move.stats.includes(filters.stat)) return false;
  if (filters.coreOnly && !move.core) return false;
  return true;
}

export function searchMoves(query: string, filters: MoveFilters = {}): MoveHit[] {
  const stems = queryStems(query);
  const candidates = INDEX.filter(entry => matchesFilters(entry.move, filters));
  if (stems.length === 0) return candidates.map(entry => ({ move: entry.move, score: 0 }));

  const whole = normalize(query);
  const hits: MoveHit[] = [];

  for (const entry of candidates) {
    let score = entry.name.startsWith(whole) ? WEIGHT.namePrefix : 0;
    let matchedAll = true;
    let nameHasAll = true;

    for (const s of stems) {
      const inName = hasStem(entry.nameWords, s);
      if (!inName) nameHasAll = false;
      const best = Math.max(
        entry.nameWords[0]?.startsWith(s) ? WEIGHT.nameFirst : 0,
        inName ? WEIGHT.name : 0,
        entry.aliases.some(alias => hasStem(alias.words, s)) ? WEIGHT.alias : 0,
        hasStem(entry.triggerWords, s) ? WEIGHT.trigger : 0,
        hasStem(entry.textWords, s) ? WEIGHT.text : 0,
      );
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }
    if (!matchedAll) continue;

    const via = nameHasAll
      ? undefined
      : entry.aliases.find(alias => stems.every(s => hasStem(alias.words, s)))?.text;
    hits.push({ move: entry.move, score, via });
  }

  // Стабільне сортування: за рівного рахунку лишається порядок набору.
  return hits.sort((a, b) => b.score - a.score);
}

/**
 * Діапазони слів тексту, що починаються з однієї з основ — для підсвічування
 * збігу в назві й тригері.
 */
export function matchRanges(text: string, stems: string[]): [number, number][] {
  if (stems.length === 0) return [];
  const ranges: [number, number][] = [];
  for (const match of text.matchAll(/[\p{L}\p{N}ʼ’']+/gu)) {
    const word = normalize(match[0]);
    if (stems.some(s => word.startsWith(s))) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}
