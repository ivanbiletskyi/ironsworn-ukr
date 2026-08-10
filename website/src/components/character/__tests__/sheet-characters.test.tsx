// Experience, notes, extra tracks and the multi-character bar with JSON
// export/import.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import CharacterSheet from '../CharacterSheet';
import { createCharacter, serializeCharacter } from '../../../utils/character/storage';
import {
  activeCharacterOption,
  attributeSteppers,
  availableXpText,
  barButton,
  characterMenuToggle,
  characterOptions,
  enterAttributeEditMode,
  extraTracks,
  markButton,
  nameInput,
  openCharacterMenu,
  pickCharacter,
  q,
  qa,
  seedCharacter,
  trackCount,
  type,
  xpCells,
} from './helpers';

const renderSheet = () => render(<CharacterSheet currentLang="uk" />);

const cellState = (cell: HTMLElement) => cell.className.match(/xp-cell--(\d)/)?.[1];

describe('experience', () => {
  it('has 30 circles that cycle empty → earned → spent', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(xpCells(container)).toHaveLength(30);
    expect(availableXpText(container)).toBe('0');

    fireEvent.click(xpCells(container)[0]);
    expect(cellState(xpCells(container)[0])).toBe('1');
    expect(availableXpText(container)).toBe('1');

    fireEvent.click(xpCells(container)[0]);
    expect(cellState(xpCells(container)[0])).toBe('2');
    expect(xpCells(container)[0].textContent).toBe('✕');
    // Spent experience is earned but no longer available.
    expect(availableXpText(container)).toBe('0');

    fireEvent.click(xpCells(container)[0]);
    expect(cellState(xpCells(container)[0])).toBe('0');
  });

  it('tracks each circle independently, including the last', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(xpCells(container)[0]);
    fireEvent.click(xpCells(container)[1]);
    fireEvent.click(xpCells(container)[29]);
    expect(availableXpText(container)).toBe('3');
    expect(cellState(xpCells(container)[29])).toBe('1');
  });
});

describe('notes', () => {
  it('persists across a remount', () => {
    seedCharacter();
    const first = renderSheet();
    type(q(first.container, '.notes-input') as HTMLElement, 'Меч батька.');
    first.unmount();

    const second = renderSheet();
    expect((q(second.container, '.notes-input') as HTMLTextAreaElement).value).toBe('Меч батька.');
  });
});

describe('combat and journey tracks', () => {
  it('adds, marks and removes tracks of each kind', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(q(container, '.extra-tracks__empty')?.textContent).toBe(
      'Треків боїв і подорожей ще немає',
    );

    const addButtons = qa(q(container, '.extra-tracks__add') as HTMLElement, '.track-button');
    fireEvent.click(addButtons[0]); // Бій
    expect(extraTracks(container)).toHaveLength(1);
    expect(q(container, '.track-kind')?.textContent).toBe('Бій');

    fireEvent.click(qa(q(container, '.extra-tracks__add') as HTMLElement, '.track-button')[1]);
    expect(qa(container, '.track-kind').map(node => node.textContent)).toEqual(['Бій', 'Подорож']);

    fireEvent.click(markButton(extraTracks(container)[0])); // dangerous — 2 boxes
    expect(trackCount(extraTracks(container)[0])).toBe('2/10');

    fireEvent.click(q(extraTracks(container)[1], '.extra-track__remove') as HTMLElement);
    expect(extraTracks(container)).toHaveLength(1);
    expect(q(container, '.track-kind')?.textContent).toBe('Бій');
  });
});

describe('menu of characters', () => {
  it('keeps the actions behind the burger button', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    // Закритий аркуш показує лише бургер — жодного перемикача чи кнопки.
    expect(q(container, '.character-bar')).toBeNull();
    expect(characterMenuToggle(container).getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(characterMenuToggle(container));
    expect(q(container, '.character-bar__item')).toBeTruthy();
    expect(characterMenuToggle(container).getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(characterMenuToggle(container));
    expect(q(container, '.character-bar')).toBeNull();
  });

  it('closes on Escape and after an action', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();

    openCharacterMenu(container);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(q(container, '.character-bar')).toBeNull();

    fireEvent.click(barButton(container, 'Дублювати') as HTMLElement);
    expect(q(container, '.character-bar')).toBeNull();
    expect(nameInput(container).value).toBe('Ульріка (копія)');
  });

  it('forgets an unanswered delete question once closed', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();

    fireEvent.click(barButton(container, 'Видалити') as HTMLElement);
    expect(barButton(container, 'Точно видалити')).toBeTruthy();

    fireEvent.click(characterMenuToggle(container)); // закрили, не відповівши
    openCharacterMenu(container);
    expect(barButton(container, 'Точно видалити')).toBeUndefined();
    expect(barButton(container, 'Видалити')).toBeTruthy();
  });
});

