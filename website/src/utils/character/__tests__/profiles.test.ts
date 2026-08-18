// Профіль у руці персонажа: стартові відмітки, перемикання, підпис.

import { describe, expect, it } from 'vitest';
import {
  abilityName,
  defaultMarks,
  emptyCharacterProfile,
  fieldIds,
  isPristineProfile,
  markCount,
  markPaths,
  profileLabel,
  profileSearchText,
  resolveProfiles,
  toggleMark,
} from '../profiles';
import type { CharacterProfile } from '../types';
import { findProfile } from '../../profiles';

/** Три навички, усі порожні: стартову обирає гравець (рішення №14). */
const dog = findProfile('companion-pes')!;
/** Перша навичка надрукована закрашеною, а вибір матеріалу — вкладений. */
const mask = findProfile('path-maska')!;

describe('шляхи кружечків', () => {
  it('нумерує блоки за позицією, включно з вкладеними', () => {
    expect(markPaths(mask)).toEqual(['1', '1.0', '1.1', '1.2', '1.3', '2', '3']);
  });

  it('пропускає блоки без кружечка — вступний рядок і поле', () => {
    // blocks[0] — лінія «Ім'я:», blocks[1] — вступний рядок.
    expect(markPaths(dog)).toEqual(['2', '3', '4']);
  });

  it('збирає ключі полів картки', () => {
    expect(fieldIds(dog)).toEqual(['name']);
    expect(fieldIds(findProfile('companion-rodych')!)).toEqual(['name', 'experience']);
    expect(fieldIds(findProfile('path-viddanyi')!)).toEqual(['deity', 'attribute']);
  });
});

describe('стартові відмітки', () => {
  it('бере рівно надруковані ●', () => {
    expect(defaultMarks(mask)).toEqual(['1']);
  });

  it('у супутників лишає руку порожньою', () => {
    expect(defaultMarks(dog)).toEqual([]);
    expect(emptyCharacterProfile(dog).marked).toEqual([]);
  });

  it('дає новому профілю власний id і порожні поля', () => {
    const entry = emptyCharacterProfile(mask);
    expect(entry.profileId).toBe('path-maska');
    expect(entry.marked).toEqual(['1']);
    expect(entry.fields).toEqual({});
    expect(entry.trackIndex).toBeNull();
    expect(entry.id).not.toBe(emptyCharacterProfile(mask).id);
  });
});

describe('перемикання кружечка', () => {
  it('додає й знімає шлях, не чіпаючи інші', () => {
    expect(toggleMark(['1'], '2')).toEqual(['1', '2']);
    expect(toggleMark(['1', '2'], '1')).toEqual(['2']);
  });

  it('працює з вкладеними шляхами так само', () => {
    expect(toggleMark(['1'], '1.2')).toEqual(['1', '1.2']);
    expect(toggleMark(['1', '1.2'], '1.2')).toEqual(['1']);
  });

  it('рахує відмічені з усіх для корінця карти', () => {
    const entry: CharacterProfile = { ...emptyCharacterProfile(dog), marked: ['2', '4'] };
    expect(markCount(entry, dog)).toEqual({ marked: 2, total: 3 });
  });
});

describe('чистота картки', () => {
  it('щойно додана картка чиста', () => {
    expect(isPristineProfile(emptyCharacterProfile(dog), dog)).toBe(true);
    expect(isPristineProfile(emptyCharacterProfile(mask), mask)).toBe(true);
  });

  it('брудніє від будь-якої правки гравця', () => {
    const fresh = emptyCharacterProfile(dog);
    expect(isPristineProfile({ ...fresh, marked: ['2'] }, dog)).toBe(false);
    expect(isPristineProfile({ ...fresh, fields: { name: 'Баск' } }, dog)).toBe(false);
    expect(isPristineProfile({ ...fresh, trackIndex: 0 }, dog)).toBe(false);
  });

  it('не вважає правкою порожнє поле й не вважає чистою знята надруковану ●', () => {
    const fresh = emptyCharacterProfile(mask);
    expect(isPristineProfile({ ...fresh, fields: { name: '   ' } }, mask)).toBe(true);
    expect(isPristineProfile({ ...fresh, marked: [] }, mask)).toBe(false);
  });
});

describe('підпис карти', () => {
  it('показує вписане ім’я, а не назву профілю', () => {
    const entry = { ...emptyCharacterProfile(dog), fields: { name: 'Баск' } };
    expect(profileLabel(entry, dog)).toBe('Баск');
  });

  it('вертається до назви профілю, коли поле порожнє', () => {
    expect(profileLabel(emptyCharacterProfile(dog), dog)).toBe('Пес');
    expect(profileLabel({ ...emptyCharacterProfile(dog), fields: { name: '  ' } }, dog)).toBe('Пес');
  });
});

describe('назва навички для aria', () => {
  it('бере жирний початок рядка', () => {
    expect(abilityName('**Гострий нюх**: Коли ви *Збираєте інформацію*…')).toBe('Гострий нюх');
  });

  it('обрізає довгий рядок без жирної назви', () => {
    expect(abilityName('Коли ви носите маску та здійснюєте ходи, що задіюють її атрибут…'))
      .toBe('Коли ви носите маску та здійснюєте ходи, що заді…');
  });
});

describe('пошук по картці', () => {
  it('шукає й за назвою, і за текстом навички', () => {
    expect(profileSearchText(dog)).toContain('пес');
    expect(profileSearchText(dog)).toContain('гострий нюх');
    // Розмітка в індекс не потрапляє: інакше «*Збираєте» не знайшлося б.
    expect(profileSearchText(dog)).not.toContain('*');
  });
});

describe('зведення з каталогом', () => {
  it('пришиває картку до кожного запису', () => {
    const resolved = resolveProfiles([emptyCharacterProfile(dog), emptyCharacterProfile(mask)]);
    expect(resolved.map(({ profile }) => profile.name)).toEqual(['Пес', 'Маска']);
  });

  it('відкидає запис із невідомим ключем', () => {
    const orphan: CharacterProfile = {
      id: 'x',
      profileId: 'нема-такого',
      marked: [],
      fields: {},
      trackIndex: null,
    };
    expect(resolveProfiles([orphan, emptyCharacterProfile(dog)])).toHaveLength(1);
  });
});
