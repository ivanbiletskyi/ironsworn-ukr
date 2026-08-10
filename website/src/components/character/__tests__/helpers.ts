// Shared helpers for the character sheet component tests.
// Queries go through class names rather than roles: the sheet is a dense grid of
// repeated widgets, and the class names are what identify a zone unambiguously.

import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { Character } from '../../../utils/character/types';
import { createCharacter } from '../../../utils/character/storage';

export const q = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector);

export const qa = (root: HTMLElement, selector: string) => [
  ...root.querySelectorAll<HTMLElement>(selector),
];

/** Seeds localStorage with a character before the sheet mounts. */
export function seedCharacter(patch: Partial<Character> = {}) {
  const character = { ...createCharacter('Ульріка'), ...patch };
  localStorage.setItem(
    'ironsworn-characters-v1',
    JSON.stringify({ version: 1, activeId: character.id, characters: [character] }),
  );
  return character;
}

/**
 * Queues Math.random values so the requested dice come up.
 * Roll order is action die (d6) first, then the two challenge dice (d10).
 */
export function stubDice(...values: Array<{ sides: 6 | 10; value: number }>) {
  const queue = values.map(({ sides, value }) => (value - 1) / sides + 0.001 / sides);
  let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const next = queue[index++];
    if (next === undefined) throw new Error('dice queue exhausted');
    return next;
  });
}
export const d6 = (value: number) => ({ sides: 6 as const, value });
export const d10 = (value: number) => ({ sides: 10 as const, value });

// ── Zone queries ──────────────────────────────────────────────────────

export const nameInput = (root: HTMLElement) =>
  q(root, '.sheet-name-input') as HTMLInputElement;

export const momentumCells = (root: HTMLElement) => qa(root, '.sheet-zone--momentum .scale-cell');

export const currentValue = (root: HTMLElement, zone: string) =>
  q(root, `${zone} .scale-cell--current`)?.textContent ?? null;

/** The two read-only fields under the momentum rail: max and reset. */
export const momentumReadouts = (root: HTMLElement) =>
  qa(root, '.sheet-zone--momentum .scale-readout dd').map(node => node.textContent);

export const statCells = (root: HTMLElement, index: number) =>
  qa(qa(root, '.sheet-zone--stats .stat-track')[index], '.scale-cell');

/** Debility checkboxes in sheet order: conditions, banes, burdens. */
export const debilityBoxes = (root: HTMLElement) =>
  qa(root, '.sheet-zone--debil input[type=checkbox]') as HTMLInputElement[];

export const attributeBoxes = (root: HTMLElement) => qa(root, '.attribute-box');

export const attributeValue = (root: HTMLElement, index: number) =>
  q(attributeBoxes(root)[index], '.attribute-box__value') as HTMLElement;

export const attributeSteppers = (root: HTMLElement, index: number) =>
  qa(attributeBoxes(root)[index], '.stepper');

/** Steppers are hidden until edit mode is toggled on. */
export const enterAttributeEditMode = (root: HTMLElement) =>
  fireEvent.click(q(root, '.attribute-edit-toggle') as HTMLElement);

export const vows = (root: HTMLElement) => qa(root, '.sheet-zone--vows .progress-track');
export const bondTrack = (root: HTMLElement) =>
  q(root, '.sheet-zone--bonds .progress-track') as HTMLElement;
export const extraTracks = (root: HTMLElement) => qa(root, '.extra-track');

export const trackBoxes = (track: HTMLElement) => qa(track, '.progress-box');

/** A box draws one line per tick, so counting lines counts ticks. */
export const trackTicks = (track: HTMLElement) =>
  trackBoxes(track).map(box => box.querySelectorAll('line').length);

export const trackCount = (track: HTMLElement) =>
  q(track, '.progress-track__count')?.textContent ?? null;

export const markButton = (track: HTMLElement) => qa(track, '.track-button')[0];
export const progressRollButton = (track: HTMLElement) => qa(track, '.track-button')[1];

export const xpCells = (root: HTMLElement) => qa(root, '.xp-cell');
export const availableXpText = (root: HTMLElement) =>
  q(root, '.xp-summary__available strong')?.textContent ?? null;

export const rollCard = (root: HTMLElement) => q(root, '.roll-card');
export const outcomeText = (root: HTMLElement) =>
  q(root, '.roll-outcome')?.textContent?.replace(/^\S+\s/, '') ?? null;
export const badges = (root: HTMLElement) =>
  qa(root, '.roll-notes .roll-badge').map(node => node.textContent);
export const dice = (root: HTMLElement) =>
  qa(root, '.die').map(node => ({
    value: node.textContent,
    canceled: node.className.includes('canceled'),
  }));
export const burnButton = (root: HTMLElement) => q(root, '.burn-button');
export const logRows = (root: HTMLElement) => qa(root, '.log-row');

export const barButton = (root: HTMLElement, text: string) =>
  qa(root, '.bar-button').find(button => button.textContent?.trim() === text);

export const characterOptions = (root: HTMLElement) =>
  qa(root, '.character-bar__select option').map(option => option.textContent);

// ── Interactions ──────────────────────────────────────────────────────

export const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

export const select = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

/** Opens the roll panel for an attribute and rolls, optionally with adds. */
export function rollAttribute(root: HTMLElement, index: number, adds = 0) {
  fireEvent.click(attributeValue(root, index));
  const panel = q(root, '.roll-panel') as HTMLElement;
  for (let i = 0; i < adds; i++) fireEvent.click(qa(panel, '.stepper')[1]);
  fireEvent.click(q(root, '.roll-button') as HTMLElement);
}
