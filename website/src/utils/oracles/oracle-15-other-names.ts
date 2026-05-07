import type { MultiColumnOracle } from './oracle-types';

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

const giants =      ['Chony','Banda','Jochu','Kira','Khatir','Chaidu','Atan','Buandu','Javyn','Khashin','Bayara','Temura','Kidha','Kathos','Tanua','Bashtu','Jaran','Othos','Khutan','Otaan','Martu','Baku','Tuban','Qudan','Denua'];
const varou =       ['Vata','Zora','Jasna','Charna','Tana','Soveen','Radka','Zlata','Leesla','Byna','Meeka','Iskra','Jarek','Darva','Neda','Keha','Zhivka','Kvata','Staysa','Evka','Vuksha','Muko','Dreko','Aleko','Vojan'];
const trolls =      ['Rattle','Scratch','Wallow','Groak','Gimble','Scar','Cratch','Creech','Shush','Glush','Slar','Gnash','Stoad','Grig','Bleat','Chortle','Cluck','Slith','Mongo','Creak','Burble','Vrusk','Snuffle','Leech','Herk'];

const giantsUk =    ['Чоні','Банда','Джочу','Кіра','Хатір','Чайду','Атан','Буанду','Джавин','Хашін','Баяра','Темура','Кідха','Катос','Тануа','Башту','Джаран','Отос','Хутан','Отаан','Марту','Баку','Тубан','Кудан','Денуа'];
const varouUk =     ['Вата','Зора','Ясна','Чарна','Тана','Совін','Радка','Злата','Лісла','Бина','Міка','Іскра','Ярек','Дарва','Неда','Кеха','Живка','Квата','Стайса','Евка','Вукша','Муко','Дреко','Алеко','Воян'];
const trollsUk =    ['Брязкіт','Царап','Калюжа','Ґроук','Ґімбл','Шрам','Кретч','Кріч','Шаш','Ґлуш','Слар','Скрегіт','Стоад','Ґріґ','Блекіт','Хортл','Клак','Сліт','Монґо','Скрип','Бурбл','Вруск','Снафл','П\'явка','Герк'];

const oracle: MultiColumnOracle = {
  kind: 'multiColumn',
  id: 'other-names',
  title: { en: 'Other Names', uk: 'Інші імена' },
  description: {
    en: 'Names for Giants, Varou, and Trolls. Each column is rolled independently.',
    uk: 'Імена для Велетнів, Вару та Тролів. Кожна колонка кидається окремо.',
  },
  columns: {
    en: [
      { label: 'Giants', rows: rows.map((r, i) => ({ ...r, value: giants[i] })) },
      { label: 'Varou',  rows: rows.map((r, i) => ({ ...r, value: varou[i] })) },
      { label: 'Trolls', rows: rows.map((r, i) => ({ ...r, value: trolls[i] })) },
    ],
    uk: [
      { label: 'Велетні', rows: rows.map((r, i) => ({ ...r, value: giantsUk[i] })) },
      { label: 'Вару',    rows: rows.map((r, i) => ({ ...r, value: varouUk[i] })) },
      { label: 'Тролі',   rows: rows.map((r, i) => ({ ...r, value: trollsUk[i] })) },
    ],
  },
};

export default oracle;
