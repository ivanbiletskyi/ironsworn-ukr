import type { SimpleOracle } from './oracle-types';

const oracle: SimpleOracle = {
  kind: 'simple',
  id: 'theme',
  title: { en: 'Theme', uk: 'Тема' },
  description: {
    en: 'Use to answer questions or generate new situations. Combined with Action, suitable for most questions.',
    uk: 'Для відповідей на запитання або нових ситуацій. Разом із Дією підходить для більшості запитань.',
  },
  entries: {
    en: [
      'Risk','Ability','Price','Ally','Battle','Safety','Survival','Weapon','Wound','Shelter',
      'Leader','Fear','Time','Duty','Secret','Innocence','Renown','Direction','Death','Honor',
      'Labor','Solution','Tool','Balance','Love','Barrier','Creation','Decay','Trade','Bond',
      'Hope','Superstition','Peace','Deception','History','World','Vow','Protection','Nature','Opinion',
      'Burden','Vengeance','Opportunity','Faction','Danger','Corruption','Freedom','Debt','Hate','Possession',
      'Stranger','Passage','Land','Creature','Disease','Advantage','Blood','Language','Rumor','Weakness',
      'Greed','Family','Resource','Structure','Dream','Community','War','Portent','Prize','Destiny',
      'Momentum','Power','Memory','Ruin','Mysticism','Rival','Problem','Idea','Revenge','Health',
      'Fellowship','Enemy','Religion','Spirit','Fame','Desolation','Strength','Knowledge','Truth','Quest',
      'Pride','Loss','Law','Path','Warning','Relationship','Wealth','Home','Strategy','Supply',
    ],
    uk: [
      'Ризик','Здібність','Ціна','Союзник','Битва','Безпека','Виживання','Зброя','Рана','Сховище',
      'Лідер','Страх','Час','Обов\'язок','Таємниця','Невинність','Слава','Напрямок','Смерть','Честь',
      'Праця','Рішення','Інструмент','Баланс','Кохання','Перешкода','Творіння','Занепад','Торгівля','Зв\'язок',
      'Надія','Забобон','Мир','Обман','Історія','Світ','Присяга','Захист','Природа','Думка',
      'Тягар','Помста','Можливість','Фракція','Небезпека','Спотворення','Свобода','Борг','Ненависть','Власність',
      'Незнайомець','Перехід','Земля','Істота','Хвороба','Перевага','Кров','Мова','Чутка','Слабкість',
      'Жадібність','Сім\'я','Ресурс','Структура','Сон','Спільнота','Війна','Знамення','Трофей','Доля',
      'Імпульс','Влада','Пам\'ять','Руїна','Містицизм','Суперник','Проблема','Ідея','Відплата','Здоров\'я',
      'Братство','Ворог','Релігія','Дух','Популярність','Відчай','Сила','Знання','Істина','Пригода',
      'Гордість','Втрата','Закон','Шлях','Попередження','Стосунки','Багатство','Дім','Стратегія','Припаси',
    ],
  },
};

export default oracle;
