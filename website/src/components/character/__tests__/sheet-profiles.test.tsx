// Профілі на аркуші: вікно вибору, рука карт, кружечки, поля, шкала,
// видалення й мобільний футер. Покриває PROFILES_PLAN.md §5–6.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import CharacterSheet from '../CharacterSheet';
import {
  addProfileButton,
  addProfileByName,
  addToHandButton,
  cardConfirm,
  cardConfirmButtons,
  cardField,
  cardMarks,
  cardRemoveButton,
  cardTrackCells,
  currentTrackCell,
  drawer,
  footerToggle,
  fullCard,
  markStates,
  modalClose,
  picker,
  pickerGroupTitles,
  pickerSearch,
  pickerTileNames,
  pickerTiles,
  profileSpines,
  profilesZone,
  q,
  raisedCard,
  seedCharacter,
  spineLabels,
  stubNarrowViewport,
  type,
} from './helpers';

const renderSheet = () => render(<CharacterSheet currentLang="uk" />);

const storedProfiles = () =>
  JSON.parse(localStorage.getItem('ironsworn-characters-v1') ?? 'null')?.characters?.[0]?.profiles;

/** «Пес»: три порожні кружечки, лінія «Ім'я:» і шкала здоров'я 0…+4. */
const DOG = { profileId: 'companion-pes', name: 'Пес' };

describe('порожня зона', () => {
  it('стоїть на місці з підказкою і посиланням на главу правил', () => {
    const { container } = renderSheet();
    const zone = profilesZone(container);
    expect(zone).toBeTruthy();
    expect(q(zone!, '.profiles-empty__text')?.textContent).toBe('Профілів ще немає');
    expect(zone!.textContent).toContain('У правилах їх названо активами');
    expect(q(zone!, '.profiles-empty__hint a')?.getAttribute('href')).toBe(
      '/uk/2-Your-Character_6-Assets',
    );
    expect(addProfileButton(container)).toBeTruthy();
  });
});

describe('вікно вибору', () => {
  it('показує всі 78 карток чотирма групами', () => {
    const { container } = renderSheet();
    fireEvent.click(addProfileButton(container));

    expect(picker(container)?.getAttribute('aria-modal')).toBe('true');
    expect(pickerTiles(container)).toHaveLength(78);
    expect(pickerGroupTitles(container)).toEqual([
      'Супутники · 10',
      'Шляхи · 37',
      'Бойові таланти · 14',
      'Ритуали · 17',
    ]);
  });

  it('фільтрує за текстом навички, а не лише за назвою', () => {
    const { container } = renderSheet();
    fireEvent.click(addProfileButton(container));

    // «Гострий нюх» — навичка пса; у назві профілю слова «нюх» немає.
    type(pickerSearch(container), 'нюх');
    expect(pickerTileNames(container)).toContain('Пес');
    expect(pickerTiles(container).length).toBeLessThan(78);

    type(pickerSearch(container), 'зовсім-такого-немає');
    expect(pickerTiles(container)).toHaveLength(0);
    expect(container.textContent).toContain('Нічого не знайдено');
  });

  it('розкриває повну картку перед додаванням, а не додає з плитки', () => {
    const { container } = renderSheet();
    fireEvent.click(addProfileButton(container));
    fireEvent.click(pickerTiles(container)[0]);

    // Плитки зникли, натомість видно картку й кнопку «+ Додати».
    expect(pickerTiles(container)).toHaveLength(0);
    expect(q(container, '.profile-card--preview')).toBeTruthy();
    expect(addToHandButton(container).textContent).toBe('+ Додати');
    // У прев'ю кружечки лишаються надрукованими, а не перемикачами.
    expect(q(container, '.profile-card--preview button[role=switch]')).toBeNull();
  });

  it('Esc закриває вікно', () => {
    const { container } = renderSheet();
    fireEvent.click(addProfileButton(container));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(picker(container)).toBeNull();
  });
});

