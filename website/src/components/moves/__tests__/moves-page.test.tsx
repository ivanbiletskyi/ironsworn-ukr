// Довідник ходів через UI: URL ↔ фільтри, шторка й «Назад», перемикач
// результату, посилання між ходами, клавіатура, закріплені, тренування.
//
// jsdom не має `matchMedia`, тож за замовчуванням рендериться вузька
// (мобільна) верстка; десктопні випадки підміняють медіазапит явно.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MovesPage from '../MovesPage';
import { MOVES } from '../../../utils/moves';
import { FAVORITES_KEY, RECENT_KEY, TRAINER_KEY } from '../useMovesStorage';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{decodeURIComponent(location.pathname + location.search)}</output>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/:lang/moves"
          element={
            <>
              <MovesPage currentLang={url.startsWith('/en') ? 'en' : 'uk'} />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/:lang/moves/:moveId"
          element={
            <>
              <MovesPage currentLang={url.startsWith('/en') ? 'en' : 'uk'} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('location').textContent;
const search = () => screen.getByRole('searchbox', { name: 'Пошук ходу' }) as HTMLInputElement;
const cardNames = (root: HTMLElement) =>
  [...root.querySelectorAll('.moves-single .move-card__name, .moves-list-pane .move-card__name')].map(
    node => node.textContent?.replace('*', ''),
  );

/** Десктоп: `(min-width: 901px)` збігається. */
function stubWide() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 901px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('список і пошук', () => {
  it('показує всі 36 ходів групами в порядку набору', () => {
    const { container } = renderAt('/uk/moves');
    expect(cardNames(container)).toHaveLength(MOVES.length);
    expect(cardNames(container)[0]).toBe('Стріти небезпеку');
    expect(container.querySelectorAll('.move-group')).toHaveLength(6);
  });

  it('пише запит у URL і ставить найкращий збіг першим', () => {
    const { container } = renderAt('/uk/moves');
    fireEvent.change(search(), { target: { value: 'лікую' } });
    expect(where()).toBe('/uk/moves?q=лікую');
    expect(cardNames(container)[0]).toBe('Лікувати');
    expect(container.querySelector('.move-card mark')?.textContent).toBe('Лікувати');
  });

  it('відновлює запит і фільтри з URL', () => {
    const { container } = renderAt('/uk/moves?q=дуель&stat=heart');
    expect(search().value).toBe('дуель');
    expect(cardNames(container)).toEqual(['Накреслити кільце']);
    expect(screen.getByText('за запитом: дуель')).toBeTruthy();
  });

  it('на телефоні чіп категорії фільтрує список', () => {
    const { container } = renderAt('/uk/moves');
    fireEvent.click(within(container.querySelector('.chip-row--categories')!).getByText('Оракул'));
    expect(where()).toBe('/uk/moves?cat=fate');
    expect(cardNames(container)).toEqual(['Сплатити ціну', 'Спитати Оракула']);
  });

  it('порожній результат пропонує стартові ходи', () => {
    renderAt('/uk/moves?q=ххххх');
    expect(screen.getByText('Не знайшли такого ходу.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Стріти небезпеку' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Спитати Оракула' })).toBeTruthy();
  });

  it('фільтр «Тільки основні» лишає 8 ходів', () => {
    const { container } = renderAt('/uk/moves');
    fireEvent.click(screen.getByRole('button', { name: /Фільтри/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Тільки основні' }));
    expect(where()).toBe('/uk/moves?core=1');
    expect(cardNames(container)).toHaveLength(8);
  });
});

describe('шторка ходу на телефоні', () => {
  it('відкривається з картки й закривається кнопкою «Назад»', () => {
    renderAt('/uk/moves?q=лік');
    fireEvent.click(screen.getByRole('link', { name: /Лікувати/ }));
    expect(where()).toBe('/uk/moves/heal?q=лік');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Лікувати');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Закрити хід' }));
    expect(where()).toBe('/uk/moves?q=лік');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('перемикач результату приглушує дві інші смуги, повторний тап знімає', () => {
    const { container } = renderAt('/uk/moves/face-danger');
    const weak = screen.getByRole('button', { name: /Ледь/ });
    fireEvent.click(weak);
    expect(weak.getAttribute('aria-pressed')).toBe('true');
    const dimmed = [...container.querySelectorAll('.outcome-band--dimmed')].map(
      band => band.getAttribute('data-outcome'),
    );
    expect(dimmed).toEqual(['strong', 'miss']);

    fireEvent.click(weak);
    expect(container.querySelectorAll('.outcome-band--dimmed')).toHaveLength(0);
  });

  it('курсивна назва ходу відкриває його поверх, з кнопкою назад', () => {
    renderAt('/uk/moves/face-danger');
    fireEvent.click(screen.getAllByRole('button', { name: 'Сплатіть ціну' })[0]);
    expect(where()).toBe('/uk/moves/pay-the-price');
    const back = screen.getByRole('button', { name: '← Назад до Стріти небезпеку' });
    fireEvent.click(back);
    expect(where()).toBe('/uk/moves/face-danger');
  });

  it('‹ › переходять між ходами поточного списку', () => {
    renderAt('/uk/moves/face-danger?cat=fate');
    // Хід поза відфільтрованим списком: кроків немає.
    expect((screen.getByRole('button', { name: 'Наступний хід' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('невідомий хід — повідомлення з поверненням до списку', () => {
    renderAt('/uk/moves/no-such-move');
    expect(screen.getByText('Ходу «no-such-move» немає в довіднику.')).toBeTruthy();
  });
});

describe('десктоп', () => {
  it('без вибраного ходу показує памʼятку кидка', () => {
    stubWide();
    renderAt('/uk/moves');
    expect(screen.getByRole('heading', { name: 'Памʼятка кидка' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('клавіатура: / — пошук, ↓ — наступний хід, F — закріпити, Esc — очистити', () => {
    stubWide();
    renderAt('/uk/moves');
    fireEvent.keyDown(document.body, { key: '/', code: 'Slash' });
    expect(document.activeElement).toBe(search());

    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(where()).toBe('/uk/moves/face-danger');
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(where()).toBe('/uk/moves/secure-an-advantage');

    act(() => search().blur());
    fireEvent.keyDown(document.body, { key: 'f', code: 'KeyF' });
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')).toEqual(['secure-an-advantage']);

    fireEvent.change(search(), { target: { value: 'дуель' } });
    fireEvent.keyDown(search(), { key: 'Escape' });
    expect(search().value).toBe('');
  });

  it('Enter у пошуку відкриває перший збіг', () => {
    stubWide();
    renderAt('/uk/moves');
    fireEvent.change(search(), { target: { value: 'тікаю' } });
    fireEvent.submit(search().closest('form')!);
    expect(where()).toBe('/uk/moves/face-danger?q=тікаю');
    expect(screen.getByRole('heading', { level: 2, name: 'Стріти небезпеку' })).toBeTruthy();
  });

  it('? показує клавіатурні скорочення', () => {
    stubWide();
    renderAt('/uk/moves');
    fireEvent.keyDown(document.body, { key: '?', code: 'Slash', shiftKey: true });
    expect(screen.getByRole('dialog', { name: 'Клавіатурні скорочення' })).toBeTruthy();
  });
});

describe('закріплені й нещодавні', () => {
  it('зірочка дублює хід у групу «Мої ходи», не переносячи його', () => {
    const { container } = renderAt('/uk/moves');
    fireEvent.click(screen.getByRole('button', { name: 'Закріпити «Напасти»' }));
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')).toEqual(['strike']);
    const favorites = container.querySelector('.move-group--favorites')!;
    expect(within(favorites as HTMLElement).getByText('Напасти')).toBeTruthy();
    // У своїй групі хід лишився на місці.
    expect(within(container.querySelector('#move-group-combat') as HTMLElement).getByText('Напасти')).toBeTruthy();
  });

  it('відкритий хід потрапляє в нещодавні', () => {
    renderAt('/uk/moves/heal');
    expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')).toEqual(['heal']);
  });
});

describe('тренування', () => {
  it('«Ситуація → хід»: правильна відповідь піднімає хід у коробку 2', () => {
    renderAt('/uk/moves?view=train');
    fireEvent.click(screen.getByRole('button', { name: 'Почати' }));
    const situation = document.querySelector('.trainer-card__situation')!.textContent!;
    const move = MOVES.find(m => situation === `Коли… ${m.trigger}`)!;
    fireEvent.click(screen.getByRole('button', { name: move.name }));
    expect(screen.getByText('Так!')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(TRAINER_KEY) ?? '{}')[move.id]).toBe(2);
  });
});

describe('мова', () => {
  it('англійська адреса веде на українську', () => {
    renderAt('/en/moves/face-danger');
    expect(where()).toBe('/uk/moves/face-danger');
  });
});
