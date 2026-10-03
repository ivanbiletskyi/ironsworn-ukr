// Модель даних аркуша персонажа.
// Правила, на які спираються константи, задокументовано у CHARACTER_SHEET_PLAN.md §3.

export type AttrKey = 'edge' | 'heart' | 'iron' | 'shadow' | 'wits';
export type StatKey = 'health' | 'spirit' | 'supply';
export type Rank = 'troublesome' | 'dangerous' | 'formidable' | 'extreme' | 'epic';

/** Групи слабкостей на аркуші: стани / згуба / тягарі */
export type DebilityGroup = 'condition' | 'bane' | 'burden';

export type DebilityKey =
  // стани
  | 'wounded'      // Поранений
  | 'unprepared'   // Розгубленість
  | 'shaken'       // Спантеличення
  | 'encumbered'   // Перевантаження
  // згуба
  | 'maimed'       // Скалічення
  | 'corrupted'    // Спотворення
  // тягарі
  | 'cursed'       // Прокляття
  | 'tormented';   // Зморення

/** 0 = порожній, 1 = зароблений, 2 = витрачений */
export type XpCell = 0 | 1 | 2;

export type TrackKind = 'combat' | 'journey' | 'other';

/** Шкала без рангу: назва й прогрес. Присяги й треки додають до неї ранг. */
export interface Track {
  id: string;
  name: string;
  /** 0–40 позначок; повна клітина = 4 позначки */
  ticks: number;
}

/**
 * Один запис у переліку стосунків — людина чи спільнота, з якою скріплено
 * стосунки. Власної шкали не має: за правилами всі стосунки персонажа
 * відмічаються на одній спільній шкалі (`Character.bondTicks`), а перелік —
 * лише нотатка, «з ким».
 */
export interface Bond {
  id: string;
  name: string;
}

export interface ProgressTrack extends Track {
  rank: Rank;
}

export interface ExtraTrack extends ProgressTrack {
  kind: TrackKind;
}

/**
 * Профіль (у правилах сайту — актив) у руці персонажа: посилання на каталог
 * плюс те, що вписав і відмітив гравець. Сам текст картки живе в каталозі
 * `utils/profiles` і в збереження не потрапляє (PROFILES_PLAN.md §4.2).
 */
export interface CharacterProfile {
  /** Власний id рядка, як у присяг і треків. */
  id: string;
  /** Ключ каталогу. Невідомий ключ під час нормалізації відкидається. */
  profileId: string;
  /**
   * Шляхи відмічених кружечків у дереві блоків: '1' — другий блок верхнього
   * рівня, '0.2' — третій вкладений у першому. Позиція, а не назва: назви
   * навичок неунікальні, а порядок блоків у каталозі — незмінна частина даних.
   */
  marked: string[];
  /** Вписані значення полів картки, за `ProfileField.id`. */
  fields: Record<string, string>;
  /** Вибрана клітинка шкали картки; null — жодної. */
  trackIndex: number | null;
}

export interface Character {
  id: string;
  name: string;
  attributes: Record<AttrKey, number>;
  stats: Record<StatKey, number>;
  momentum: number;
  /** рівно XP_CELLS елементів */
  xp: XpCell[];
  /** щонайменше одна присяга; решту гравець додає кнопкою «+» */
  vows: ProgressTrack[];
  /**
   * Спільна шкала стосунків: 0–40 позначок. Одна на всіх — успішне
   * «Скріпити стосунки» додає до неї 1 позначку, а «Написати епілог»
   * робить кидок прогресу за її заповненими клітинами.
   */
  bondTicks: number;
  /** з ким скріплено стосунки; щонайменше один рядок, решту додає гравець */
  bonds: Bond[];
  debilities: Record<DebilityKey, boolean>;
  /** блок «ЗАПИСИ» */
  notes: string;
  /** треки боїв і подорожей — поза макетом паперового аркуша */
  extraTracks: ExtraTrack[];
  /** рука профілів у порядку додавання */
  profiles: CharacterProfile[];
  updatedAt: number;
}

export interface CharacterStore {
  version: 5;
  activeId: string | null;
  characters: Character[];
}

/**
 * 2 — присяг більше не рівно чотири.
 * 3 — стосунки стали списком шкал замість однієї шкали з нотатками.
 * 4 — у персонажа з'явилися профілі.
 * 5 — стосунки повернулися до однієї спільної шкали (`bondTicks`) з переліком
 *     імен: окрема шкала на кожен стосунок суперечила правилам.
 * Міграції див. у storage.ts.
 */
export const STORE_VERSION = 5;

// ── Межі та константи правил ──────────────────────────────────────────

/** «Ваше значення дії ніколи не може бути більшим за 10» */
export const MAX_ACTION_SCORE = 10;

export const BASE_MAX_MOMENTUM = 10;
export const MIN_MOMENTUM = -6;
export const BASE_RESET_MOMENTUM = 2;

export const MIN_STAT = 0;
export const MAX_STAT = 5;

export const MIN_ATTR = 0;
export const MAX_ATTR = 5;

export const TICKS_PER_BOX = 4;
export const TRACK_BOXES = 10;
export const MAX_TICKS = TICKS_PER_BOX * TRACK_BOXES;

export const XP_CELLS = 30;

/**
 * Паперовий аркуш має чотири слоти присяг, але на екрані порожні слоти лише
 * займають місце. Тож новий персонаж отримує одну присягу, а решту гравець
 * додає кнопкою — так само, як треки боїв і подорожей (рішення №16).
 */
export const DEFAULT_VOWS = 1;

/** Рядків у переліку стосунків — за тим самим правилом (рішення №17). */
export const DEFAULT_BONDS = 1;

// ── Порядок відображення ──────────────────────────────────────────────

export const ATTR_KEYS: readonly AttrKey[] = ['edge', 'heart', 'iron', 'shadow', 'wits'];
export const STAT_KEYS: readonly StatKey[] = ['health', 'spirit', 'supply'];
export const RANKS: readonly Rank[] = ['troublesome', 'dangerous', 'formidable', 'extreme', 'epic'];

export const DEBILITY_KEYS: readonly DebilityKey[] = [
  'wounded', 'unprepared', 'shaken', 'encumbered',
  'maimed', 'corrupted',
  'cursed', 'tormented',
];

export const DEBILITIES_BY_GROUP: Record<DebilityGroup, readonly DebilityKey[]> = {
  condition: ['wounded', 'unprepared', 'shaken', 'encumbered'],
  bane: ['maimed', 'corrupted'],
  burden: ['cursed', 'tormented'],
};

/**
 * Позначки, які додає одне «відмітьте прогрес» за рангом виклику.
 * Клопітний — 3 клітини, небезпечний — 2, грізний — 1,
 * екстремальний — 2 позначки, епічний — 1 позначка.
 */
export const RANK_TICKS: Record<Rank, number> = {
  troublesome: 3 * TICKS_PER_BOX,
  dangerous: 2 * TICKS_PER_BOX,
  formidable: 1 * TICKS_PER_BOX,
  extreme: 2,
  epic: 1,
};

/**
 * Слабкості, що блокують підвищення відповідного показника.
 * «Якщо ви поранений, ви не можете збільшити здоров'я» тощо.
 */
export const DEBILITY_BLOCKS_STAT: Partial<Record<DebilityKey, StatKey>> = {
  wounded: 'health',
  shaken: 'spirit',
  unprepared: 'supply',
};
