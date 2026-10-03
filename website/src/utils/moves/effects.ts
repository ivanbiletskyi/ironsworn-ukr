// Короткі конструктори наслідків для файлів даних: `momentum(1)` читається
// поруч із «Отримайте +1 імпульс» легше, ніж обʼєкт на три рядки.

import type { DebilityKey, StatKey } from '../character/types';
import type { Effect, MoveListItem, TrackKindForMove } from './move-types';

export const momentum = (delta: number): Effect => ({ kind: 'momentum', delta });

export const stat = (key: StatKey, delta: number): Effect => ({ kind: 'stat', stat: key, delta });

export const progress = (tracks: TrackKindForMove): Effect => ({ kind: 'progress', tracks });

export const mark = (key: DebilityKey): Effect => ({ kind: 'debility', key, marked: true });

export const clear = (key: DebilityKey): Effect => ({ kind: 'debility', key, marked: false });

export const toMove = (moveId: string, harm?: number): Effect =>
  harm === undefined ? { kind: 'move', moveId } : { kind: 'move', moveId, harm };

/** Пункт списку з наслідками: `opt('**Розслабитись**: …', stat('spirit', 1))`. */
export const opt = (text: string, ...effects: Effect[]): MoveListItem => ({ text, effects });
