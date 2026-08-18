// Shared helpers for the character sheet component tests.
// Queries go through class names rather than roles: the sheet is a dense grid of
// repeated widgets, and the class names are what identify a zone unambiguously.

import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { Character } from '../../../utils/character/types';
import { STORE_VERSION } from '../../../utils/character/types';
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
    JSON.stringify({ version: STORE_VERSION, activeId: character.id, characters: [character] }),
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
export const addVowButton = (root: HTMLElement) =>
  q(root, '.sheet-zone--vows .zone-add') as HTMLElement;
export const removeVowButtons = (root: HTMLElement) =>
  qa(root, '.sheet-zone--vows .progress-track__remove');
export const vowConfirm = (root: HTMLElement) => q(root, '.sheet-zone--vows .track-row__confirm');
/** Кнопки в підтвердженні: [0] — «Точно видалити», [1] — «Скасувати». */
export const vowConfirmButtons = (root: HTMLElement) =>
  qa(root, '.sheet-zone--vows .track-row__confirm .track-button');
export const vowName = (root: HTMLElement, index: number) =>
  q(vows(root)[index], '.progress-track__name') as HTMLInputElement;

// Стосунки додають і прибирають так само, як присяги, тож і запити ті самі.
export const bonds = (root: HTMLElement) => qa(root, '.sheet-zone--bonds .progress-track');
export const addBondButton = (root: HTMLElement) =>
  q(root, '.sheet-zone--bonds .zone-add') as HTMLElement;
export const removeBondButtons = (root: HTMLElement) =>
  qa(root, '.sheet-zone--bonds .progress-track__remove');
export const bondConfirm = (root: HTMLElement) => q(root, '.sheet-zone--bonds .track-row__confirm');
export const bondConfirmButtons = (root: HTMLElement) =>
  qa(root, '.sheet-zone--bonds .track-row__confirm .track-button');
export const bondName = (root: HTMLElement, index: number) =>
  q(bonds(root)[index], '.progress-track__name') as HTMLInputElement;
export const extraTracks = (root: HTMLElement) => qa(root, '.extra-track');

// ── Профілі ───────────────────────────────────────────────────────────

export const profilesZone = (root: HTMLElement) => q(root, '.sheet-zone--profiles');
export const addProfileButton = (root: HTMLElement) =>
  q(root, '.sheet-zone--profiles .zone-add') as HTMLElement;
export const profileSpines = (root: HTMLElement) => qa(root, '.profile-spine');
export const spineLabels = (root: HTMLElement) =>
  profileSpines(root).map(spine => q(spine, '.profile-spine__name')?.textContent ?? '');
export const raisedCard = (root: HTMLElement) => q(root, '.profile-card--raised');
export const fullCard = (root: HTMLElement) => q(root, '.profile-modal--card .profile-card');

/** Рядки навичок піднятої (або будь-якої видимої) картки. */
export const cardMarks = (card: HTMLElement) => qa(card, '.profile-mark');
export const markStates = (card: HTMLElement) =>
  cardMarks(card).map(mark => mark.getAttribute('aria-checked'));
export const cardField = (card: HTMLElement, label: string) =>
  qa(card, '.profile-field__input').find(
    input => input.getAttribute('aria-label') === label,
  ) as HTMLInputElement;
export const cardTrackCells = (card: HTMLElement) => qa(card, '.profile-track__cell');
export const currentTrackCell = (card: HTMLElement) =>
  q(card, '.profile-track__cell--current')?.textContent ?? null;
export const cardRemoveButton = (card: HTMLElement) =>
  q(card, '.profile-card__remove') as HTMLElement;
export const cardConfirm = (root: HTMLElement) => q(root, '.track-row__confirm');
export const cardConfirmButtons = (root: HTMLElement) =>
  qa(root, '.track-row__confirm .track-button');

// Вікно вибору
export const picker = (root: HTMLElement) => q(root, '.profile-modal');
export const pickerSearch = (root: HTMLElement) => q(root, '.profile-search') as HTMLInputElement;
export const pickerTiles = (root: HTMLElement) => qa(root, '.profile-tile');
export const pickerTileNames = (root: HTMLElement) =>
  pickerTiles(root).map(tile => q(tile, '.profile-tile__name')?.textContent ?? '');
