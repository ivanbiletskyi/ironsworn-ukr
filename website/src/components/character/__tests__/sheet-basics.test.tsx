// Sheet plumbing and the simple fields: name, attributes, momentum, stats,
// debilities. Covers CHARACTER_SHEET_PLAN.md §3.3, §3.4, §3.9 through the UI.

import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CharacterSheet from '../CharacterSheet';
import {
  attributeSteppers,
  attributeValue,
  currentValue,
  debilityBoxes,
  enterAttributeEditMode,
  momentumCells,
  momentumReadouts,
  nameInput,
  q,
  qa,
  seedCharacter,
  statCells,
  type,
} from './helpers';

const renderSheet = () => render(<CharacterSheet currentLang="uk" />);

const storedCharacter = () =>
  JSON.parse(localStorage.getItem('ironsworn-characters-v1') ?? 'null')?.characters?.[0];

describe('mounting', () => {
  it('creates a character when storage is empty', () => {
    const { container, unmount } = renderSheet();
    expect(nameInput(container)).toBeTruthy();
    expect(nameInput(container).value).toBe('');
    unmount();

    const stored = storedCharacter();
    expect(stored.xp).toHaveLength(30);
    expect(stored.vows).toHaveLength(1);
  });

  it('loads the stored character instead of creating another', () => {
    seedCharacter({ name: 'Ульріка' });
    const { container } = renderSheet();
    expect(nameInput(container).value).toBe('Ульріка');
  });

  it('is Ukrainian only and redirects any other language', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/en/character']}>
        <Routes>
          <Route path="/en/character" element={<CharacterSheet currentLang="en" />} />
          <Route path="/uk/character" element={<p>uk sheet</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.textContent).toBe('uk sheet');
  });
});

describe('autosave', () => {
  it('persists the name and restores it on the next mount', () => {
    const first = renderSheet();
    type(nameInput(first.container), 'Ульріка Залізнобока');
    // Unmounting flushes the debounced save, so no timers are needed here.
    first.unmount();
    expect(storedCharacter().name).toBe('Ульріка Залізнобока');

    const second = renderSheet();
    expect(nameInput(second.container).value).toBe('Ульріка Залізнобока');
  });
});

describe('momentum rail', () => {
  it('spans +10 down to −6 and starts at +2', () => {
    const { container } = renderSheet();
    const cells = momentumCells(container);
    expect(cells).toHaveLength(17);
    expect(cells[0].textContent).toBe('+10');
    expect(cells.at(-1)?.textContent).toBe('−6');
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+2');
    expect(momentumReadouts(container)).toEqual(['+10', '+2']);
  });

  it('selects a value on click', () => {
    const { container } = renderSheet();
    fireEvent.click(momentumCells(container)[0]);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+10');
  });
});

describe('debilities drive momentum (§3.3, §3.4)', () => {
  it('lowers max and reset, and pulls current momentum down with the max', () => {
    const { container } = renderSheet();
    fireEvent.click(momentumCells(container)[0]); // momentum +10

    fireEvent.click(debilityBoxes(container)[0]); // Поранений
    expect(momentumReadouts(container)).toEqual(['+9', '+1']);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+9');
    expect(momentumCells(container)[0].hasAttribute('disabled')).toBe(true);
    expect(q(container, '.sheet-zone--momentum .scale-hint')?.textContent).toBe(
      '−1 через 1 слабкість',
    );

    fireEvent.click(debilityBoxes(container)[6]); // Прокляття
    expect(momentumReadouts(container)).toEqual(['+8', '0']);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+8');
    expect(q(container, '.sheet-zone--momentum .scale-hint')?.textContent).toBe(
      '−2 через 2 слабкості',
    );

    fireEvent.click(debilityBoxes(container)[7]); // Зморення — third one
    expect(momentumReadouts(container)).toEqual(['+7', '0']);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+7');
  });

  it('does not hand momentum back when a debility is cleared', () => {
    const { container } = renderSheet();
    fireEvent.click(momentumCells(container)[0]); // +10
    fireEvent.click(debilityBoxes(container)[0]);
    fireEvent.click(debilityBoxes(container)[6]);
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+8');

    fireEvent.click(debilityBoxes(container)[6]); // clear it again
    expect(momentumReadouts(container)).toEqual(['+9', '+1']);
    // The max rose, but the momentum the character lost has to be earned back.
    expect(currentValue(container, '.sheet-zone--momentum')).toBe('+8');
  });
});

describe('stat locks (§3.9)', () => {
  it('stops a wounded character from raising health but still allows lowering it', () => {
    const { container } = renderSheet();
    fireEvent.click(debilityBoxes(container)[0]); // Поранений
    expect(q(container, '.sheet-zone--stats .scale-hint')?.textContent).toBe(
      'Поранений: не можна збільшувати «Здоров’я»',
    );

    // Health sits at its maximum, so there is nothing above it to disable yet.
    expect(statCells(container, 0).some(cell => cell.hasAttribute('disabled'))).toBe(false);

    const cells = statCells(container, 0);
    fireEvent.click(cells[cells.length - 1]); // drop to 0 — lowering stays allowed
    expect(currentValue(container, '.sheet-zone--stats')).toBe('0');
    // Now every value above 0 is out of reach until the condition is cleared.
    expect(statCells(container, 0).map(cell => cell.hasAttribute('disabled'))).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('leaves unrelated stats alone and unlocks on clear', () => {
    const { container } = renderSheet();
    fireEvent.click(debilityBoxes(container)[0]);
    expect(statCells(container, 1).some(cell => cell.hasAttribute('disabled'))).toBe(false);

    fireEvent.click(debilityBoxes(container)[0]); // clear Поранений
    expect(statCells(container, 0).some(cell => cell.hasAttribute('disabled'))).toBe(false);
  });
});

describe('attributes', () => {
  it('shows the five attributes with site terminology', () => {
    const { container } = renderSheet();
    expect(qa(container, '.attribute-box__title').map(node => node.textContent)).toEqual([
      'Вістря',
      'Серце',
      'Залізо',
      'Тінь',
      'Розум',
    ]);
  });

  it('steps a value up without losing clicks that land in one React batch', () => {
    const { container } = renderSheet();
    expect(attributeValue(container, 0).textContent).toBe('0');
    enterAttributeEditMode(container);
    expect(attributeSteppers(container, 0)[0].hasAttribute('disabled')).toBe(true);

    const plus = attributeSteppers(container, 0)[1];
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(attributeValue(container, 0).textContent).toBe('+3');
  });

  it('keeps attributes independent', () => {
    const { container } = renderSheet();
    enterAttributeEditMode(container);
    fireEvent.click(attributeSteppers(container, 0)[1]);
    fireEvent.click(attributeSteppers(container, 1)[1]);
    fireEvent.click(attributeSteppers(container, 1)[1]);
    expect(qa(container, '.attribute-box__value').map(node => node.textContent)).toEqual([
      '+1',
      '+2',
      '0',
      '0',
      '0',
    ]);
  });

  it('stops at 5', () => {
    const { container } = renderSheet();
    enterAttributeEditMode(container);
    const plus = attributeSteppers(container, 0)[1];
    for (let i = 0; i < 8; i++) fireEvent.click(plus);
    expect(attributeValue(container, 0).textContent).toBe('+5');
    expect(attributeSteppers(container, 0)[1].hasAttribute('disabled')).toBe(true);
  });
});
