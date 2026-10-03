// Правила ходу в контексті персонажа: рядки панелі кидка, втрата перед
// кидком, шкали прогресу, наслідки та їх скасування, таблиці d100.

import { describe, expect, it } from 'vitest';
import type { Character } from '../../character/types';
import { createCharacter } from '../../character/storage';
import { MOVES, getMove, isTable } from '../index';
import { itemEffects } from '../move-types';
import {
  applyEffect,
  applyLoss,
  companions,
  effectLabel,
  isD100Table,
  oracleAnswer,
  oracleOdds,
  previewEffect,
  progressTracks,
  revertEffect,
  rollBlocker,
  rollOptions,
  rollSpec,
  sufferRollValue,
  tableRowFor,
} from '../play';

function hero(patch: Partial<Character> = {}): Character {
  return {
    ...createCharacter('Ульріка'),
    attributes: { edge: 3, heart: 2, iron: 1, shadow: 1, wits: 2 },
    stats: { health: 4, spirit: 3, supply: 2 },
    momentum: 2,
    ...patch,
  };
}

const move = (id: string) => {
  const found = getMove(id);
  if (!found) throw new Error(id);
  return found;
};

describe('форма кидка', () => {
  it('кожен хід дії чи прогресу має форму кидка, а ходи без кидка — ні', () => {
    for (const m of MOVES) {
      const spec = rollSpec(m);
      if (m.rollKind === 'action') expect(['action', 'sufferThenRoll'], m.id).toContain(spec.kind);
      if (m.rollKind === 'progress') expect(spec.kind, m.id).toBe('progress');
      if (m.rollKind === 'none') expect(spec.kind, m.id).toBe('none');
      if (m.rollKind === 'oracle') expect(['payThePrice', 'askTheOracle'], m.id).toContain(spec.kind);
    }
  });

  it('рядки підходів показують значення персонажа', () => {
    const options = rollOptions(move('face-danger'), hero());
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([3, 2, 1, 1, 2]);
    expect(options[0].statText).toBe('Вістря');
  });

  it('хід з одним статом має один рядок', () => {
    expect(rollOptions(move('gather-information'), hero()).map(o => [o.statText, o.value])).toEqual([['Розум', 2]]);
    expect(rollOptions(move('strike'), hero()).map(o => o.value)).toEqual([1, 3]);
  });

  it('«Лікувати» власні рани бере нижче з Розуму й Заліза', () => {
    const options = rollOptions(move('heal'), hero());
    expect(options[1]).toMatchObject({ label: 'Власні рани', value: 1 });
  });

  it('«Перевірити спорядження» не кидається без Припасів', () => {
    expect(rollBlocker(move('check-your-gear'), hero())).toBeNull();
    expect(rollBlocker(move('check-your-gear'), hero({ stats: { health: 4, spirit: 3, supply: 0 } }))).toMatch(/Припас/);
  });
});

describe('спершу втрата, потім кидок', () => {
  it('віднімає Здоров’я, а надлишок — з імпульсу', () => {
    const next = applyLoss(hero({ momentum: 3 }), 'health', 6);
    expect(next.stats.health).toBe(0);
    expect(next.momentum).toBe(1);
  });

  it('кидає вище з показника після втрати й атрибута', () => {
    const spec = rollSpec(move('endure-harm'));
    if (spec.kind !== 'sufferThenRoll') throw new Error('форма');
    expect(sufferRollValue(hero(), spec).value).toBe(4);
    const hurt = applyLoss(hero(), 'health', 4);
    expect(sufferRollValue(hurt, spec)).toMatchObject({ value: 1, text: 'вище з Здоров’я 0 і Залізо 1' });
  });

  it('супутник — профіль зі шкалою, його здоров’я — вибрана клітинка', () => {
    const withCat = hero({
      profiles: [{ id: 'p1', profileId: 'companion-pechernyi-lev', marked: [], fields: { name: 'Мурка' }, trackIndex: 3 }],
    });
    expect(companions(withCat)).toEqual([{ id: 'p1', name: 'Мурка', health: 3, max: 4 }]);
    const after = applyLoss(withCat, 'companionHealth', 2, 'p1');
    expect(after.profiles[0].trackIndex).toBe(1);
  });
});

