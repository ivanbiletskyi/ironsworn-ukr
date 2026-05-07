import type { TwoStepOracle } from './oracle-types';

const oracle: TwoStepOracle = {
  kind: 'twoStep',
  id: 'settlement-name',
  title: { en: 'Settlement Name', uk: 'Назва поселення' },
  description: {
    en: 'Roll for category, then roll again for an example from that category.',
    uk: 'Кидайте для категорії, потім ще раз для прикладу з цієї категорії.',
  },
  categories: {
    en: [
      { min: 1,   max: 15, subId: 'landscape', label: 'A feature of the landscape' },
      { min: 16,  max: 30, subId: 'edifice',   label: 'A manmade edifice' },
      { min: 31,  max: 45, subId: 'creature',  label: 'A creature' },
      { min: 46,  max: 60, subId: 'event',     label: 'A historical event' },
      { min: 61,  max: 75, subId: 'oldworld',  label: 'A word in an Old World language' },
      { min: 76,  max: 90, subId: 'season',    label: 'A season or environmental aspect' },
      { min: 91,  max: 100, subId: 'other',    label: 'Something Else' },
    ],
    uk: [
      { min: 1,   max: 15, subId: 'landscape', label: 'Особливість ландшафту' },
      { min: 16,  max: 30, subId: 'edifice',   label: 'Рукотворна споруда' },
      { min: 31,  max: 45, subId: 'creature',  label: 'Істота' },
      { min: 46,  max: 60, subId: 'event',     label: 'Історична подія' },
      { min: 61,  max: 75, subId: 'oldworld',  label: 'Слово зі Старого Світу' },
      { min: 76,  max: 90, subId: 'season',    label: 'Пора року або природний аспект' },
      { min: 91,  max: 100, subId: 'other',    label: 'Щось інше' },
    ],
  },
  subTables: {
    en: {
      landscape: ['Highmount','Brackwater','Frostwood','Redcrest','Grimtree','Stoneford','Deepwater','Whitefall','Graycliff','Three Rivers'],
      edifice:   ['Whitebridge','Lonefort','Highcairn','Redhall','Darkwell','Timberwall','Stonetower','Thornhall','Cinderhome','Fallowfield'],
      creature:  ['Ravencliff','Bearmark','Wolfcrag','Eaglespire','Wyvern\'s Rest','Boarwood','Foxhollow','Elderwatch','Elkfield','Dragonshadow'],
      event:     ['Swordbreak','Fool\'s Fall','Firstmeet','Brokenhelm','Mournhaunt','Olgar\'s Stand','Lostwater','Rojirra\'s Lament','Lastmarch','Rockfall'],
      oldworld:  ['Abon','Daveza','Damula','Essus','Sina','Kazeera','Khazu','Sova','Nabuma','Tiza'],
      season:    ['Winterhome','Windhaven','Stormrest','Bleakfrost','Springtide','Duskmoor','Frostcrag','Springbrook','Icebreak','Summersong'],
      other:     ['A trade good (Ironhome)','An Old World city (New Arkesh)','A founder (Kei\'s Hall)','A god (Elisora)','A historical item (Blackhelm)','A firstborn race (Elfbrook)','An elvish word (Nessana)','A mythic event (Ghostwalk)','A positive term (Hope)','A negative term (Forsaken)'],
    },
    uk: {
      landscape: ['Висока Гора','Каламутна Вода','Морозний Ліс','Червоний Гребінь','Похмуре Дерево','Кам\'яний Брід','Глибока Вода','Білий Водоспад','Сіра Скеля','Три Річки'],
      edifice:   ['Білий Міст','Самотній Форт','Високий Курган','Червона Зала','Темний Колодязь','Дерев\'яна Стіна','Кам\'яна Вежа','Тернова Зала','Дім Попелу','Парове Поле'],
      creature:  ['Скеля Ворона','Ведмежа Мітка','Вовчий Стрімчак','Шпиль Орла','Спочинок Віверна','Кабанячий Ліс','Лисяча Нора','Дозор Прадавнього','Лосине Поле','Тінь Дракона'],
      event:     ['Зламаний Меч','Падіння Дурня','Перша Зустріч','Пробитий Шолом','Прихисток Скорботи','Рубіж Олгара','Втрачена Вода','Плач Роджирри','Останній Марш','Каменепад'],
      oldworld:  ['Абон','Давеза','Дамула','Ессус','Сіна','Казіра','Хазу','Сова','Набума','Тіза'],
      season:    ['Зимовий Дім','Гавань Вітрів','Спокій Шторму','Похмурий Мороз','Весняний Приплив','Сутінкове Пустище','Морозна Скеля','Весняний Струмок','Злам Льоду','Літня Пісня'],
      other:     ['Торговий товар (Ironhome)','Місто Старого Світу (New Arkesh)','Засновник (Kei\'s Hall)','Божество (Elisora)','Предмет (Blackhelm)','Раса Первородних (Elfbrook)','Ельфійське слово (Nessana)','Mythic event (Ghostwalk)','Позитивний термін (Надія)','Негативний термін (Проклятий)'],
    },
  },
};

export default oracle;
