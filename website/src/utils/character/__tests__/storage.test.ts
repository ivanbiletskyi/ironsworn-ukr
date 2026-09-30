// Persistence, normalisation and JSON export/import.

import { describe, expect, it } from 'vitest';
import {
  characterFileName,
  createCharacter,
  duplicateCharacter,
  emptyStore,
  getActiveCharacter,
  importCharacter,
  loadSheetLog,
  loadStore,
  normalizeCharacter,
  parseCharacterFile,
  removeCharacter,
  saveSheetLog,
  saveStore,
  serializeCharacter,
  upsertCharacter,
} from '../storage';
import { availableXp } from '../rules';
import { DEFAULT_BONDS, DEFAULT_VOWS, STORE_VERSION, XP_CELLS } from '../types';

describe('a new character', () => {
  it('follows character creation: stats +5, momentum +2', () => {
    const character = createCharacter('Ульріка');
    expect(character.name).toBe('Ульріка');
    expect(character.stats).toEqual({ health: 5, spirit: 5, supply: 5 });
    expect(character.momentum).toBe(2);
    expect(character.attributes).toEqual({ edge: 0, heart: 0, iron: 0, shadow: 0, wits: 0 });
  });

  it('has exactly 30 xp circles, a single vow, a single bond row and an empty bond track', () => {
    const character = createCharacter();
    expect(character.xp).toHaveLength(XP_CELLS);
    expect(character.vows).toHaveLength(DEFAULT_VOWS);
    expect(character.bonds).toHaveLength(DEFAULT_BONDS);
    expect(character.bondTicks).toBe(0);
    expect(character.xp.every(cell => cell === 0)).toBe(true);
  });

  it('starts with no debilities and no extra tracks', () => {
    const character = createCharacter();
    expect(Object.values(character.debilities).every(marked => !marked)).toBe(true);
    expect(character.extraTracks).toEqual([]);
  });

  it('gets a unique id', () => {
    expect(createCharacter().id).not.toBe(createCharacter().id);
  });
});

describe('normalising damaged data', () => {
  it('clamps out-of-range values', () => {
    const character = normalizeCharacter({
      name: 'Сміття',
      attributes: { edge: 99 },
      stats: { health: -5 },
      momentum: 999,
      vows: [{ rank: 'nonsense', ticks: 999 }],
      bondTicks: -3,
    });
    expect(character.attributes.edge).toBe(5);
    expect(character.stats.health).toBe(0);
    expect(character.vows[0].ticks).toBe(40);
    expect(character.bondTicks).toBe(0);
    expect(normalizeCharacter({ bondTicks: 999 }).bondTicks).toBe(40);
  });

  it('falls back to the default rank for an unknown one', () => {
    expect(normalizeCharacter({ vows: [{ rank: 'nonsense' }] }).vows[0].rank).toBe('dangerous');
  });

  it('pads xp circles and never leaves a character without a vow', () => {
    const character = normalizeCharacter({ xp: [7, 1], vows: [] });
    expect(character.xp).toHaveLength(XP_CELLS);
    expect(character.xp[0]).toBe(0); // 7 is not a valid cell state
    expect(character.xp[1]).toBe(1);
    expect(character.vows).toHaveLength(1);
  });

  it('keeps however many vows were stored', () => {
    const character = normalizeCharacter({
      vows: [{ name: 'Перша' }, { name: 'Друга' }, { name: 'Третя' }],
    });
    expect(character.vows.map(vow => vow.name)).toEqual(['Перша', 'Друга', 'Третя']);
  });

  it('keeps however many bond names were stored, and never leaves none', () => {
    const character = normalizeCharacter({
      bondTicks: 6,
      bonds: [{ name: 'Кайл' }, { name: 'Вейлґейв' }, { name: '' }],
    });
    expect(character.bonds.map(bond => bond.name)).toEqual(['Кайл', 'Вейлґейв', '']);
    expect(character.bondTicks).toBe(6);
    expect(normalizeCharacter({ bondTicks: 0, bonds: [] }).bonds).toHaveLength(1);
  });

  /**
   * У v3–v4 кожен стосунок мав власну шкалу, що суперечило правилам: шкала
   * стосунків одна на всіх. Позначки складаються в спільну шкалу, порожні
   * слоти «+» відпадають, імена лишаються.
   */
  it('folds the v3–v4 per-bond tracks into the single shared one', () => {
    const character = normalizeCharacter({
      bonds: [
        { id: 'b1', name: 'Кайл', ticks: 4 },
        { id: 'b2', name: 'Вейлґейв', ticks: 3 },
        { id: 'b3', name: '', ticks: 0 },
      ],
    });
    expect(character.bondTicks).toBe(7);
    expect(character.bonds.map(bond => bond.name)).toEqual(['Кайл', 'Вейлґейв']);
    expect(character.bonds.map(bond => bond.id)).toEqual(['b1', 'b2']);
    expect(character.bonds.every(bond => !('ticks' in bond))).toBe(true);
  });

  it('caps the folded v3–v4 progress at a full track and keeps one empty row', () => {
    const folded = normalizeCharacter({
      bonds: [{ name: 'Кайл', ticks: 30 }, { name: 'Вейлґейв', ticks: 30 }],
    });
    expect(folded.bondTicks).toBe(40);

    const blank = normalizeCharacter({ bonds: [{ name: '', ticks: 0 }] });
    expect(blank.bondTicks).toBe(0);
    expect(blank.bonds).toHaveLength(1);
  });

  /** До v3 стосунки були однією шкалою з нотатками: `bondsNotes` + `bondsTicks`. */
  it('reads the pre-v3 bond track and its notes', () => {
    const character = normalizeCharacter({ bondsNotes: 'Кайл, коваль', bondsTicks: 9 });
    expect(character.bondTicks).toBe(9);
    expect(character.bonds).toHaveLength(1);
    expect(character.bonds[0].name).toBe('Кайл, коваль');
    expect(character.bonds[0].id).toBeTruthy();
  });

  it('treats missing debilities as unmarked', () => {
    const character = normalizeCharacter({});
    expect(character.debilities.wounded).toBe(false);
    expect(character.debilities.tormented).toBe(false);
  });

  it('falls back to "other" for an unknown track kind', () => {
    expect(normalizeCharacter({ extraTracks: [{ kind: 'nonsense' }] }).extraTracks[0].kind).toBe(
      'other',
    );
  });

  it('rejects anything that is not an object', () => {
    expect(() => normalizeCharacter('string')).toThrow();
    expect(() => normalizeCharacter(null)).toThrow();
    expect(() => normalizeCharacter([])).toThrow();
  });
});

