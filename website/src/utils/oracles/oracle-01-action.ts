import type { SimpleOracle } from './oracle-types';

const oracle: SimpleOracle = {
  kind: 'simple',
  id: 'action',
  title: { en: 'Action', uk: 'Дія' },
  description: {
    en: 'Use to inspire a discovery, event, character goal, or situation. Combine with Theme for action + subject.',
    uk: 'Надихає на відкриття, подію, мету персонажа або ситуацію. Комбінуйте з Темою для дії + предмета.',
  },
  entries: {
    en: [
      'Scheme','Clash','Weaken','Initiate','Create','Swear','Avenge','Guard','Defeat','Control',
      'Break','Risk','Surrender','Inspect','Raid','Evade','Assault','Deflect','Threaten','Attack',
      'Leave','Preserve','Manipulate','Remove','Eliminate','Withdraw','Abandon','Investigate','Hold','Focus',
      'Uncover','Breach','Aid','Uphold','Falter','Suppress','Hunt','Share','Destroy','Avoid',
      'Reject','Demand','Explore','Bolster','Seize','Mourn','Reveal','Gather','Defy','Transform',
      'Persevere','Serve','Begin','Move','Coordinate','Resist','Await','Impress','Take','Oppose',
      'Capture','Overwhelm','Challenge','Acquire','Protect','Finish','Strengthen','Restore','Advance','Command',
      'Refuse','Find','Deliver','Hide','Fortify','Betray','Secure','Arrive','Affect','Change',
      'Defend','Debate','Support','Follow','Construct','Locate','Endure','Release','Lose','Reduce',
      'Escalate','Distract','Journey','Escort','Learn','Communicate','Depart','Search','Charge','Summon',
    ],
    uk: [
      'Інтригувати','Зіткнутися','Ослабити','Ініціювати','Створити','Присягнути','Помститися','Охороняти','Перемогти','Контролювати',
      'Зламати','Ризикувати','Здатися','Оглянути','Напасти','Ухилитися','Штурмувати','Відбити','Погрожувати','Атакувати',
      'Залишити','Зберегти','Маніпулювати','Вилучити','Усунути','Відступити','Покинути','Розслідувати','Утримувати','Зосередитися',
      'Викрити','Прорвати','Допомогти','Підтримувати','Вагатися','Придушувати','Полювати','Ділитися','Знищити','Уникати',
      'Відхилити','Вимагати','Досліджувати','Підтримати','Захопити','Оплакувати','Розкрити','Збирати','Знехтувати','Трансформувати',
      'Вистояти','Служити','Почати','Рухати','Координувати','Чинити опір','Очікувати','Вразити','Взяти','Протистояти',
      'Полонити','Приголомшити','Кинути виклик','Здобути','Захистити','Завершити','Посилити','Відновити','Просуватися','Командувати',
      'Відмовити','Знайти','Доставити','Сховати','Укріпити','Зрадити','Убезпечити','Прибути','Вплинути','Змінити',
      'Захищати','Сперечатися','Підтримати','Слідувати','Збудувати','Виявити','Витримати','Звільнити','Втратити','Зменшити',
      'Ескалювати','Відволікти','Подорожувати','Супроводжувати','Навчитися','Спілкуватися','Відбути','Шукати','Атакувати (Стрімголов)','Прикликати',
    ],
  },
};

export default oracle;
