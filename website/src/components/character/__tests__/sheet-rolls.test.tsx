// Rolling through the UI: action rolls, burning momentum, progress rolls and
// the roll log. Covers CHARACTER_SHEET_PLAN.md §3.1, §3.2, §3.5, §3.7, §3.8.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import CharacterSheet from '../CharacterSheet';
import { MAX_TOASTS } from '../RollToasts';
import {
  addBondButton,
  addVowButton,
  badges,
  bondConfirm,
  bondConfirmButtons,
  bondEntries,
  bondName,
  bondTrack,
  bondTracks,
  burnButton,
  currentValue,
  d10,
  d6,
  dice,
  dismissRollButtons,
  logRows,
  markButton,
  outcomeText,
  progressRollButton,
  q,
  qa,
  removeBondButtons,
  removeVowButtons,
  rollAttribute,
  rollCard,
  rollCardLabels,
  rollCards,
  seedCharacter,
  select,
  stubDice,
  swipe,
  toastCards,
  trackCount,
  trackTicks,
  type,
  vowConfirm,
  vowConfirmButtons,
  vowName,
  vows,
} from './helpers';

const renderSheet = () => render(<CharacterSheet currentLang="uk" />);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action roll (§3.1)', () => {
  it('shows no card until something is rolled', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(rollCard(container)).toBeNull();
  });

  it('rolls the selected attribute and reports the outcome', () => {
    seedCharacter({ attributes: { edge: 3, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 0 });
    const { container } = renderSheet();

    stubDice(d6(4), d10(2), d10(9));
    rollAttribute(container, 0);

    expect(rollCard(container)).toBeTruthy();
    expect(dice(container).map(die => die.value)).toEqual(['4', '2', '9']);
    expect(q(container, '.roll-math strong')?.textContent).toBe('7');
    expect(outcomeText(container)).toBe('Ледь влучаєте');
    expect(q(container, '.roll-card__label')?.textContent).toBe('Вістря');
  });

  it('closes the roll panel once the dice are thrown', () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();

    stubDice(d6(4), d10(2), d10(9));
    rollAttribute(container, 0);

    expect(q(container, '.roll-panel')).toBeNull();
    expect(q(container, '.attribute-box--selected')).toBeNull();
  });

  it('includes adds from the roll panel and caps the score at 10', () => {
    seedCharacter({ attributes: { edge: 5, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 0 });
    const { container } = renderSheet();

    stubDice(d6(6), d10(1), d10(1));
    rollAttribute(container, 0, 5); // 6 + 5 + 5 = 16

    expect(q(container, '.roll-math strong')?.textContent).toBe('10');
    expect(badges(container)).toContain('Значення дії обмежено до 10');
    expect(outcomeText(container)).toBe('Точне влучання');
  });

  it('flags matched challenge dice', () => {
    seedCharacter({ momentum: 2 });
    const { container } = renderSheet();
    stubDice(d6(3), d10(7), d10(7));
    rollAttribute(container, 0);
    expect(badges(container)).toContain('Дубль граників');
  });

  it('strikes the action die out on matching negative momentum (§3.5)', () => {
    seedCharacter({ attributes: { edge: 3, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: -4 });
    const { container } = renderSheet();

    stubDice(d6(4), d10(1), d10(9)); // |−4| === action die 4
    rollAttribute(container, 0);

    expect(dice(container)[0].canceled).toBe(true);
    expect(badges(container)).toContain('Негативний імпульс скасував граник дії');
    expect(q(container, '.roll-math strong')?.textContent).toBe('3');
    expect(outcomeText(container)).toBe('Ледь влучаєте');
  });
});