describe('normalising profiles (§4.3)', () => {
  /** Каталог — джерело істини, тож ключ вирішує, чи запис узагалі існує. */
  it('drops a profile whose key is not in the catalogue and keeps the rest', () => {
    const character = normalizeCharacter({
      profiles: [
        { profileId: 'companion-pes' },
        { profileId: 'нема-такого' },
        { profileId: 'path-maska' },
        'garbage',
      ],
    });
    expect(character.profiles.map(p => p.profileId)).toEqual([
      'companion-pes',
      'path-maska',
    ]);
  });

  it('gives a v3 save without profiles an empty hand', () => {
    expect(normalizeCharacter({ name: 'Ульріка' }).profiles).toEqual([]);
    expect(normalizeCharacter({ profiles: 'not an array' }).profiles).toEqual([]);
  });

  it('cleans marks of impossible paths and duplicates', () => {
    // «Пес» має рівно три кружечки: '2', '3', '4'.
    const profile = normalizeCharacter({
      profiles: [{ profileId: 'companion-pes', marked: ['2', '2', '0', '9', 7, '4'] }],
    }).profiles[0];
    expect(profile.marked).toEqual(['2', '4']);
  });

  it('keeps nested mark paths', () => {
    const profile = normalizeCharacter({
      profiles: [{ profileId: 'path-maska', marked: ['1', '1.2', '1.9'] }],
    }).profiles[0];
    expect(profile.marked).toEqual(['1', '1.2']);
  });

  it('clamps the scale to the cells the card has, and nulls it when it has none', () => {
    const clamped = normalizeCharacter({
      profiles: [{ profileId: 'companion-pes', trackIndex: 99 }],
    }).profiles[0];
    // Здоров'я пса — 0…+4, тобто п'ять клітинок.
    expect(clamped.trackIndex).toBe(4);

    const negative = normalizeCharacter({
      profiles: [{ profileId: 'companion-pes', trackIndex: -3 }],
    }).profiles[0];
    expect(negative.trackIndex).toBe(0);

    // «Маска» шкали не має.
    const noTrack = normalizeCharacter({
      profiles: [{ profileId: 'path-maska', trackIndex: 2 }],
    }).profiles[0];
    expect(noTrack.trackIndex).toBeNull();
  });

  it('keeps only the fields the catalogue declares', () => {
    const profile = normalizeCharacter({
      profiles: [
        { profileId: 'companion-pes', fields: { name: 'Баск', craft: 'ковальство', name2: 7 } },
      ],
    }).profiles[0];
    expect(profile.fields).toEqual({ name: 'Баск' });
  });

  it('issues an id when the save has none', () => {
    const profile = normalizeCharacter({ profiles: [{ profileId: 'companion-pes' }] }).profiles[0];
    expect(profile.id).toBeTruthy();
  });

  it('re-issues profile ids in a copy', () => {
    const original = createCharacter('Ульріка');
    original.profiles = [
      { id: 'p1', profileId: 'companion-pes', marked: ['2'], fields: { name: 'Баск' }, trackIndex: 2 },
    ];

    const copy = duplicateCharacter(original);
    expect(copy.profiles[0].id).not.toBe('p1');
    expect(copy.profiles[0].profileId).toBe('companion-pes');
    expect(copy.profiles[0].marked).toEqual(['2']);
    expect(copy.profiles[0].fields).toEqual({ name: 'Баск' });
    expect(copy.profiles[0].trackIndex).toBe(2);
  });

  it('survives an export round trip', () => {
    const original = createCharacter('Ульріка');
    original.profiles = [
      { id: 'p1', profileId: 'path-maska', marked: ['1', '1.2'], fields: {}, trackIndex: null },
    ];
    const restored = parseCharacterFile(serializeCharacter(original));
    expect(restored.profiles[0].marked).toEqual(['1', '1.2']);
  });
});

