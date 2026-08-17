// Інваріанти каталогу профілів. Текст карток перевірити автоматично не можна —
// його звіряють із `source`-сторінкою набору, — але структуру й слідів
// оцифрування можна: саме тут ловляться злиплі пробіли й непарний курсив.

import { describe, expect, it } from 'vitest';
import { PROFILES, PROFILES_BY_TYPE, findProfile } from '../index';
import type { Profile, ProfileBlock } from '../profile-types';
import { PROFILE_TYPES } from '../profile-types';

function walk(blocks: ProfileBlock[]): ProfileBlock[] {
  return blocks.flatMap(block => [block, ...walk(block.children ?? [])]);
}

const texts = (profile: Profile) =>
  walk(profile.blocks).flatMap(block => (block.text ? [block.text] : []));

describe('каталог профілів', () => {
  it('містить усі 78 карток набору', () => {
    expect(PROFILES).toHaveLength(78);
    expect(PROFILES_BY_TYPE.companion).toHaveLength(10);
    expect(PROFILES_BY_TYPE.path).toHaveLength(37);
    expect(PROFILES_BY_TYPE.talent).toHaveLength(14);
    expect(PROFILES_BY_TYPE.ritual).toHaveLength(17);
  });

  it('має унікальні ключі вигляду тип-слаг', () => {
    const ids = PROFILES.map(profile => profile.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const profile of PROFILES) {
      expect(profile.id).toMatch(/^(companion|path|talent|ritual)-[a-z0-9-]+$/);
      expect(profile.id.startsWith(`${profile.type}-`)).toBe(true);
    }
  });

  it('кожна картка має назву, тип і щонайменше одну навичку', () => {
    for (const profile of PROFILES) {
      expect(profile.name.trim()).not.toBe('');
      expect(PROFILE_TYPES).toContain(profile.type);
      expect(profile.source).toMatch(/^page-\d{4}$/);
      expect(walk(profile.blocks).some(block => block.mark)).toBe(true);
    }
  });

  it('блок — це або текст, або поле, але не обидва й не порожнеча', () => {
    for (const profile of PROFILES) {
      for (const block of walk(profile.blocks)) {
        const hasText = typeof block.text === 'string' && block.text.trim() !== '';
        const hasField = block.field !== undefined;
        expect(hasText !== hasField).toBe(true);
        if (hasField) expect(block.field?.label.trim()).not.toBe('');
      }
    }
  });

  it('не містить слідів оцифрування', () => {
    for (const profile of PROFILES) {
      for (const text of texts(profile)) {
        expect(text, profile.id).not.toMatch(/\s{2}/); // злиплі рядки сканів
        expect(text, profile.id).not.toMatch(/[|○●]/); // рамки й кружечки картки
        expect(text, profile.id).not.toMatch(/'/); // прямий апостроф замість ’
        // Розмітка збалансована: **жирний** і *курсив* завжди закриваються.
        expect((text.match(/\*\*/g) ?? []).length % 2, profile.id).toBe(0);
        expect((text.replace(/\*\*/g, '').match(/\*/g) ?? []).length % 2, profile.id).toBe(0);
      }
    }
  });

  it('шкала картки має щонайменше дві клітинки', () => {
    for (const profile of PROFILES) {
      if (!profile.track) continue;
      expect(profile.track.cells.length, profile.id).toBeGreaterThan(1);
      for (const cell of profile.track.cells) expect(cell.trim()).not.toBe('');
    }
  });

  it('поля картки мають унікальні ключі в межах картки', () => {
    for (const profile of PROFILES) {
      const ids = walk(profile.blocks).flatMap(block => (block.field ? [block.field.id] : []));
      expect(new Set(ids).size, profile.id).toBe(ids.length);
    }
  });

  it('findProfile знаходить за ключем і не вигадує невідомі', () => {
    expect(findProfile('companion-pes')?.name).toBe('Пес');
    expect(findProfile('path-alkhimik')?.type).toBe('path');
    expect(findProfile('нема-такого')).toBeUndefined();
  });
});
