import type { RangeOracle } from './oracle-types';

const oracle: RangeOracle = {
  kind: 'range',
  id: 'challenge-rank',
  title: { en: 'Challenge Rank', uk: 'Ранг виклику' },
  description: {
    en: 'Use to randomly determine the challenge rank of a quest, journey, or fight.',
    uk: 'Для випадкового визначення рангу виклику для пригоди, подорожі чи бою.',
  },
  rows: {
    en: [
      { min: 1,  max: 20, result: 'Troublesome' },
      { min: 21, max: 55, result: 'Dangerous' },
      { min: 56, max: 80, result: 'Formidable' },
      { min: 81, max: 93, result: 'Extreme' },
      { min: 94, max: 100, result: 'Epic' },
    ],
    uk: [
      { min: 1,  max: 20, result: 'Клопітний' },
      { min: 21, max: 55, result: 'Небезпечний' },
      { min: 56, max: 80, result: 'Грізний' },
      { min: 81, max: 93, result: 'Екстремальний' },
      { min: 94, max: 100, result: 'Епічний' },
    ],
  },
};

export default oracle;