describe('burning momentum (§3.2)', () => {
  it('offers the burn, applies it and resets momentum', () => {
    // The worked example from the rules: momentum +6, action score 4, dice 5 and 8.
    seedCharacter({ attributes: { edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 6 });
    const { container } = renderSheet();

    stubDice(d6(4), d10(5), d10(8));
    rollAttribute(container, 0);
    expect(outcomeText(container)).toBe('Промах');
    expect(burnButton(container)?.textContent?.trim()).toBe(
      '🔥 Спалити імпульс → ЛЕДЬ ВЛУЧАЄТЕ',
    );

    fireEvent.click(burnButton(container) as HTMLElement);
    expect(outcomeText(container)).toBe('Ледь влучаєте');
    expect(dice(container).map(die => die.canceled)).toEqual([false, true, false]);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+2');
    expect(burnButton(container)).toBeNull();

    // The burn is a separate log entry, not a rewrite of the original roll.
    expect(logRows(container)).toHaveLength(2);
    expect(q(container, '.roll-badge--burn')).toBeTruthy();
  });

  it('resets to +1 when one debility is marked', () => {
    seedCharacter({
      attributes: { edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 },
      momentum: 6,
      debilities: {
        wounded: true,
        unprepared: false,
        shaken: false,
        encumbered: false,
        maimed: false,
        corrupted: false,
        cursed: false,
        tormented: false,
      },
    });
    const { container } = renderSheet();

    stubDice(d6(4), d10(5), d10(8));
    rollAttribute(container, 0);
    fireEvent.click(burnButton(container) as HTMLElement);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+1');
  });

  it('is not offered on a strong hit or when momentum is too low', () => {
    seedCharacter({ attributes: { edge: 3, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 5 });
    const first = renderSheet();
    stubDice(d6(6), d10(1), d10(2));
    rollAttribute(first.container, 0);
    expect(outcomeText(first.container)).toBe('Точне влучання');
    expect(burnButton(first.container)).toBeNull();
    first.unmount();
    vi.restoreAllMocks();

    localStorage.clear();
    seedCharacter({ attributes: { edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 1 });
    const second = renderSheet();
    stubDice(d6(1), d10(9), d10(9));
    rollAttribute(second.container, 0);
    expect(outcomeText(second.container)).toBe('Промах');
    expect(burnButton(second.container)).toBeNull();
  });
});

describe('progress tracks (§3.7)', () => {
  it('starts with a single empty vow track, and only it carries a rank', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(vows(container)).toHaveLength(1);
    expect(trackTicks(vows(container)[0])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(trackCount(vows(container)[0])).toBe('0/10');
    expect(q(vows(container)[0], '.progress-track__rank')).toBeTruthy();
    expect(q(bondTrack(container), '.progress-track__rank')).toBeNull();
    expect(q(bondTrack(container), '.progress-track__name')).toBeNull();
  });

  it('marks progress by rank', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addVowButton(container));
    fireEvent.click(addVowButton(container));

    fireEvent.click(markButton(vows(container)[0])); // dangerous — 2 boxes
    expect(trackTicks(vows(container)[0])).toEqual([4, 4, 0, 0, 0, 0, 0, 0, 0, 0]);

    select(q(vows(container)[0], '.progress-track__rank') as HTMLElement, 'troublesome');
    fireEvent.click(markButton(vows(container)[0])); // +3 boxes
    expect(trackCount(vows(container)[0])).toBe('5/10');

    select(q(vows(container)[1], '.progress-track__rank') as HTMLElement, 'epic');
    fireEvent.click(markButton(vows(container)[1])); // +1 tick only
    expect(trackTicks(vows(container)[1])[0]).toBe(1);
    expect(trackCount(vows(container)[1])).toBe('0/10');

    select(q(vows(container)[2], '.progress-track__rank') as HTMLElement, 'extreme');
    fireEvent.click(markButton(vows(container)[2])); // +2 ticks
    expect(trackTicks(vows(container)[2])[0]).toBe(2);
  });

  it('adds a tick on click, jumps ahead, and clears a full box', () => {
    seedCharacter();
    const { container } = renderSheet();
    const boxes = () => qa(vows(container)[0], '.progress-box');

    fireEvent.click(boxes()[0]);
    expect(trackTicks(vows(container)[0])[0]).toBe(1);

    fireEvent.click(boxes()[4]);
    expect(trackTicks(vows(container)[0])).toEqual([4, 4, 4, 4, 1, 0, 0, 0, 0, 0]);

    fireEvent.click(boxes()[1]); // full box — erases it and everything after
    expect(trackTicks(vows(container)[0])).toEqual([4, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  // Розділ «Стосунки»: шкала стосунків у персонажа одна на всіх, і кожне
  // успішне «Скріпити стосунки» додає до неї одну позначку.
  it('keeps a single shared bond track that gains one tick at a time', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addBondButton(container));
    fireEvent.click(addBondButton(container));
    expect(bondEntries(container)).toHaveLength(3);
    expect(bondTracks(container)).toHaveLength(1);

    for (let i = 0; i < 4; i++) fireEvent.click(markButton(bondTrack(container)));
    expect(trackCount(bondTrack(container))).toBe('1/10');
    expect(trackTicks(bondTrack(container))[1]).toBe(0);
  });

  it('keeps the shared bond track when names come and go', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addBondButton(container));
    type(bondName(container, 1), 'Кайл, коваль');
    for (let i = 0; i < 5; i++) fireEvent.click(markButton(bondTrack(container)));

    fireEvent.click(removeBondButtons(container)[1]);
    fireEvent.click(bondConfirmButtons(container)[0]);
    expect(bondEntries(container)).toHaveLength(1);
    expect(trackTicks(bondTrack(container))).toEqual([4, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('vow slots', () => {
  it('hides the remove button on a lone empty vow, since there is nothing to undo', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(removeVowButtons(container)).toHaveLength(0);

    type(vowName(container, 0), 'Знайти сестру');
    expect(removeVowButtons(container)).toHaveLength(1);

    type(vowName(container, 0), '');
    expect(removeVowButtons(container)).toHaveLength(0);

    fireEvent.click(addVowButton(container));
    expect(removeVowButtons(container)).toHaveLength(2);
  });

  it('adds a vow from the zone header and keeps it across a remount', () => {
    seedCharacter();
    const first = renderSheet();
    fireEvent.click(addVowButton(first.container));
    type(vowName(first.container, 1), 'Помститися');
    expect(vows(first.container)).toHaveLength(2);
    first.unmount();

    const second = renderSheet();
    expect(vows(second.container)).toHaveLength(2);
    expect(vowName(second.container, 1).value).toBe('Помститися');
  });

  it('drops an empty vow without asking', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addVowButton(container));
    type(vowName(container, 0), 'Знайти сестру');

    fireEvent.click(removeVowButtons(container)[1]);
    expect(vowConfirm(container)).toBeNull();
    expect(vows(container)).toHaveLength(1);
    expect(vowName(container, 0).value).toBe('Знайти сестру');
  });

  it('asks before dropping a vow that has a name or progress', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addVowButton(container));
    type(vowName(container, 0), 'Знайти сестру');

    fireEvent.click(removeVowButtons(container)[0]);
    expect(vowConfirm(container)?.textContent).toContain('Знайти сестру');
    expect(vows(container)).toHaveLength(2);

    // Скасування лишає присягу на місці.
    fireEvent.click(vowConfirmButtons(container)[1]);
    expect(vowConfirm(container)).toBeNull();
    expect(vows(container)).toHaveLength(2);

    fireEvent.click(removeVowButtons(container)[0]);
    fireEvent.click(vowConfirmButtons(container)[0]);
    expect(vows(container)).toHaveLength(1);
    expect(vowName(container, 0).value).toBe('');
  });

  it('asks about progress alone, even without a name', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(markButton(vows(container)[0]));

    fireEvent.click(removeVowButtons(container)[0]);
    expect(vowConfirm(container)?.textContent).toContain('Присяга 1');
  });

  // Зона присяг ніколи не буває порожньою: на місці останньої лишається чиста.
  it('replaces the last vow with an empty one instead of leaving none', () => {
    seedCharacter();
    const { container } = renderSheet();
    type(vowName(container, 0), 'Знайти сестру');

    fireEvent.click(removeVowButtons(container)[0]);
    fireEvent.click(vowConfirmButtons(container)[0]);
    expect(vows(container)).toHaveLength(1);
    expect(vowName(container, 0).value).toBe('');
  });
});

// Імена в переліку стосунків додають і прибирають тими самими правилами, що й присяги.
describe('bond names', () => {
  it('starts with a single name row and hides its remove button while it is empty', () => {
    seedCharacter();
    const { container } = renderSheet();
    expect(bondEntries(container)).toHaveLength(1);
    expect(removeBondButtons(container)).toHaveLength(0);

    type(bondName(container, 0), 'Кайл, коваль');
    expect(removeBondButtons(container)).toHaveLength(1);
  });

  it('adds a bond from the zone header and keeps it across a remount', () => {
    seedCharacter();
    const first = renderSheet();
    fireEvent.click(addBondButton(first.container));
    type(bondName(first.container, 1), 'Спільнота Вейлґейв');
    expect(bondEntries(first.container)).toHaveLength(2);
    first.unmount();

    const second = renderSheet();
    expect(bondEntries(second.container)).toHaveLength(2);
    expect(bondName(second.container, 1).value).toBe('Спільнота Вейлґейв');
  });

  it('drops an empty bond without asking', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addBondButton(container));
    type(bondName(container, 0), 'Кайл, коваль');

    fireEvent.click(removeBondButtons(container)[1]);
    expect(bondConfirm(container)).toBeNull();
    expect(bondEntries(container)).toHaveLength(1);
    expect(bondName(container, 0).value).toBe('Кайл, коваль');
  });

  it('asks before dropping a named bond', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addBondButton(container));
    type(bondName(container, 0), 'Кайл, коваль');

    fireEvent.click(removeBondButtons(container)[0]);
    expect(bondConfirm(container)?.textContent).toContain('Кайл, коваль');
    expect(bondEntries(container)).toHaveLength(2);

    // Скасування лишає стосунок на місці.
    fireEvent.click(bondConfirmButtons(container)[1]);
    expect(bondConfirm(container)).toBeNull();
    expect(bondEntries(container)).toHaveLength(2);

    fireEvent.click(removeBondButtons(container)[0]);
    fireEvent.click(bondConfirmButtons(container)[0]);
    expect(bondEntries(container)).toHaveLength(1);
    expect(bondName(container, 0).value).toBe('');
  });

  // Прогрес лежить на спільній шкалі, а не на рядку імені, тож порожній рядок
  // порожній і тоді, коли шкала вже заповнюється.
  it('treats an unnamed row as empty no matter the shared progress', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(markButton(bondTrack(container)));
    expect(removeBondButtons(container)).toHaveLength(0);

    fireEvent.click(addBondButton(container));
    fireEvent.click(removeBondButtons(container)[1]);
    expect(bondConfirm(container)).toBeNull();
    expect(bondEntries(container)).toHaveLength(1);
    expect(trackTicks(bondTrack(container))[0]).toBe(1);
  });
});

