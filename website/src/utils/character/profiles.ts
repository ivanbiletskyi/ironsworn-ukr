// Профіль у руці персонажа: створення, відмітки, підпис.
// Каталог (`utils/profiles`) незмінний, тут — лише те, що робить із ним
// гравець. Див. PROFILES_PLAN.md §4.2 і §6.
//
// Кружечки адресуються шляхом у дереві блоків ('0.2' — третій вкладений
// у першому), а не назвою навички: назви на картках повторюються, а порядок
// блоків у каталозі — незмінна частина даних.

import type { Profile, ProfileBlock } from '../profiles';
import { findProfile } from '../profiles';
import type { CharacterProfile } from './types';
import { newId } from './ids';

/** Профіль каталогу разом зі станом гравця — те, з чим працюють компоненти. */
export interface ResolvedProfile {
  entry: CharacterProfile;
  profile: Profile;
}

function walk(blocks: ProfileBlock[], prefix = ''): Array<{ path: string; block: ProfileBlock }> {
  return blocks.flatMap((block, index) => {
    const path = prefix === '' ? String(index) : `${prefix}.${index}`;
    return [{ path, block }, ...walk(block.children ?? [], path)];
  });
}

/** Шляхи всіх кружечків картки — тобто все, що гравець може відмітити. */
export function markPaths(profile: Profile): string[] {
  return walk(profile.blocks)
    .filter(({ block }) => block.mark)
    .map(({ path }) => path);
}

/**
 * Відмічене за замовчуванням — рівно надруковані ● (рішення №14).
 * У супутників закрашених немає, тож картка додається з порожніми
 * кружечками й перший клік гравця — це вибір стартової навички.
 */
export function defaultMarks(profile: Profile): string[] {
  return walk(profile.blocks)
    .filter(({ block }) => block.mark === 'filled')
    .map(({ path }) => path);
}

/** Ключі полів, оголошених у каталозі: усе інше в `fields` — сміття. */
export function fieldIds(profile: Profile): string[] {
  return walk(profile.blocks).flatMap(({ block }) => (block.field ? [block.field.id] : []));
}

/** Перемикає один кружечок, не чіпаючи решту. Порядок шляхів стабільний. */
export function toggleMark(marked: string[], path: string): string[] {
  return marked.includes(path) ? marked.filter(item => item !== path) : [...marked, path];
}

export function emptyCharacterProfile(profile: Profile): CharacterProfile {
  return {
    id: newId(),
    profileId: profile.id,
    marked: defaultMarks(profile),
    fields: {},
    trackIndex: null,
  };
}

/**
 * Картка, у якій гравець ще нічого не зробив: відмічено рівно надруковане,
 * поля порожні, клітинка шкали не вибрана. Таку прибираємо без питань —
 * це щойно доданий профіль (рішення №25).
 */
export function isPristineProfile(entry: CharacterProfile, profile: Profile): boolean {
  const printed = defaultMarks(profile);
  const sameMarks =
    entry.marked.length === printed.length && printed.every(path => entry.marked.includes(path));
  return (
    sameMarks &&
    entry.trackIndex === null &&
    Object.values(entry.fields).every(value => value.trim() === '')
  );
}

/** Підпис карти: вписане ім'я, а вже потім назва профілю («Баск», не «Пес»). */
export function profileLabel(entry: CharacterProfile, profile: Profile): string {
  return entry.fields.name?.trim() || profile.name;
}

/** Скільки кружечків відмічено з усіх — для корінця карти. */
export function markCount(entry: CharacterProfile, profile: Profile): {
  marked: number;
  total: number;
} {
  const paths = markPaths(profile);
  return {
    marked: paths.filter(path => entry.marked.includes(path)).length,
    total: paths.length,
  };
}

/**
 * Пришиває до кожного запису його картку з каталогу. Записи з невідомим
 * ключем відкидає: нормалізація сховища робить те саме, але компонент
 * отримує персонажа й із хмари, і з імпорту, тож перевірка тут не зайва.
 */
export function resolveProfiles(entries: CharacterProfile[]): ResolvedProfile[] {
  return entries.flatMap(entry => {
    const profile = findProfile(entry.profileId);
    return profile ? [{ entry, profile }] : [];
  });
}

/** Назва навички для `aria-label`: жирний початок рядка або його початок. */
export function abilityName(text: string): string {
  const bold = /^\*\*(.+?)\*\*/.exec(text);
  if (bold) return bold[1];
  const plain = text.replace(/\*/g, '');
  return plain.length > 48 ? `${plain.slice(0, 48).trimEnd()}…` : plain;
}

/** Текст картки одним рядком — для пошуку у вікні вибору. */
export function profileSearchText(profile: Profile): string {
  const texts = walk(profile.blocks).flatMap(({ block }) =>
    block.text ? [block.text.replace(/\*/g, '')] : [],
  );
  return [profile.name, ...texts].join(' ').toLowerCase();
}

/** Перші слова картки для плитки у вікні вибору. */
export function profileSummary(profile: Profile): string {
  const first = walk(profile.blocks).find(({ block }) => block.text);
  return first?.block.text?.replace(/\*/g, '') ?? '';
}