export const pickerGroupTitles = (root: HTMLElement) =>
  qa(root, '.profile-group__title').map(node => node.textContent);
export const addToHandButton = (root: HTMLElement) =>
  q(root, '.profile-modal__actions .roll-button') as HTMLElement;

/** «+» → плитку з такою назвою → «+ Додати». Найкоротший шлях до руки. */
export const addProfileByName = (root: HTMLElement, name: string) => {
  fireEvent.click(addProfileButton(root));
  const tile = pickerTiles(root).find(
    item => q(item, '.profile-tile__name')?.textContent === name,
  );
  if (!tile) throw new Error(`Профілю «${name}» немає у вікні вибору`);
  fireEvent.click(tile);
  fireEvent.click(addToHandButton(root));
};

// Мобільний футер
export const footerToggle = (root: HTMLElement) =>
  q(root, '.profiles-footer__toggle') as HTMLElement;
export const drawer = (root: HTMLElement) => q(root, '.profiles-drawer');
export const modalClose = (root: HTMLElement) => q(root, '.profile-modal__close') as HTMLElement;

/**
 * Вдає телефон: `useIsNarrow` питає `matchMedia`, а в jsdom той завжди
 * віддає `matches: false`, тож без підміни тести бачать десктопну зону.
 */
export function stubNarrowViewport() {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: media === '(max-width: 700px)',
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

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
/** Стос карток-сповіщень, найновіша — перша. */
export const rollCards = (root: HTMLElement) => qa(root, '.roll-card');
export const rollCardLabels = (root: HTMLElement) =>
  qa(root, '.roll-card__label').map(node => node.textContent);
export const dismissRollButtons = (root: HTMLElement) => qa(root, '.roll-card__ok');
/** Шар, що ловить жест: саме він, а не сама картка, їде за пальцем. */
export const toastCards = (root: HTMLElement) => qa(root, '.roll-toast__card');
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

export const characterMenuToggle = (root: HTMLElement) =>
  q(root, '.character-menu__toggle') as HTMLElement;

/** Дії над персонажем живуть у меню під бургером, і меню закривається після
    кожної з них — тож перед кожним звертанням його треба відкрити знову. */
export const openCharacterMenu = (root: HTMLElement) => {
  const toggle = characterMenuToggle(root);
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
  return toggle;
};

export const barButton = (root: HTMLElement, text: string) => {
  openCharacterMenu(root);
  return qa(root, '.bar-button').find(button => button.textContent?.trim() === text);
};

/** Персонажі в меню, у порядку списку. */
export const characterOptions = (root: HTMLElement) => {
  openCharacterMenu(root);
  return qa(root, '.character-bar__item').map(item => item.textContent);
};

export const activeCharacterOption = (root: HTMLElement) => {
  openCharacterMenu(root);
  return q(root, '.character-bar__item--active')?.textContent ?? null;
};

/** Перемикає аркуш на персонажа з таким підписом у меню. */
export const pickCharacter = (root: HTMLElement, name: string) => {
  openCharacterMenu(root);
  const item = qa(root, '.character-bar__item').find(row => row.textContent?.trim() === name);
  if (!item) throw new Error(`Персонажа «${name}» немає в меню`);
  fireEvent.click(item);
};

// ── Interactions ──────────────────────────────────────────────────────

export const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

export const select = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

/** Drags a toast sideways by `distance` px and lets go. */
export function swipe(card: HTMLElement, distance: number) {
  fireEvent.pointerDown(card, { pointerId: 1, clientX: 0 });
  fireEvent.pointerMove(card, { pointerId: 1, clientX: distance });
  fireEvent.pointerUp(card, { pointerId: 1, clientX: distance });
}

/** Opens the roll panel for an attribute and rolls, optionally with adds. */
export function rollAttribute(root: HTMLElement, index: number, adds = 0) {
  fireEvent.click(attributeValue(root, index));
  const panel = q(root, '.roll-panel') as HTMLElement;
  for (let i = 0; i < adds; i++) fireEvent.click(qa(panel, '.stepper')[1]);
  fireEvent.click(q(root, '.roll-button') as HTMLElement);
}