describe('progress roll (§3.8)', () => {
  it('counts filled boxes, rolls no action die and cannot burn momentum', () => {
    seedCharacter({
      momentum: 8,
      vows: [{ id: 'v1', name: 'Знайти сестру', rank: 'formidable', ticks: 20 }],
    });
    const { container } = renderSheet();

    stubDice(d10(3), d10(8));
    fireEvent.click(progressRollButton(vows(container)[0]));

    expect(q(container, '.roll-math strong')?.textContent).toBe('5');
    expect(outcomeText(container)).toBe('Ледь влучаєте');
    expect(qa(container, '.die--action')).toHaveLength(0);
    expect(qa(container, '.die--challenge')).toHaveLength(2);
    expect(burnButton(container)).toBeNull();
    expect(q(container, '.roll-card__label')?.textContent).toBe('Знайти сестру');
  });

  it('labels an unnamed vow by its slot', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(addVowButton(container));
    stubDice(d10(1), d10(1));
    fireEvent.click(progressRollButton(vows(container)[1]));
    expect(q(container, '.roll-card__label')?.textContent).toBe('Присяга 2');
  });

  // «Написати свій епілог»: кидок за спільною шкалою, а не за окремим стосунком.
  it('rolls the shared bond track under the zone name', () => {
    seedCharacter({ bondTicks: 12 });
    const { container } = renderSheet();
    stubDice(d10(2), d10(9));
    fireEvent.click(progressRollButton(bondTrack(container)));
    expect(q(container, '.roll-card__label')?.textContent).toBe('Стосунки');
    expect(q(container, '.roll-math strong')?.textContent).toBe('3');
    expect(outcomeText(container)).toBe('Ледь влучаєте');
  });

  it('picks up a vow name as it is typed', () => {
    seedCharacter();
    const { container } = renderSheet();
    type(vowName(container, 0), 'Помститися');
    stubDice(d10(1), d10(1));
    fireEvent.click(progressRollButton(vows(container)[0]));
    expect(q(container, '.roll-card__label')?.textContent).toBe('Помститися');
  });
});

