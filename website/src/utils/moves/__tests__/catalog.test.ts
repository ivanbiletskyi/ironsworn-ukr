// Інваріанти каталогу ходів. Текст звіряють зі сторінкою набору (`source`),
// а тут ловляться сліди оцифрування, биті посилання між ходами й хід дії
// без трьох результатів.

import { describe, expect, it } from 'vitest';
import {
  CATEGORY_META,
  FALLBACK_MOVE_IDS,
  FREQUENT_MOVE_IDS,
  MOVES,
  MOVES_BY_CATEGORY,
  MOVE_CATEGORIES,
  OTHER_COMBAT_MOVES,
  findMoveByName,
  getMove,
  italics,
  moveTexts,
  relatedMoves,
  rollBadge,
} from '../index';

describe('каталог ходів', () => {
  it('містить усі 36 ходів набору в 6 категоріях', () => {
    expect(MOVES).toHaveLength(36);
    expect(MOVES_BY_CATEGORY.adventure).toHaveLength(9);
    expect(MOVES_BY_CATEGORY.relationship).toHaveLength(7);
    expect(MOVES_BY_CATEGORY.combat).toHaveLength(6);
    expect(MOVES_BY_CATEGORY.suffer).toHaveLength(7);
    expect(MOVES_BY_CATEGORY.quest).toHaveLength(5);
    expect(MOVES_BY_CATEGORY.fate).toHaveLength(2);
    for (const category of MOVE_CATEGORIES) {
      expect(CATEGORY_META[category].title).toMatch(/^Ходи /);
      for (const move of MOVES_BY_CATEGORY[category]) expect(move.category).toBe(category);
    }
  });

  it('має унікальні id-слаги', () => {
    const ids = MOVES.map(move => move.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('бере назви з грального набору, а старі назви книги лишає синонімами', () => {
    expect(getMove('resupply')?.name).toBe('Поповнення');
    expect(getMove('draw-the-circle')?.name).toBe('Накреслити кільце');
    expect(getMove('write-your-epilogue')?.name).toBe('Написати епілог');
    expect(getMove('companion-endure-harm')?.name).toBe('Шкода супутнику');
    expect(findMoveByName('Поповнити припаси')?.id).toBe('resupply');
    expect(findMoveByName('Окреслити коло')?.id).toBe('draw-the-circle');
    expect(findMoveByName('Супутник зазнає шкоди')?.id).toBe('companion-endure-harm');
  });

  it('кожен хід дії має три результати, а хід без кидка — жодного', () => {
    for (const move of MOVES) {
      if (move.rollKind === 'action' || move.rollKind === 'progress') {
        expect(move.outcomes, move.id).toBeDefined();
        expect(move.outcomes?.strong.length, move.id).toBeGreaterThan(0);
        expect(move.outcomes?.weak.length, move.id).toBeGreaterThan(0);
        expect(move.outcomes?.miss.length, move.id).toBeGreaterThan(0);
      } else {
        expect(move.outcomes, move.id).toBeUndefined();
      }
      if (move.rollKind === 'action') expect(move.stats.length, move.id).toBeGreaterThan(0);
      else expect(move.stats, move.id).toEqual([]);
    }
  });

  it('стати таблиці підходів збігаються зі статами ходу', () => {
    for (const move of MOVES) {
      for (const approach of move.approaches ?? []) {
        expect(move.stats, move.id).toContain(approach.stat);
      }
    }
  });

  it('кожна курсивна назва в тексті веде на хід', () => {
    for (const move of MOVES) {
      for (const text of moveTexts(move)) {
        for (const name of italics(text)) {
          expect(findMoveByName(name)?.id, `${move.id}: «${name}»`).toBeDefined();
        }
      }
    }
  });

  it('не містить слідів оцифрування', () => {
    for (const move of MOVES) {
      for (const text of [move.name, move.trigger, ...move.aliases, ...moveTexts(move)]) {
        expect(text, move.id).not.toMatch(/\s{2}/);
        expect(text, move.id).not.toMatch(/'/); // прямий апостроф замість ’
        expect(text, move.id).not.toMatch(/­/); // мʼякий перенос зі скану
        expect(text, move.id).not.toMatch(/влушивши|школи|Спитайче|Спитайне|гратики|процесу/);
        expect((text.match(/\*\*/g) ?? []).length % 2, move.id).toBe(0);
        expect((text.replace(/\*\*/g, '').match(/\*/g) ?? []).length % 2, move.id).toBe(0);
      }
      expect(move.trigger, move.id).not.toMatch(/^Коли/);
      expect(move.source, move.id).toMatch(/^page-00(0[6-9]|1[0-5])$/);
    }
  });

  it('посилається на розділ книги, крім експедиційного ходу', () => {
    for (const move of MOVES) {
      if (move.expedition) expect(move.bookRef).toBeUndefined();
      else expect(move.bookRef, move.id).toMatch(/^3-Moves_\d-[A-Za-z-]+#[\p{L}-]+$/u);
    }
  });

  it('позначає рівно 8 основних ходів', () => {
    expect(MOVES.filter(move => move.core).map(move => move.id)).toEqual([
      'face-danger',
      'secure-an-advantage',
      'gather-information',
      'compel',
      'strike',
      'clash',
      'endure-harm',
      'pay-the-price',
    ]);
  });

  it('усі службові списки посилаються на наявні ходи', () => {
    for (const id of [...FALLBACK_MOVE_IDS, ...FREQUENT_MOVE_IDS]) expect(getMove(id)).toBeDefined();
    for (const entry of OTHER_COMBAT_MOVES) {
      if (entry.moveId) expect(getMove(entry.moveId)?.name).toBe(entry.label);
    }
  });

  it('збирає повʼязані ходи з курсиву', () => {
    expect(relatedMoves(getMove('face-danger')!).map(move => move.id)).toEqual([
      'endure-harm',
      'endure-stress',
      'pay-the-price',
    ]);
    expect(relatedMoves(getMove('heal')!).map(move => move.id)).toEqual(['pay-the-price']);
  });

  it('показує бейдж кидка за видом ходу', () => {
    expect(rollBadge(getMove('gather-information')!)).toBe('+Розум');
    expect(rollBadge(getMove('face-danger')!)).toBe('на вибір');
    expect(rollBadge(getMove('strike')!)).toBe('+Залізо/Вістря');
    expect(rollBadge(getMove('end-the-fight')!)).toBe('прогрес');
    expect(rollBadge(getMove('advance')!)).toBe('без кидка');
    expect(rollBadge(getMove('ask-the-oracle')!)).toBe('d100');
  });
});