describe('додавання профілю', () => {
  it('кладе картку в руку, закриває вікно й одразу підіймає її', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);

    expect(picker(container)).toBeNull();
    expect(profileSpines(container)).toHaveLength(1);
    expect(spineLabels(container)).toEqual(['Пес']);

    const card = raisedCard(container);
    expect(card).toBeTruthy();
    expect(q(card!, '.profile-card__name')?.textContent).toBe('Пес');
    expect(q(card!, '.profile-type')?.textContent).toBe('Супутник');
  });

  it('додає супутника з порожніми кружечками, а шлях — із надрукованими', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    expect(markStates(raisedCard(container)!)).toEqual(['false', 'false', 'false']);

    // «Маска»: перша навичка надрукована закрашеною, вкладені — порожні.
    addProfileByName(container, 'Маска');
    expect(markStates(raisedCard(container)!)).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
    ]);
  });

  it('прибирає доданий профіль із вікна вибору', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);

    fireEvent.click(addProfileButton(container));
    expect(pickerTiles(container)).toHaveLength(77);
    expect(pickerTileNames(container)).not.toContain('Пес');
    expect(pickerGroupTitles(container)[0]).toBe('Супутники · 9');
  });

  it('тримає порядок додавання', () => {
    const { container } = renderSheet();
    addProfileByName(container, 'Маска');
    addProfileByName(container, DOG.name);
    expect(spineLabels(container)).toEqual(['Маска', 'Пес']);
  });
});

describe('кружечки', () => {
  it('перемикаються кліком і переживають перемонтування', () => {
    const first = renderSheet();
    addProfileByName(first.container, DOG.name);
    fireEvent.click(cardMarks(raisedCard(first.container)!)[1]);
    expect(markStates(raisedCard(first.container)!)).toEqual(['false', 'true', 'false']);
    expect(q(first.container, '.profile-spine__marks')?.children).toHaveLength(3);

    first.unmount();
    expect(storedProfiles()[0].marked).toEqual(['3']);

    const second = renderSheet();
    // Після перезавантаження рука лежить закритою, тож карту треба підняти.
    fireEvent.click(profileSpines(second.container)[0]);
    expect(markStates(raisedCard(second.container)!)).toEqual(['false', 'true', 'false']);
  });

  it('знімаються повторним кліком, без жодного підтвердження', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    const mark = () => cardMarks(raisedCard(container)!)[0];
    fireEvent.click(mark());
    expect(mark().getAttribute('aria-checked')).toBe('true');
    fireEvent.click(mark());
    expect(mark().getAttribute('aria-checked')).toBe('false');
    expect(cardConfirm(container)).toBeNull();
  });

  it('називає навичку й її стан для читача екрана', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    const mark = cardMarks(raisedCard(container)!)[0];
    expect(mark.getAttribute('aria-label')).toBe('Гострий нюх: не відкрито');
    fireEvent.click(mark);
    expect(cardMarks(raisedCard(container)!)[0].getAttribute('aria-label')).toBe(
      'Гострий нюх: відкрито',
    );
  });

  it('вкладений кружечок працює так само, як верхній', () => {
    const { container } = renderSheet();
    addProfileByName(container, 'Маска');
    // Другий рядок — «Грозовий клен», вкладений у вибір матеріалу.
    fireEvent.click(cardMarks(raisedCard(container)!)[1]);
    expect(markStates(raisedCard(container)!)[1]).toBe('true');
  });
});