describe('roll toasts', () => {
  /** Each roll uses its own attribute: clicking the same tile twice would just
      close the roll panel again. */
  const rollEach = (container: HTMLElement, count: number) => {
    for (let index = 0; index < count; index++) {
      vi.restoreAllMocks();
      stubDice(d6(4), d10(2), d10(9));
      rollAttribute(container, index);
    }
  };

  it('stacks one card per roll, newest first', () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();
    rollEach(container, 2);

    expect(rollCards(container)).toHaveLength(2);
    expect(rollCardLabels(container)).toEqual(['Серце', 'Вістря']);
  });

  it('drops just the card whose ОК is pressed', async () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();
    rollEach(container, 2);

    fireEvent.click(dismissRollButtons(container)[0]);
    await waitFor(() => expect(rollCards(container)).toHaveLength(1));
    expect(rollCardLabels(container)).toEqual(['Вістря']);
    // Прибрана картка не чіпає журналу: там кидок лишається.
    expect(logRows(container)).toHaveLength(2);
  });

  it('dismisses a card swiped far enough and keeps one only nudged', async () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();
    rollEach(container, 1);

    swipe(toastCards(container)[0], 20);
    expect(rollCards(container)).toHaveLength(1);

    swipe(toastCards(container)[0], -160);
    await waitFor(() => expect(rollCards(container)).toHaveLength(0));
    expect(logRows(container)).toHaveLength(1);
  });

  // Стос обмежений, бо мусить лишати аркуш видимим; MAX_TOASTS ≤ 4, тож
  // п'яти характеристик вистачає, щоб перебрати ліміт.
  it('keeps the stack short, letting the oldest card go', () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();
    rollEach(container, MAX_TOASTS + 1);

    expect(rollCards(container)).toHaveLength(MAX_TOASTS);
    expect(rollCardLabels(container)[MAX_TOASTS - 1]).not.toBe('Вістря');
    expect(logRows(container)).toHaveLength(MAX_TOASTS + 1);
  });

  it('offers the burn on the newest card only', () => {
    seedCharacter({ attributes: { edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 }, momentum: 6 });
    const { container } = renderSheet();
    // Приклад із правил: значення дії 4 проти 5 і 8 — промах, який спалення
    // рятує. Обидва кидки однакові, тож пропозиція мала б бути на кожному.
    stubDice(d6(4), d10(5), d10(8));
    rollAttribute(container, 0);
    expect(burnButton(container)).toBeTruthy();

    vi.restoreAllMocks();
    stubDice(d6(4), d10(5), d10(8));
    rollAttribute(container, 1);

    const cards = rollCards(container);
    expect(q(cards[0], '.burn-button')).toBeTruthy();
    expect(q(cards[1], '.burn-button')).toBeNull();
  });
});

