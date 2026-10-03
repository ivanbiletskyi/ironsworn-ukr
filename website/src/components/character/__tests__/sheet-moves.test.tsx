// Шторка ходів на аркуші: відкриття й URL, кидок із картки ходу за числами
// персонажа, спалення імпульсу, чіпи наслідків, крок втрати, ходи оракулів.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CharacterSheet from '../CharacterSheet';
import { d10, d6, q, qa, seedCharacter, stubDice } from './helpers';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

const renderSheet = (url = '/uk/character') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CharacterSheet currentLang="uk" />
      <LocationProbe />
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('location').textContent;
const drawer = () => screen.getByRole('dialog', { name: 'Ходи' });
const rollButton = () => q(drawer(), '.moves-drawer__roll') as HTMLButtonElement;
const strip = (stat: string) => screen.getByTestId(`strip-${stat}`).textContent;

/** d100 = value: `Math.floor(random * 100) + 1`. */
const stubD100 = (value: number) => vi.spyOn(Math, 'random').mockReturnValue((value - 1) / 100 + 0.0001);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('відкриття шторки', () => {
  it('кнопка «Ходи» відкриває список, «×» закриває', () => {
    seedCharacter();
    renderSheet();
    fireEvent.click(screen.getByRole('button', { name: '⚔ Ходи' }));
    expect(where()).toBe('/uk/character?moves');
    expect(within(drawer()).getByRole('searchbox', { name: 'Пошук ходу' })).toBeTruthy();

    fireEvent.click(within(drawer()).getByRole('button', { name: 'Закрити ходи' }));
    expect(where()).toBe('/uk/character');
    expect(screen.queryByRole('dialog', { name: 'Ходи' })).toBeNull();
  });

  it('хід зі списку відкривається карткою, «← Ходи» повертає до списку', () => {
    seedCharacter();
    renderSheet('/uk/character?moves');
    fireEvent.click(within(drawer()).getAllByRole('link', { name: /Стріти небезпеку/ })[0]);
    expect(where()).toBe('/uk/character?move=face-danger');
    expect(within(drawer()).getByRole('heading', { level: 2 }).textContent).toBe('Стріти небезпеку');

    fireEvent.click(within(drawer()).getByRole('button', { name: '← Ходи' }));
    expect(where()).toBe('/uk/character?moves');
  });

  it('«Ходи з Вістрям →» відкриває список із фільтром за атрибутом', () => {
    seedCharacter();
    const { container } = renderSheet();
    fireEvent.click(qa(container, '.attribute-box__value')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Ходи з Вістрям →' }));
    expect(where()).toBe('/uk/character?moves&stat=edge');
    fireEvent.click(within(drawer()).getByRole('button', { name: /Фільтри/ }));
    expect(within(drawer()).getByRole('button', { name: 'Вістря' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('кидок із картки ходу', () => {
  it('кидає за числами персонажа, вибирає смугу й пише в журнал без тосту', () => {
    seedCharacter({ attributes: { edge: 3, heart: 2, iron: 2, shadow: 1, wits: 2 }, momentum: 0 });
    const { container } = renderSheet('/uk/character?move=face-danger');

    expect(rollButton().disabled).toBe(true);
    expect(rollButton().textContent).toContain('Оберіть, як дієте');
    fireEvent.click(within(drawer()).getByRole('radio', { name: /Швидко, спритно чи точно/ }));
    expect(rollButton().textContent).toContain('Кинути: d6 + 3');

    stubDice(d6(4), d10(2), d10(9));
    fireEvent.click(rollButton());

    expect(q(drawer(), '.roll-card__label')?.textContent).toBe('Стріти небезпеку · Вістря');
    expect(q(drawer(), '.outcome-band--rolled')?.getAttribute('data-outcome')).toBe('weak');
    expect(qa(drawer(), '.outcome-band--dimmed').map(b => b.getAttribute('data-outcome'))).toEqual(['strong', 'miss']);
    expect(q(container, '.log-row__label')?.textContent).toBe('Стріти небезпеку · Вістря');
    expect(q(container, '.roll-toasts .roll-card')).toBeNull();
    expect(q(drawer(), '.moves-drawer__summary')?.textContent).toBe('Ледь · 7 проти 2 і 9');
  });

  it('додатки й бонус «+1 за стосунки» йдуть у кидок', () => {
    seedCharacter({ attributes: { edge: 1, heart: 1, iron: 1, shadow: 1, wits: 2 } });
    renderSheet('/uk/character?move=gather-information');
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Додатки: збільшити' }));
    fireEvent.click(within(drawer()).getByRole('button', { name: '+1 за стосунки зі спільнотою' }));
    expect(rollButton().textContent).toContain('Кинути: d6 + 2 + 2');
  });

  it('спалює імпульс прямо на картці', () => {
    seedCharacter({ attributes: { edge: 3, heart: 1, iron: 1, shadow: 1, wits: 1 }, momentum: 8 });
    renderSheet('/uk/character?move=face-danger');
    fireEvent.click(within(drawer()).getByRole('radio', { name: /Швидко, спритно чи точно/ }));
    stubDice(d6(1), d10(5), d10(7));
    fireEvent.click(rollButton());
    expect(q(drawer(), '.outcome-band--rolled')?.getAttribute('data-outcome')).toBe('miss');

    fireEvent.click(q(drawer(), '.burn-button') as HTMLElement);
    expect(q(drawer(), '.outcome-band--rolled')?.getAttribute('data-outcome')).toBe('strong');
    expect(strip('momentum')).toBe('+2');
  });

  it('чіп наслідку змінює персонажа і скасовується', () => {
    seedCharacter({ stats: { health: 5, spirit: 5, supply: 3 } });
    renderSheet('/uk/character?move=face-danger');
    const chip = [...drawer().querySelectorAll<HTMLButtonElement>('button.effect-chip')].find(
      button => button.textContent === 'Припаси −1 · 3 → 2',
    ) as HTMLButtonElement;
    fireEvent.click(chip);
    expect(strip('supply')).toBe('2');
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Скасувати' }));
    expect(strip('supply')).toBe('3');
  });

  it('наслідок-хід відкриває його з підставленою шкодою', () => {
    seedCharacter();
    renderSheet('/uk/character?move=face-danger');
    fireEvent.click(within(drawer()).getByRole('button', { name: '→ Зазнати шкоди (1)' }));
    expect(where()).toBe('/uk/character?move=endure-harm');
    expect(within(drawer()).getByRole('button', { name: '← Назад до Стріти небезпеку' })).toBeTruthy();
    expect(within(drawer()).getByLabelText('Шкода').textContent).toBe('1');
  });
});

describe('особливі ходи', () => {
  it('«Зазнати шкоди»: спершу втрата, потім кидок вище з двох', () => {
    seedCharacter({ stats: { health: 4, spirit: 5, supply: 5 }, attributes: { edge: 1, heart: 1, iron: 2, shadow: 1, wits: 1 } });
    renderSheet('/uk/character?move=endure-harm');
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Шкода: збільшити' }));
    fireEvent.click(within(drawer()).getByRole('button', { name: /Застосувати: Здоров’я 4 → 2/ }));
    expect(strip('health')).toBe('2');
    expect(rollButton().textContent).toContain('Кинути: d6 + 2');
    expect(within(drawer()).getByText(/вище з Здоров’я 2 і Залізо 2/)).toBeTruthy();
  });

  it('хід прогресу без шкал пояснює, чого бракує', () => {
    seedCharacter();
    renderSheet('/uk/character?move=end-the-fight');
    expect(rollButton().disabled).toBe(true);
    expect(within(drawer()).getAllByText(/Немає треку бою/).length).toBeGreaterThan(0);
  });

  it('«Сплатити ціну»: d100 підсвічує рядок і йде в журнал', () => {
    seedCharacter();
    const { container } = renderSheet('/uk/character?move=pay-the-price');
    stubD100(47);
    fireEvent.click(rollButton());
    expect(q(drawer(), '.move-table__hit')?.textContent).toContain('42–50');
    expect(q(drawer(), '.oracle-result__value')?.textContent).toBe('47');
    expect(q(container, '.log-row--oracle .log-row__dice')?.textContent).toBe('d100: 47');
  });

  it('«Спитати Оракула»: шанси і відповідь «Так» / «Ні»', () => {
    seedCharacter();
    renderSheet('/uk/character?move=ask-the-oracle');
    expect(rollButton().disabled).toBe(true);
    fireEvent.click(within(drawer()).getByRole('radio', { name: /50\/50/ }));
    stubD100(51);
    fireEvent.click(rollButton());
    expect(q(drawer(), '.oracle-result')?.textContent).toContain('→ Так');
  });
});