describe('export and import', () => {
  it('survives a full round trip', () => {
    const original = createCharacter('Ульріка');
    original.attributes.edge = 3;
    original.vows[0] = { id: 'v1', name: 'Знайти сестру', rank: 'formidable', ticks: 13 };
    original.xp[0] = 1;
    original.notes = 'Меч батька.';

    const restored = parseCharacterFile(serializeCharacter(original));
    expect(restored.attributes.edge).toBe(3);
    expect(restored.vows[0].name).toBe('Знайти сестру');
    expect(restored.vows[0].ticks).toBe(13);
    expect(restored.notes).toBe('Меч батька.');
    expect(availableXp(restored)).toBe(1);
  });

  it('accepts a bare character without the version wrapper', () => {
    expect(parseCharacterFile(JSON.stringify({ name: 'Голий' })).name).toBe('Голий');
  });

  it('explains malformed JSON in Ukrainian', () => {
    expect(() => parseCharacterFile('{not json')).toThrow('Файл не є коректним JSON.');
  });

  it('refuses a file written by a newer version', () => {
    expect(() => parseCharacterFile(JSON.stringify({ version: 99, character: {} }))).toThrow(
      /новішою версією/,
    );
  });

  it('builds the file name from the character name', () => {
    expect(characterFileName(createCharacter('Ульріка'))).toBe('zalizna-prysiaha-Ульріка.json');
    expect(characterFileName(createCharacter())).toBe('zalizna-prysiaha-personazh.json');
    expect(characterFileName(createCharacter('Бйорн Крижаний'))).toBe(
      'zalizna-prysiaha-Бйорн-Крижаний.json',
    );
  });
});

describe('store operations', () => {
  it('adds and then updates a character in place', () => {
    const character = createCharacter('First');
    let store = upsertCharacter(emptyStore(), character);
    expect(store.characters).toHaveLength(1);
    expect(store.activeId).toBe(character.id);

    store = upsertCharacter(store, { ...character, name: 'Renamed' });
    expect(store.characters).toHaveLength(1);
    expect(store.characters[0].name).toBe('Renamed');
  });

  it('picks a new active character after a removal', () => {
    const first = createCharacter('First');
    const second = createCharacter('Second');
    let store = upsertCharacter(upsertCharacter(emptyStore(), first), second);
    store = { ...store, activeId: second.id };

    store = removeCharacter(store, second.id);
    expect(store.characters).toHaveLength(1);
    expect(store.activeId).toBe(first.id);
    expect(getActiveCharacter(store)?.name).toBe('First');
  });

  it('imports as an addition with a fresh id, never overwriting the active one', () => {
    const existing = createCharacter('Existing');
    const store = upsertCharacter(emptyStore(), existing);
    const imported = createCharacter('Imported');

    const next = importCharacter(store, imported);
    expect(next.characters).toHaveLength(2);
    expect(next.characters.map(c => c.id)).not.toContain(imported.id);
    expect(next.activeId).toBe(next.characters[1].id);
  });

  it('duplicates state but re-issues every id', () => {
    const original = createCharacter('Ульріка');
    original.xp[0] = 1;
    original.extraTracks = [
      { id: 't1', name: 'Вовки', rank: 'dangerous', ticks: 8, kind: 'combat' },
    ];

    const copy = duplicateCharacter(original);
    expect(copy.name).toBe('Ульріка (копія)');
    expect(availableXp(copy)).toBe(1);
    expect(copy.id).not.toBe(original.id);
    expect(copy.vows[0].id).not.toBe(original.vows[0].id);
    expect(copy.bonds[0].id).not.toBe(original.bonds[0].id);
    expect(copy.extraTracks[0].id).not.toBe('t1');
    expect(copy.extraTracks[0].ticks).toBe(8);
  });
});

