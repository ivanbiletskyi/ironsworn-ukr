import type { CompoundOracle } from './oracle-types';

const rows = [
  { min: 1,   max: 4  },
  { min: 5,   max: 8  },
  { min: 9,   max: 12 },
  { min: 13,  max: 16 },
  { min: 17,  max: 20 },
  { min: 21,  max: 24 },
  { min: 25,  max: 28 },
  { min: 29,  max: 32 },
  { min: 33,  max: 36 },
  { min: 37,  max: 40 },
  { min: 41,  max: 44 },
  { min: 45,  max: 48 },
  { min: 49,  max: 52 },
  { min: 53,  max: 56 },
  { min: 57,  max: 60 },
  { min: 61,  max: 64 },
  { min: 65,  max: 68 },
  { min: 69,  max: 72 },
  { min: 73,  max: 76 },
  { min: 77,  max: 80 },
  { min: 81,  max: 84 },
  { min: 85,  max: 88 },
  { min: 89,  max: 92 },
  { min: 93,  max: 96 },
  { min: 97,  max: 100 },
];

const prefixes = ['Bleak','Green','Wolf','Raven','Gray','Red','Axe','Great','Wood','Low','White','Storm','Black','Mourn','New','Stone','Grim','Lost','High','Rock','Shield','Sword','Frost','Thorn','Long'];
const suffixes = ['moor','ford','crag','watch','hope','wood','ridge','stone','haven','fall(s)','river','field','hill','bridge','mark','cairn','land','hall','mount','rock','brook','barrow','stead','home','wick'];

const oracle: CompoundOracle = {
  kind: 'compound',
  id: 'quick-settlement-name',
  title: { en: 'Quick Settlement Name', uk: 'Швидка назва поселення' },
  description: {
    en: 'Roll prefix and suffix separately, then combine.',
    uk: 'Кидайте для префікса та суфікса окремо, потім об\'єднайте.',
  },
  template: '{0}{1}',
  parts: {
    en: [
      { label: 'Prefix', rows: rows.map((r, i) => ({ ...r, value: prefixes[i] })) },
      { label: 'Suffix', rows: rows.map((r, i) => ({ ...r, value: '-' + suffixes[i] })) },
    ],
    uk: [
      { label: 'Префікс', rows: rows.map((r, i) => ({ ...r, value: prefixes[i] })) },
      { label: 'Суфікс',  rows: rows.map((r, i) => ({ ...r, value: '-' + suffixes[i] })) },
    ],
  },
};

export default oracle;
