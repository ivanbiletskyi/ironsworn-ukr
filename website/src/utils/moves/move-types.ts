// Модель довідника ходів. Хід — структурований обʼєкт, а не суцільний текст:
// тоді картку можна показати в кількох ступенях деталізації, а пошук —
// зважувати назву, синоніми й тригер по-різному.
//
// Довідник існує лише українською, як і аркуш персонажа, тож рядки тут
// прості, без `Localized<T>`.

import type { AttrKey, DebilityKey, StatKey } from '../character/types';

export type MoveCategory = 'adventure' | 'relationship' | 'combat' | 'suffer' | 'quest' | 'fate';

/**
 * Хід дії — d6 + стат проти 2d10; хід прогресу — шкала проти 2d10 без
 * імпульсу; без кидка — правило чи вибір; оракул — d100 по таблиці.
 */
export type RollKind = 'action' | 'progress' | 'none' | 'oracle';

/** Що додається до граника дії: атрибут, показник або здоров’я супутника. */
export type MoveStat = AttrKey | StatKey | 'companionHealth';

/** Таблиця з двох колонок: діапазон d100 чи ранг — і результат. */
export interface MoveTable {
  head: [string, string];
  rows: [string, string][];
}

/** Які шкали прогресу персонажа підходять ходу. */
export type TrackKindForMove = 'vow' | 'combat' | 'journey' | 'bond';

/**
 * Машинно-читаний наслідок, що стоїть поруч із текстом. Шторка на аркуші
 * пропонує застосувати його в один тап; сам текст лишається дослівним і
 * нічого не розбирається з нього.
 */
export type Effect =
  | { kind: 'momentum'; delta: number }
  | { kind: 'stat'; stat: StatKey; delta: number }
  | { kind: 'progress'; tracks: TrackKindForMove }
  | { kind: 'debility'; key: DebilityKey; marked: boolean }
  /** Інший хід; `harm` — шкода чи стрес, підставлені в його крок втрати. */
  | { kind: 'move'; moveId: string; harm?: number };

/** Пункт списку «➢»: просто текст або текст із наслідками варіанта. */
export type MoveListItem = string | { text: string; effects: Effect[] };

/**
 * Один блок тексту: рядок — абзац, масив — список «➢», обʼєкт —
 * таблиця. Рядки містять розмітку `**жирний**` і `*курсив*`; курсивом
 * набрано назви інших ходів, і саме курсив стає посиланням.
 */
export type MoveBlock = string | MoveListItem[] | MoveTable;

/** Рядок таблиці «як дієте → стат» для ходів зі статом на вибір. */
export interface Approach {
  when: string;
  stat: AttrKey;
  /** Уточнення до рядка, як «+1, якщо маєте стосунки з персонажем». */
  note?: string;
}

/** Рядок панелі кидка: що додається до граника дії. */
export type RollOption =
  | { label: string; stat: MoveStat }
  /** «Лікувати» власні рани: нижче з двох атрибутів. */
  | { label: string; lowerOf: [AttrKey, AttrKey] };

/**
 * Як хід кидається з аркуша. Для ходів дії форма виводиться з `approaches`
 * і `stats` (див. `rollSpec` у play.ts); вручну задаються лише особливі.
 */
export type RollSpec =
  | { kind: 'action'; options: RollOption[] }
  /** Спершу втратити показник, потім кинути вище з нього й атрибута. */
  | { kind: 'sufferThenRoll'; lose: 'health' | 'spirit' | 'companionHealth'; versus: AttrKey }
  | { kind: 'progress'; tracks: TrackKindForMove }
  | { kind: 'payThePrice' }
  | { kind: 'askTheOracle' }
  | { kind: 'none' };

export interface MoveOutcomes {
  strong: MoveBlock[];
  weak: MoveBlock[];
  miss: MoveBlock[];
}

export interface Move {
  /** Стабільний ключ з англійської назви ходу; частина URL. */
  id: string;
  category: MoveCategory;
  /** Канонічна назва — з грального набору. */
  name: string;
  /**
   * Усе, за чим хід шукають і впізнають у тексті: стара назва з книги,
   * дієслівні форми, якими хід згадано курсивом («Сплатіть ціну»), і
   * розмовні ситуації («тікати»). Форми задаються явно, а не вгадуються.
   */
  aliases: string[];
  rollKind: RollKind;
  /** Що можна додати до кидка. Порожньо для ходів без граника дії. */
  stats: MoveStat[];
  /** Бейдж замість обчисленого, коли той вийшов би задовгим. */
  badge?: string;
  /** Позначка * у наборі: експедиційний хід, якого немає в книзі. */
  expedition?: boolean;
  /** Один із 8 «основних» ходів для фільтра новачка. */
  core?: boolean;
  /** Тригер одним рядком, без «Коли ви», для компактної картки. */
  trigger: string;
  /** Повний текст до результатів, як надруковано: тригер, ранги, умови. */
  lead: MoveBlock[];
  approaches?: Approach[];
  /** Короткі чіпи бонусів до кидка: «+1 за стосунки». */
  bonuses?: string[];
  outcomes?: MoveOutcomes;
  /** Наслідки, що стосуються всього результату, а не варіанта зі списку. */
  outcomeEffects?: Partial<Record<keyof MoveOutcomes, Effect[]>>;
  /** Наслідки ходу без кидка: «Зазнати злиднів» → «Розгубленість». */
  leadEffects?: Effect[];
  /** Форма кидка, коли її не виводиться з `approaches` і `stats`. */
  roll?: RollSpec;
  /** Спільні для кількох результатів варіанти й примітки — під смугами. */
  after?: MoveBlock[];
  /**
   * Файл і якір розділу книги, де хід описано повністю. Відсутній лише в
   * експедиційного ходу, якого книга не містить.
   */
  bookRef?: string;
  /** Сторінка набору, з якої оцифровано. */
  source: string;
}

export const MOVE_CATEGORIES: readonly MoveCategory[] = [
  'adventure',
  'relationship',
  'combat',
  'suffer',
  'quest',
  'fate',
];

export function isTable(block: MoveBlock): block is MoveTable {
  return typeof block === 'object' && !Array.isArray(block);
}

export function itemText(item: MoveListItem): string {
  return typeof item === 'string' ? item : item.text;
}

export function itemEffects(item: MoveListItem): Effect[] {
  return typeof item === 'string' ? [] : item.effects;
}