describe('поля й шкала', () => {
  it('вписане ім’я зберігається й стає підписом карти', () => {
    const first = renderSheet();
    addProfileByName(first.container, DOG.name);
    type(cardField(raisedCard(first.container)!, 'Ім’я:'), 'Баск');

    expect(spineLabels(first.container)).toEqual(['Баск']);
    // Назва профілю нікуди не зникає — вона йде другим рядком.
    expect(q(first.container, '.profile-spine__origin')?.textContent).toBe('Пес');

    first.unmount();
    expect(storedProfiles()[0].fields).toEqual({ name: 'Баск' });

    const second = renderSheet();
    expect(spineLabels(second.container)).toEqual(['Баск']);
  });

  it('клітинка шкали вибирається, а повторний клік знімає вибір', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    const card = () => raisedCard(container)!;

    const cells = cardTrackCells(card());
    expect(cells.map(cell => cell.textContent)).toEqual(['0', '+1', '+2', '+3', '+4']);
    expect(currentTrackCell(card())).toBeNull();

    fireEvent.click(cardTrackCells(card())[2]);
    expect(currentTrackCell(card())).toBe('+2');

    fireEvent.click(cardTrackCells(card())[2]);
    expect(currentTrackCell(card())).toBeNull();
  });

  it('картка без шкали її не малює', () => {
    const { container } = renderSheet();
    addProfileByName(container, 'Маска');
    expect(cardTrackCells(raisedCard(container)!)).toHaveLength(0);
  });
});

