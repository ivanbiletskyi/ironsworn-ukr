// Три результати кидка в незмінному порядку — однакові в усіх ходах.

export type OutcomeKey = 'strong' | 'weak' | 'miss';

export const OUTCOME_KEYS: readonly OutcomeKey[] = ['strong', 'weak', 'miss'];

export const OUTCOME_TEXT: Record<OutcomeKey, { full: string; short: string }> = {
  strong: { full: 'Точно влучивши', short: 'Точно' },
  weak: { full: 'Ледь влучивши', short: 'Ледь' },
  miss: { full: 'Промахнувшись', short: 'Промах' },
};