describe('шкали прогресу', () => {
  it('добирає шкали за видом ходу', () => {
    const c = hero({
      vows: [{ id: 'v1', name: '', rank: 'formidable', ticks: 8 }],
      extraTracks: [
        { id: 't1', name: 'Вовки', rank: 'dangerous', ticks: 4, kind: 'combat' },
        { id: 't2', name: '', rank: 'troublesome', ticks: 0, kind: 'journey' },
      ],
      bondTicks: 6,
    });
    expect(progressTracks(c, 'vow').map(t => t.label)).toEqual(['Присяга 1']);
    expect(progressTracks(c, 'combat').map(t => t.id)).toEqual(['t1']);
    expect(progressTracks(c, 'journey').map(t => t.label)).toEqual(['Подорож']);
    expect(progressTracks(c, 'bond')).toEqual([{ id: 'bonds', label: 'Стосунки', ticks: 6 }]);
  });
});

describe('наслідки', () => {
  it('імпульс змінюється в межах максимуму', () => {
    const c = hero({ momentum: 9 });
    expect(previewEffect(c, { kind: 'momentum', delta: 1 }).change).toBe('+9 → +10');
    expect(previewEffect(hero({ momentum: 10 }), { kind: 'momentum', delta: 1 }).disabled).toMatch(/максимальний/);
  });

  it('на мінімумі імпульсу веде до «Стріти невдачу»', () => {
    const preview = previewEffect(hero({ momentum: -6 }), { kind: 'momentum', delta: -1 });
    expect(preview).toMatchObject({ disabled: 'Імпульс уже мінімальний', followUp: 'face-a-setback' });
  });

  it('«Поранений» не дає підняти Здоров’я', () => {
    const c = hero();
    c.debilities = { ...c.debilities, wounded: true };
    expect(previewEffect(c, { kind: 'stat', stat: 'health', delta: 1 }).disabled).toMatch(/Поранений/);
    expect(applyEffect(c, { kind: 'stat', stat: 'health', delta: 1 }).stats.health).toBe(4);
  });

  it('Припаси на нулі ведуть до «Зазнати злиднів»', () => {
    const preview = previewEffect(hero({ stats: { health: 4, spirit: 3, supply: 0 } }), {
      kind: 'stat',
      stat: 'supply',
      delta: -1,
    });
    expect(preview.followUp).toBe('out-of-supply');
  });

  it('позначає прогрес за рангом вибраної шкали', () => {
    const c = hero({
      extraTracks: [
        { id: 't1', name: 'А', rank: 'troublesome', ticks: 0, kind: 'journey' },
        { id: 't2', name: 'Б', rank: 'formidable', ticks: 0, kind: 'journey' },
      ],
    });
    const next = applyEffect(c, { kind: 'progress', tracks: 'journey' }, { trackId: 't2' });
    expect(next.extraTracks.map(t => t.ticks)).toEqual([0, 4]);
    expect(previewEffect(hero(), { kind: 'progress', tracks: 'journey' }).disabled).toMatch(/подорожі/);
  });

  it('скасування повертає лише своє поле', () => {
    const before = hero({ momentum: 2 });
    const effect = { kind: 'momentum', delta: 2 } as const;
    const applied = applyEffect(before, effect);
    const changedLater = { ...applied, stats: { ...applied.stats, supply: 5 } };
    const reverted = revertEffect(changedLater, before, effect);
    expect(reverted.momentum).toBe(2);
    expect(reverted.stats.supply).toBe(5);
  });

  it('кожен наслідок-хід веде на наявний хід, і кожен наслідок має підпис', () => {
    for (const m of MOVES) {
      const blocks = [...(m.outcomes?.strong ?? []), ...(m.outcomes?.weak ?? []), ...(m.outcomes?.miss ?? []), ...(m.after ?? [])];
      const effects = [
        ...Object.values(m.outcomeEffects ?? {}).flat(),
        ...(m.leadEffects ?? []),
        ...blocks.flatMap(block => (Array.isArray(block) ? block.flatMap(itemEffects) : [])),
      ];
      for (const effect of effects) {
        expect(effectLabel(effect), m.id).not.toBe('');
        if (effect.kind === 'move') expect(getMove(effect.moveId), `${m.id} → ${effect.moveId}`).toBeDefined();
      }
    }
  });
});

describe('d100', () => {
  it('знаходить рядок «Сплатити ціну», «00» — це 100', () => {
    const table = (move('pay-the-price').after ?? []).find(isTable)!;
    expect(isD100Table(table)).toBe(true);
    expect(tableRowFor(table, 1)).toBe(0);
    expect(tableRowFor(table, 50)).toBe(7);
    expect(tableRowFor(table, 100)).toBe(table.rows.length - 1);
  });

  it('шанси «Спитати Оракула» беруться з таблиці ходу', () => {
    const odds = oracleOdds(move('ask-the-oracle'));
    expect(odds.map(o => o.min)).toEqual([11, 26, 51, 76, 91]);
    expect(oracleAnswer(odds[2], 51)).toBe('Так');
    expect(oracleAnswer(odds[2], 50)).toBe('Ні');
  });
});
