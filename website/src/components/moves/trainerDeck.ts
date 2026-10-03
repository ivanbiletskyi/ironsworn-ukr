// Колода сесії тренування: зважена вибірка за коробками Лейтнера і
// варіанти відповіді для «Ситуація → хід».

import type { Move } from '../../utils/moves';
import { MOVES } from '../../utils/moves';
import type { TrainerBoxes } from './useMovesStorage';

export const SESSION_SIZE = 10;

const BOX_WEIGHT = { 1: 4, 2: 2, 3: 1 } as const;

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Зважена вибірка без повторів: що нижча коробка, то частіше. */
export function buildDeck(pool: Move[], boxes: TrainerBoxes, size: number, random = Math.random): Move[] {
  const left = [...pool];
  const deck: Move[] = [];
  while (deck.length < size && left.length > 0) {
    const weights = left.map(move => BOX_WEIGHT[boxes[move.id] ?? 1]);
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (roll >= weights[index] && index < left.length - 1) roll -= weights[index++];
    deck.push(left.splice(index, 1)[0]);
  }
  return deck;
}

/** Правильна відповідь і 3 хибні — спершу з тієї ж категорії. */
export function choicesFor(move: Move, random = Math.random): Move[] {
  const same = MOVES.filter(other => other.category === move.category && other.id !== move.id);
  const rest = MOVES.filter(other => other.category !== move.category);
  const wrong = [...shuffle(same, random), ...shuffle(rest, random)].slice(0, 3);
  return shuffle([move, ...wrong], random);
}