describe('roll log', () => {
  it('keeps the log but not the card across a remount', () => {
    seedCharacter({ momentum: 0 });
    const first = renderSheet();
    stubDice(d6(4), d10(2), d10(9));
    rollAttribute(first.container, 0);
    expect(logRows(first.container)).toHaveLength(1);
    first.unmount();

    const second = renderSheet();
    expect(logRows(second.container)).toHaveLength(1);
    // A card restored from history would invite burning momentum on a stale roll.
    expect(rollCard(second.container)).toBeNull();
  });

  it('removes a single entry and clears the whole log', () => {
    seedCharacter({ momentum: 0 });
    const { container } = renderSheet();
    stubDice(d6(4), d10(2), d10(9));
    rollAttribute(container, 0);
    vi.restoreAllMocks();
    stubDice(d6(2), d10(3), d10(4));
    rollAttribute(container, 1);
    expect(logRows(container)).toHaveLength(2);

    fireEvent.click(q(container, '.log-row__remove') as HTMLElement);
    expect(logRows(container)).toHaveLength(1);

    fireEvent.click(q(container, '.log-clear') as HTMLElement);
    expect(logRows(container)).toHaveLength(0);
    expect(q(container, '.log-empty')?.textContent).toBe('Кидків ще не було');
  });
});
