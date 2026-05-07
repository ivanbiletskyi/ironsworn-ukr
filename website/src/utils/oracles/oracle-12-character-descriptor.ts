import type { SimpleOracle } from './oracle-types';

const oracle: SimpleOracle = {
  kind: 'simple',
  id: 'character-descriptor',
  title: { en: 'Character Descriptor', uk: 'Опис персонажа' },
  description: {
    en: 'Use to flesh out a character\'s personality or physical traits. Roll multiple times for additional detail.',
    uk: 'Доопрацьовує особистість або зовнішність персонажа. Можна кидати кілька разів.',
  },
  entries: {
    en: [
      'Stoic','Attractive','Passive','Aloof','Affectionate','Generous','Smug','Armed','Clever','Brave',
      'Ugly','Sociable','Doomed','Connected','Bold','Jealous','Angry','Active','Suspicious','Hostile',
      'Hardhearted','Successful','Talented','Experienced','Deceitful','Ambitious','Aggressive','Conceited','Proud','Stern',
      'Dependent','Wary','Strong','Insightful','Dangerous','Quirky','Cheery','Disfigured','Intolerant','Skilled',
      'Stingy','Timid','Insensitive','Wild','Bitter','Cunning','Remorseful','Kind','Charming','Oblivious',
      'Critical','Cautious','Resourceful','Weary','Wounded','Anxious','Powerful','Athletic','Driven','Cruel',
      'Quiet','Honest','Infamous','Dying','Reclusive','Artistic','Disabled','Confused','Manipulative','Relaxed',
      'Stealthy','Confident','Weak','Friendly','Wise','Influential','Young','Adventurous','Oppressed','Vengeful',
      'Cooperative','Armored','Apathetic','Determined','Loyal','Sick','Religious','Selfish','Old','Fervent',
      'Violent','Agreeable','Hot-tempered','Stubborn','Incompetent','Greedy','Cowardly','Obsessed','Careless','Ironsworn',
    ],
    uk: [
      'Стоїчний','Привабливий','Пасивний','Відсторонений','Ніжний','Щедрий','Самовдоволений','Озброєний','Кмітливий','Хоробрий',
      'Потворний','Товариський','Приречений','Зі зв\'язками','Сміливий','Ревнивий','Злий','Активний','Підозрілий','Ворожий',
      'Жорстокосердий','Успішний','Талановитий','Досвідчений','Брехливий','Амбітний','Агресивний','Пихатий','Гордий','Суворий',
      'Залежний','Насторожений','Сильний','Проникливий','Небезпечний','Дивакуватий','Життєрадісний','Спотворений','Нетерпимий','Вмілий',
      'Скупий','Боязкий','Нечутливий','Дикий','Запеклий (Гіркий)','Хитрий','Сповнений каяття','Добрий','Чарівний','Неуважний',
      'Критичний','Обережний','Винахідливий','Стомлений','Поранений','Стривожений','Могутній','Атлетичний','Цілеспрямований','Жорстокий',
      'Тихий','Чесний','З поганою славою','Помираючий','Відлюдькуватий','Артистичний','Покалічений','Розгублений','Маніпулятивний','Розслаблений',
      'Непомітний','Впевнений','Слабкий','Дружній','Мудрий','Впливовий','Молодий','Авантюрний','Пригнічений','Мстивий',
      'Готовий до співпраці','Оброспечений бронею','Апатичний','Рішучий','Вірний','Хворий','Релігійний','Егоїстичний','Старий','Палкий',
      'Жорстокий','Згідливий','Запальний','Впертий','Некомпетентний','Жадібний','Боягузливий','Одержимий','Необережний','Залізоземець (Ironsworn)',
    ],
  },
};

export default oracle;
