import type { RangeOracle } from './oracle-types';

const oracle: RangeOracle = {
  kind: 'range',
  id: 'coastal',
  title: { en: 'Coastal Waters Location', uk: 'Прибережні місця' },
  description: {
    en: 'Use to determine a landmark or destination when traveling by ship or boat along the coast.',
    uk: 'Для визначення орієнтира або місця призначення під час подорожі вздовж узбережжя.',
  },
  rows: {
    en: [
      { min: 1,   max: 1,  result: 'Fleet' },
      { min: 2,   max: 2,  result: 'Sargassum' },
      { min: 3,   max: 3,  result: 'Flotsam' },
      { min: 4,   max: 4,  result: 'Mystical Site' },
      { min: 5,   max: 5,  result: 'Lair' },
      { min: 6,   max: 10, result: 'Wreck' },
      { min: 11,  max: 15, result: 'Harbor' },
      { min: 16,  max: 23, result: 'Ship' },
      { min: 24,  max: 30, result: 'Rocks' },
      { min: 31,  max: 38, result: 'Fjord' },
      { min: 39,  max: 46, result: 'Estuary' },
      { min: 47,  max: 54, result: 'Cove' },
      { min: 55,  max: 62, result: 'Bay' },
      { min: 63,  max: 70, result: 'Ice' },
      { min: 71,  max: 85, result: 'Island' },
      { min: 86,  max: 99, result: 'Open Water' },
      { min: 100, max: 100, result: 'Anomaly' },
    ],
    uk: [
      { min: 1,   max: 1,  result: 'Флот' },
      { min: 2,   max: 2,  result: 'Саргаси' },
      { min: 3,   max: 3,  result: 'Уламки' },
      { min: 4,   max: 4,  result: 'Містичне місце' },
      { min: 5,   max: 5,  result: 'Лігво' },
      { min: 6,   max: 10, result: 'Кораблетроща' },
      { min: 11,  max: 15, result: 'Гавань' },
      { min: 16,  max: 23, result: 'Корабель' },
      { min: 24,  max: 30, result: 'Скелі' },
      { min: 31,  max: 38, result: 'Фіорд' },
      { min: 39,  max: 46, result: 'Гирло (Естуарій)' },
      { min: 47,  max: 54, result: 'Бухта' },
      { min: 55,  max: 62, result: 'Затока' },
      { min: 63,  max: 70, result: 'Лід' },
      { min: 71,  max: 85, result: 'Острів' },
      { min: 86,  max: 99, result: 'Відкрита вода' },
      { min: 100, max: 100, result: 'Аномалія' },
    ],
  },
};

export default oracle;