describe('several characters', () => {
  it('creates a second character without touching the first', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(xpCells(container)[0]);
    enterAttributeEditMode(container);
    fireEvent.click(attributeSteppers(container, 0)[1]);

    fireEvent.click(barButton(container, 'Новий персонаж') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(2);
    expect(nameInput(container).value).toBe('');
    expect(availableXpText(container)).toBe('0');
    expect(q(container, '.attribute-box__value')?.textContent).toBe('0');
  });

  it('switches back and finds the first character intact', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(xpCells(container)[0]);

    fireEvent.click(barButton(container, 'Новий персонаж') as HTMLElement);
    type(nameInput(container), 'Бйорн');
    expect(characterOptions(container)).toEqual(['Ульріка', 'Бйорн']);
    expect(activeCharacterOption(container)).toBe('Бйорн');

    pickCharacter(container, 'Ульріка');
    expect(q(container, '.character-bar')).toBeNull(); // вибір закриває меню
    expect(nameInput(container).value).toBe('Ульріка');
    expect(availableXpText(container)).toBe('1');
    expect(activeCharacterOption(container)).toBe('Ульріка');
  });

  it('duplicates the active character with its state', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(xpCells(container)[0]);

    fireEvent.click(barButton(container, 'Дублювати') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(2);
    expect(nameInput(container).value).toBe('Ульріка (копія)');
    expect(availableXpText(container)).toBe('1');
  });

  it('asks before deleting and can be cancelled', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(barButton(container, 'Новий персонаж') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(2);

    fireEvent.click(barButton(container, 'Видалити') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(2);
    expect(barButton(container, 'Точно видалити')).toBeTruthy();

    fireEvent.click(barButton(container, 'Скасувати') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(2);

    fireEvent.click(barButton(container, 'Видалити') as HTMLElement);
    fireEvent.click(barButton(container, 'Точно видалити') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(1);
  });

  it('always leaves at least one character to work with', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(barButton(container, 'Видалити') as HTMLElement);
    fireEvent.click(barButton(container, 'Точно видалити') as HTMLElement);
    expect(characterOptions(container)).toHaveLength(1);
    expect(nameInput(container).value).toBe('');
  });
});

describe('export and import', () => {
  beforeEach(() => {
    // jsdom has neither object URLs nor anchor-triggered downloads.
    URL.createObjectURL = vi.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands the character over as a file', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    fireEvent.click(barButton(container, 'Експорт') as HTMLElement);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('imports as an addition and switches to it', async () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();

    const incoming = createCharacter('Бйорн');
    incoming.xp[0] = 1;
    await importFile(container, serializeCharacter(incoming));

    expect(characterOptions(container)).toHaveLength(2);
    expect(nameInput(container).value).toBe('Бйорн');
    expect(availableXpText(container)).toBe('1');

    const ids = JSON.parse(
      localStorage.getItem('ironsworn-characters-v1') ?? 'null',
    ).characters.map((c: { id: string }) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('explains a broken file and imports nothing', async () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    await importFile(container, '{not json');

    expect(q(container, '.character-bar__error')?.textContent).toBe('Файл не є коректним JSON.');
    expect(characterOptions(container)).toHaveLength(1);
  });
});

/**
 * Drives the hidden file input. The file is a stub rather than a real File so
 * the test does not depend on jsdom's Blob.text() implementation. The menu is
 * opened first, as it is in the app: import starts from its «Імпорт» button,
 * and a failure has to be explained inside the open menu.
 */
async function importFile(container: HTMLElement, contents: string) {
  openCharacterMenu(container);
  const input = q(container, 'input[type=file]') as HTMLInputElement;
  const file = { name: 'character.json', text: async () => contents } as unknown as File;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  // The handler awaits file.text(), so the state update lands in a later
  // microtask — act() has to cover that, not just the event dispatch.
  await act(async () => {
    fireEvent.change(input);
  });
}
