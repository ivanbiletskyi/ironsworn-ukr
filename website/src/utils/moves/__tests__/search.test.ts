import { describe, expect, it } from 'vitest';
import { matchRanges, queryStems, searchMoves } from '../search';
import { normalize, stem } from '../normalize';

const ids = (query: string, filters = {}) => searchMoves(query, filters).map(hit => hit.move.id);

describe('нормалізація', () => {
  it('зводить регістр, апострофи й ї/є/ґ', () => {
    expect(normalize('Здоров’я')).toBe(normalize("здоров'я"));
    expect(normalize('Здоровʼя')).toBe('здоровя');
    expect(normalize('Їжа Ґанок Єдність')).toBe('іжа ганок едність');
  });

  it('бере основу з перших 4–5 літер', () => {
    expect(stem('лікую')).toBe('ліку');
    expect(stem('тікаю')).toBe('тіка');
    expect(stem('бій')).toBe('бій');
  });
});

describe('пошук ходів', () => {
  it('без запиту повертає всі ходи в порядку набору', () => {
    const all = ids('');
    expect(all).toHaveLength(36);
    expect(all[0]).toBe('face-danger');
    expect(all[35]).toBe('ask-the-oracle');
  });

  it('знаходить хід за дієсловом у іншій формі', () => {
    expect(ids('лікую')[0]).toBe('heal');
    expect(ids('напасти')[0]).toBe('strike');
  });

  it('знаходить хід за ситуацією зі словника синонімів', () => {
    const hits = searchMoves('тікати');
    expect(hits[0].move.id).toBe('face-danger');
    expect(hits[0].via).toBe('тікати');
    expect(ids('дуель')[0]).toBe('draw-the-circle');
    expect(ids('переконати')[0]).toBe('compel');
    expect(ids('полювання')[0]).toBe('resupply');
  });

  it('знаходить за старою назвою з книги', () => {
    expect(ids('окреслити коло')[0]).toBe('draw-the-circle');
    expect(ids('поповнити припаси')[0]).toBe('resupply');
  });

  it('не зважає на апострофи', () => {
    expect(ids('здоровя')).toContain('endure-harm');
    expect(ids("здоров'я")).toEqual(ids('здоров’я'));
  });

  it('ставить початок назви вище за збіг у тригері', () => {
    // Чотири «Стріти …» — у порядку набору, а ходи, що лише згадують
    // «Стріньте смерть» у тексті, — після них.
    const order = ids('стріти');
    expect(order.slice(0, 4)).toEqual(['face-danger', 'face-death', 'face-desolation', 'face-a-setback']);
    expect(order.length).toBeGreaterThan(4);
  });

  it('вимагає збігу всіх слів запиту', () => {
    expect(ids('стріти смерть')[0]).toBe('face-death');
    expect(ids('стріти смерть')).not.toContain('face-danger');
  });

  it('порожньо для нісенітниці', () => {
    expect(ids('ххххх')).toEqual([]);
  });

  it('фільтрує за категорією, статом і основними ходами', () => {
    expect(ids('', { category: 'fate' })).toEqual(['pay-the-price', 'ask-the-oracle']);
    expect(ids('', { stat: 'shadow' })).toEqual([
      'face-danger',
      'secure-an-advantage',
      'compel',
      'enter-the-fray',
      'battle',
    ]);
    expect(ids('', { coreOnly: true })).toHaveLength(8);
  });

  it('підсвічує цілі слова, що починаються з основи', () => {
    const text = 'Коли ви лікуєте поранення';
    expect(matchRanges(text, queryStems('лікую'))).toEqual([[8, 15]]);
    expect(matchRanges(text, [])).toEqual([]);
  });
});
