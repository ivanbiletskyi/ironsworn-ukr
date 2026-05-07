import type { RangeOracle } from './oracle-types';

const oracle: RangeOracle = {
  kind: 'range',
  id: 'region',
  title: { en: 'Region', uk: 'Регіон' },
  description: {
    en: 'Use to randomly select a region within the Ironlands.',
    uk: 'Для випадкового вибору регіону в Залізних Землях.',
  },
  rows: {
    en: [
      { min: 1,  max: 12, result: 'Barrier Islands' },
      { min: 13, max: 24, result: 'Ragged Coast' },
      { min: 25, max: 34, result: 'Deep Wilds' },
      { min: 35, max: 46, result: 'Flooded Lands' },
      { min: 47, max: 60, result: 'Havens' },
      { min: 61, max: 72, result: 'Hinterlands' },
      { min: 73, max: 84, result: 'Tempest Hills' },
      { min: 85, max: 94, result: 'Veiled Mountains' },
      { min: 95, max: 99, result: 'Shattered Wastes' },
      { min: 100, max: 100, result: 'Elsewhere' },
    ],
    uk: [
      { min: 1,  max: 12, result: 'Бар\'єрні острови' },
      { min: 13, max: 24, result: 'Посічене узбережжя' },
      { min: 25, max: 34, result: 'Глибокі дикі землі' },
      { min: 35, max: 46, result: 'Затоплені землі' },
      { min: 47, max: 60, result: 'Пристані' },
      { min: 61, max: 72, result: 'Глибинні землі' },
      { min: 73, max: 84, result: 'Штормові пагорби' },
      { min: 85, max: 94, result: 'Затуманені гори' },
      { min: 95, max: 99, result: 'Розтрощені пустоші' },
      { min: 100, max: 100, result: 'Деінде' },
    ],
  },
};

export default oracle;