describe('піднята карта', () => {
  it('одна за раз: клік по сусідній опускає попередню', () => {
    const { container } = renderSheet();
    addProfileByName(container, 'Маска');
    addProfileByName(container, DOG.name);
    expect(q(container, '.profile-card--raised .profile-card__name')?.textContent).toBe('Пес');

    fireEvent.click(profileSpines(container)[0]);
    expect(q(container, '.profile-card--raised .profile-card__name')?.textContent).toBe('Маска');
    expect(
      profileSpines(container).map(spine => spine.getAttribute('aria-expanded')),
    ).toEqual(['true', 'false']);
  });

  it('повторний клік по корінцю опускає карту', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    fireEvent.click(profileSpines(container)[0]);
    expect(raisedCard(container)).toBeNull();
  });

  it('стрілки ходять корінцями, Esc опускає карту', () => {
    const { container } = renderSheet();
    addProfileByName(container, 'Маска');
    addProfileByName(container, DOG.name);

    const spines = profileSpines(container);
    spines[0].focus();
    fireEvent.keyDown(spines[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(spines[1]);
    fireEvent.keyDown(spines[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(spines[0]);

    fireEvent.keyDown(spines[0], { key: 'Escape' });
    expect(raisedCard(container)).toBeNull();
  });
});

describe('видалення', () => {
  it('щойно додану картку прибирає молча', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    fireEvent.click(cardRemoveButton(raisedCard(container)!));

    expect(cardConfirm(container)).toBeNull();
    expect(profileSpines(container)).toHaveLength(0);
    expect(q(container, '.profiles-empty__text')).toBeTruthy();
  });

  it('за роботу гравця питає підтвердження', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    fireEvent.click(cardMarks(raisedCard(container)!)[0]);

    fireEvent.click(cardRemoveButton(raisedCard(container)!));
    expect(cardConfirm(container)?.textContent).toContain('Видалити «Пес» разом із відмітками?');
    expect(profileSpines(container)).toHaveLength(1);

    // «Скасувати» лишає картку на місці.
    fireEvent.click(cardConfirmButtons(container)[1]);
    expect(cardConfirm(container)).toBeNull();
    expect(profileSpines(container)).toHaveLength(1);

    fireEvent.click(cardRemoveButton(raisedCard(container)!));
    fireEvent.click(cardConfirmButtons(container)[0]);
    expect(profileSpines(container)).toHaveLength(0);
  });

  it('питає й за вписане ім’я, підставляючи його в питання', () => {
    const { container } = renderSheet();
    addProfileByName(container, DOG.name);
    type(cardField(raisedCard(container)!, 'Ім’я:'), 'Баск');
    fireEvent.click(cardRemoveButton(raisedCard(container)!));
    expect(cardConfirm(container)?.textContent).toContain('Видалити «Баск»');
  });
});

describe('збережений персонаж', () => {
  it('читає руку зі сховища й не підіймає нічого сам', () => {
    seedCharacter({
      profiles: [
        {
          id: 'p1',
          profileId: 'companion-pes',
          marked: ['2'],
          fields: { name: 'Баск' },
          trackIndex: 3,
        },
      ],
    });
    const { container } = renderSheet();
    expect(spineLabels(container)).toEqual(['Баск']);
    expect(raisedCard(container)).toBeNull();

    fireEvent.click(profileSpines(container)[0]);
    expect(markStates(raisedCard(container)!)).toEqual(['true', 'false', 'false']);
    expect(currentTrackCell(raisedCard(container)!)).toBe('+3');
  });

  it('осиротілий ключ у зону не потрапляє', () => {
    seedCharacter({
      profiles: [
        { id: 'p1', profileId: 'профіль-із-майбутнього', marked: [], fields: {}, trackIndex: null },
      ],
    });
    const { container } = renderSheet();
    expect(profileSpines(container)).toHaveLength(0);
    expect(q(container, '.profiles-empty__text')).toBeTruthy();
  });
});

describe('телефон', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('замінює зону приклеєним футером', () => {
    stubNarrowViewport();
    const { container } = renderSheet();
    expect(profilesZone(container)).toBeNull();
    expect(footerToggle(container).textContent).toContain('Профілі · 0');
    expect(footerToggle(container).getAttribute('aria-expanded')).toBe('false');
    expect(drawer(container)).toBeNull();
  });

  it('смужка → шухляда → фулскрін → назад до шухляди', () => {
    stubNarrowViewport();
    seedCharacter({
      profiles: [
        { id: 'p1', profileId: 'companion-pes', marked: [], fields: {}, trackIndex: null },
        { id: 'p2', profileId: 'path-maska', marked: ['1'], fields: {}, trackIndex: null },
      ],
    });
    const { container } = renderSheet();

    expect(footerToggle(container).textContent).toContain('Профілі · 2');
    fireEvent.click(footerToggle(container));
    expect(drawer(container)).toBeTruthy();
    expect(footerToggle(container).getAttribute('aria-expanded')).toBe('true');
    expect(footerToggle(container).getAttribute('aria-controls')).toBe(
      drawer(container)?.getAttribute('id'),
    );
    expect(profileSpines(container)).toHaveLength(2);

    // Тап по карті — картка на весь екран (рішення №6).
    fireEvent.click(profileSpines(container)[0]);
    expect(fullCard(container)).toBeTruthy();
    expect(q(container, '.profile-modal--card')?.getAttribute('aria-modal')).toBe('true');
    expect(q(container, '.profile-modal__position')?.textContent).toBe('1 з 2');

    // Гортання не закриває екран.
    fireEvent.click(q(container, '.profile-modal__pager .track-button')!);
    expect(q(container, '.profile-modal__position')?.textContent).toBe('2 з 2');

    // Закриття вертає до шухляди, а не до аркуша.
    fireEvent.click(modalClose(container));
    expect(fullCard(container)).toBeNull();
    expect(drawer(container)).toBeTruthy();
  });

  it('дає видаляти картку з фулскріна', () => {
    stubNarrowViewport();
    seedCharacter({
      profiles: [
        { id: 'p1', profileId: 'companion-pes', marked: ['2'], fields: {}, trackIndex: null },
      ],
    });
    const { container } = renderSheet();
    fireEvent.click(footerToggle(container));
    fireEvent.click(profileSpines(container)[0]);

    // У фулскріні це кнопка «Видалити», а не «×» у шапці: шапку займає навігація.
    const remove = q(container, '.profile-card__actions .track-button')!;
    fireEvent.click(remove);
    expect(cardConfirm(container)?.textContent).toContain('Видалити «Пес»');
    fireEvent.click(cardConfirmButtons(container)[0]);

    expect(fullCard(container)).toBeNull();
    expect(footerToggle(container).textContent).toContain('Профілі · 0');
  });

  it('відкриває вікно вибору з шухляди', () => {
    stubNarrowViewport();
    const { container } = renderSheet();
    fireEvent.click(footerToggle(container));
    fireEvent.click(q(container, '.profiles-footer .zone-add')!);
    expect(pickerTiles(container)).toHaveLength(78);
  });
});
