// Усі українські підписи аркуша в одному місці.
// Термінологія — за текстами сайту (public/uk), а не за набором
// «Залізна Присяга»: граники, точне влучання, ледь влучаєте, промах, дубль.
// Див. CHARACTER_SHEET_PLAN.md §2.

import type { AttrKey, DebilityGroup, DebilityKey, Rank, StatKey, TrackKind } from './types';
import type { Outcome } from './diceEngine';

export const ATTR_LABELS: Record<AttrKey, string> = {
  edge: 'Вістря',
  heart: 'Серце',
  iron: 'Залізо',
  shadow: 'Тінь',
  wits: 'Розум',
};

export const STAT_LABELS: Record<StatKey, string> = {
  health: 'Здоров’я',
  spirit: 'Дух',
  supply: 'Припаси',
};

/**
 * Ранг — іменник чоловічого роду, тож форми узгоджено з ним,
 * як у тексті правил: «Клопітний використовується для простих викликів».
 */
export const RANK_LABELS: Record<Rank, string> = {
  troublesome: 'Клопітний',
  dangerous: 'Небезпечний',
  formidable: 'Грізний',
  extreme: 'Екстремальний',
  epic: 'Епічний',
};

export const DEBILITY_LABELS: Record<DebilityKey, string> = {
  wounded: 'Поранений',
  unprepared: 'Розгубленість',
  shaken: 'Спантеличення',
  encumbered: 'Перевантаження',
  maimed: 'Скалічення',
  corrupted: 'Спотворення',
  cursed: 'Прокляття',
  tormented: 'Зморення',
};

export const DEBILITY_GROUP_LABELS: Record<DebilityGroup, string> = {
  condition: 'Стани',
  bane: 'Згуба',
  burden: 'Тягарі',
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  strong: 'Точне влучання',
  weak: 'Ледь влучаєте',
  miss: 'Промах',
};

export const TRACK_KIND_LABELS: Record<TrackKind, string> = {
  combat: 'Бій',
  journey: 'Подорож',
  other: 'Інше',
};

/** Заголовки зон аркуша — як на паперовому аркуші, великими літерами. */
export const SHEET = {
  character: 'Персонаж',
  experience: 'Досвід',
  momentum: 'Імпульс',
  momentumMax: 'Макс.',
  momentumReset: 'Початк.',
  vows: 'Присяги',
  notes: 'Записи',
  bonds: 'Стосунки',
  debilities: 'Слабкості',
  stats: 'Показники',
  tracks: 'Треки',
  log: 'Журнал кидків',
} as const;

export const UI = {
  namePlaceholder: 'Ім’я персонажа',
  newCharacter: 'Новий персонаж',
  duplicate: 'Дублювати',
  remove: 'Видалити',
  export: 'Експорт',
  import: 'Імпорт',
  roll: 'Кинути',
  adds: 'Додатки',
  mark: 'Позначити',
  progressRoll: 'Кидок прогресу',
  burnMomentum: 'Спалити імпульс',
  matched: 'Дубль граників',
  actionDieCanceled: 'Негативний імпульс скасував граник дії',
  capped: 'Значення дії обмежено до 10',
  ok: 'ОК',
  dismissRoll: 'Прибрати картку',
  emptyLog: 'Кидків ще не було',
  clearLog: 'Очистити журнал',
  rollWith: 'Кидок:',
  closeRollPanel: 'Закрити',
  editAttributes: 'Редагувати',
  doneEditingAttributes: 'Готово',
  noCharacter: 'Персонажа ще не створено',
  addVow: 'Додати присягу',
  removeVow: 'Видалити присягу',
  addCombatTrack: '+ Бій',
  addJourneyTrack: '+ Подорож',
  addOtherTrack: '+ Інше',
  noTracks: 'Треків боїв і подорожей ще немає',
  xpAvailable: 'Доступно',
  xpEarned: 'Зароблено',
  xpSpent: 'Витрачено',
  chooseCharacter: 'Обрати персонажа',
  unnamedCharacter: 'Без імені',
  confirmRemove: 'Точно видалити',
  cancel: 'Скасувати',
  importFailed: 'Не вдалося прочитати файл',
  vowNamePlaceholder: 'Про що присяга?',
  trackNamePlaceholder: 'Назва треку',
  bondsNotesPlaceholder: 'З ким у вас зв’язки?',
  notesPlaceholder: 'Спорядження, союзники, зачіпки…',
} as const;

/** Значення шкали зі знаком: «+3», «0», «−2» (справжній мінус, не дефіс). */
export function formatScaleValue(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

/** Підказка під полями «Макс.» і «Початк.», коли є слабкості. */
export function debilityHint(count: number): string | null {
  if (count === 0) return null;
  const word = count === 1 ? 'слабкість' : count < 5 ? 'слабкості' : 'слабкостей';
  return `−${count} через ${count} ${word}`;
}

/** Питання перед видаленням присяги, у якій уже є назва або прогрес. */
export function confirmVowRemoval(label: string): string {
  return `Видалити «${label}» разом із прогресом?`;
}

/** Підказка, чому показник не можна підвищити. */
export function blockedStatHint(debility: DebilityKey, stat: StatKey): string {
  return `${DEBILITY_LABELS[debility]}: не можна збільшувати «${STAT_LABELS[stat]}»`;
}
