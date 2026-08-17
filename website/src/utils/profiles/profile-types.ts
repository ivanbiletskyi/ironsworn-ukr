// Каталог профілів (у правилах сайту — активів) із набору «Залізна Присяга».
// Картка — це дерево тексту з відмітками, а не механіка: жодних полів під
// атрибути, ранги чи ходи. Див. PROFILES_PLAN.md §3–4.

export type ProfileType = 'companion' | 'path' | 'talent' | 'ritual';

/** Порожня лінія на картці, у яку гравець вписує своє. */
export interface ProfileField {
  /** Ключ у `CharacterProfile.fields`. */
  id: string;
  /** Підпис, як надруковано: «Ім’я:», «Атрибут:», «Ремесло:». */
  label: string;
}

/**
 * Блок картки. Дерево, бо на картках є вкладені списки, і в частині з них
 * вкладені пункти мають власні кружечки («Маска»).
 *
 * Рівно одне з `text` і `field` заповнене. Поля — теж блоки, а не окремий
 * список картки: на «Родичі» лінія «Досвід:» надрукована між навичками, і
 * порядок блоків має відповідати паперу.
 */
export interface ProfileBlock {
  /** Кружечок ліворуч: як надруковано на папері. Без нього — просто абзац. */
  mark?: 'filled' | 'empty';
  /** Маркер «•» без кружечка: вкладений вибір, що не відкривається досвідом. */
  bullet?: boolean;
  /** Текст із розміткою **жирний** та *курсив*. Дослівно, як на картці. */
  text?: string;
  /** Замість тексту — порожня лінія для вписування. */
  field?: ProfileField;
  children?: ProfileBlock[];
}

/**
 * Смуга клітинок унизу картки: здоров’я супутника, сила ватаги, есенція,
 * світло, обладунок. Підписи — рядками, бо буває й «ВАЖКИЙ ОБЛАДУНОК».
 */
export interface ProfileTrack {
  cells: string[];
}

export interface Profile {
  /** Стабільний ключ `тип-транслітерація`. Ніколи не змінюється. */
  id: string;
  type: ProfileType;
  name: string;
  blocks: ProfileBlock[];
  track?: ProfileTrack;
  /** Сторінка набору, з якої оцифровано — щоб транскрипцію можна було звірити. */
  source: string;
}

export const PROFILE_TYPES: readonly ProfileType[] = ['companion', 'path', 'talent', 'ritual'];

/** Шкала здоров’я супутника різної довжини — щоб не повторювати масиви. */
export function healthTrack(max: number): ProfileTrack {
  return { cells: Array.from({ length: max + 1 }, (_, i) => (i === 0 ? '0' : `+${i}`)) };
}

/** Лінія «Ім’я:» — є майже на кожній картці супутника. */
export const NAME_FIELD: ProfileField = { id: 'name', label: 'Ім’я:' };