describe('localStorage', () => {
  it('returns an empty state rather than throwing when nothing is stored', () => {
    expect(loadStore().characters).toEqual([]);
    expect(loadSheetLog()).toEqual([]);
  });

  it('round-trips characters', () => {
    const character = createCharacter('Ульріка');
    saveStore(upsertCharacter(emptyStore(), character));

    const loaded = loadStore();
    expect(loaded.version).toBe(STORE_VERSION);
    expect(loaded.characters).toHaveLength(1);
    expect(loaded.characters[0].name).toBe('Ульріка');
    expect(loaded.activeId).toBe(character.id);
  });

  it('survives garbage in storage', () => {
    localStorage.setItem('ironsworn-characters-v1', 'not json');
    expect(loadStore().characters).toEqual([]);

    localStorage.setItem('ironsworn-characters-v1', JSON.stringify({ characters: 'not an array' }));
    expect(loadStore().characters).toEqual([]);

    localStorage.setItem('ironsworn-sheet-log-v1', '{"not":"an array"}');
    expect(loadSheetLog()).toEqual([]);
  });

  it('drops unusable characters and keeps the rest', () => {
    localStorage.setItem(
      'ironsworn-characters-v1',
      JSON.stringify({ version: 1, characters: [{ name: 'Good' }, 'garbage', null] }),
    );
    const loaded = loadStore();
    expect(loaded.characters).toHaveLength(1);
    expect(loaded.characters[0].name).toBe('Good');
    expect(loaded.activeId).toBe(loaded.characters[0].id);
  });

  it('drops the empty tail slots left by the four-vow v1 layout', () => {
    const v1Vows = [
      { id: 'v1', name: 'Знайти сестру', rank: 'formidable', ticks: 13 },
      { id: 'v2', name: '', rank: 'dangerous', ticks: 0 },
      { id: 'v3', name: '', rank: 'dangerous', ticks: 0 },
      { id: 'v4', name: '', rank: 'dangerous', ticks: 0 },
    ];
    localStorage.setItem(
      'ironsworn-characters-v1',
      JSON.stringify({ version: 1, characters: [{ name: 'Ульріка', vows: v1Vows }] }),
    );

    const vows = loadStore().characters[0].vows;
    expect(vows).toHaveLength(1);
    expect(vows[0].name).toBe('Знайти сестру');
  });

  it('keeps an empty v1 slot that sits between filled ones', () => {
    localStorage.setItem(
      'ironsworn-characters-v1',
      JSON.stringify({
        version: 1,
        characters: [
          {
            name: 'Ульріка',
            vows: [
              { name: '', rank: 'dangerous', ticks: 0 },
              { name: 'Друга', rank: 'dangerous', ticks: 0 },
              { name: '', rank: 'dangerous', ticks: 0 },
            ],
          },
        ],
      }),
    );

    expect(loadStore().characters[0].vows.map(vow => vow.name)).toEqual(['', 'Друга']);
  });

  it('leaves an empty vow added under v2 alone', () => {
    localStorage.setItem(
      'ironsworn-characters-v1',
      JSON.stringify({
        version: STORE_VERSION,
        characters: [
          {
            name: 'Ульріка',
            vows: [{ name: 'Перша', rank: 'dangerous', ticks: 0 }, { name: '' }],
          },
        ],
      }),
    );

    expect(loadStore().characters[0].vows).toHaveLength(2);
  });

  it('trims the roll log to 100 entries, keeping the newest', () => {
    const log = Array.from({ length: 150 }, (_, i) => ({
      kind: 'progress' as const,
      id: `r${i}`,
      label: 'Test',
      boxes: 1,
      challengeDice: [1, 2] as [number, number],
      outcome: 'miss' as const,
      matched: false,
      timestamp: i,
    }));
    saveSheetLog(log);
    expect(loadSheetLog()).toHaveLength(100);
    expect(loadSheetLog()[0].id).toBe('r0');
  });

  it('leaves the oracle history key untouched', () => {
    localStorage.setItem('ironsworn-oracle-history-uk', '[{"kept":true}]');
    saveStore(upsertCharacter(emptyStore(), createCharacter('Ульріка')));
    saveSheetLog([]);
    expect(localStorage.getItem('ironsworn-oracle-history-uk')).toBe('[{"kept":true}]');
  });
});
