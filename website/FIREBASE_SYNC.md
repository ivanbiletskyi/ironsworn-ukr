# Синхронізація через Firebase

Сайт лишається local-first: усе працює без входу, дані живуть у
`localStorage`. Вхід через Google додає зверху синхронізацію — той самий JSON
їде у Firestore під вашим акаунтом і сам приїжджає на інші пристрої.

Синхронізується три речі:

- **персонажі** — `ironsworn-characters-v1`;
- **журнал кидків аркуша** — `ironsworn-sheet-log-v1`;
- **історія оракулів**, окремо на кожну мову — `ironsworn-oracle-history-{uk,en}`.

## Що треба зробити в консолі Firebase (один раз)

Проєкт: **ironsworn-uk**.

1. **Authentication → Sign-in method → Google → Enable.**
   Вкажіть публічну назву застосунку й службову пошту підтримки.

2. **Authentication → Settings → Authorized domains.**
   Додайте домен, з якого відкривається сайт:
   - `ivanbiletskyi.github.io` — GitHub Pages;
   - `localhost` уже є за замовчуванням.

   Без цього вхід падає з `auth/unauthorized-domain`.

3. **Firestore Database → Create database.**
   Регіон — будь-який (наприклад, `eur3`). Режим не має значення: правила
   однаково перезапишемо наступним кроком.

4. **Firestore Database → Rules** — вставте вміст [`firestore.rules`](./firestore.rules)
   і натисніть **Publish**.

   Правила — єдине, що розділяє дані між акаунтами. Конфіг Firebase у
   `src/utils/firebase/client.ts` не є секретом: він потрапляє в бандл до
   кожного відвідувача, і так і має бути.

## Якщо вхід не працює

| Що показує кнопка | Що робити |
| --- | --- |
| `auth/configuration-not-found` | Крок 1: Authentication у проєкті взагалі не увімкнено. |
| `auth/operation-not-allowed` | Крок 1: провайдер Google не увімкнено в Sign-in method. |
| `auth/unauthorized-domain` | Крок 2: додати домен сайту в Authorized domains. |
| `Missing or insufficient permissions` | Крок 4: правила не опубліковано. |
| `Cloud Firestore API has not been used…` | Крок 3: базу не створено. |

Стан проєкту можна перевірити й без браузера:

```sh
# Вхід: CONFIGURATION_NOT_FOUND — Authentication не увімкнено
curl -s "https://identitytoolkit.googleapis.com/v1/projects?key=<VITE_FIREBASE_API_KEY>"

# Дані: SERVICE_DISABLED — базу не створено
curl -s "https://firestore.googleapis.com/v1/projects/ironsworn-uk/databases/(default)/documents/users"
```

### «Database is closing/hidden»

Помилка шару IndexedDB у `@firebase/auth`: він закриває з'єднання, щойно
вкладка ховається, а вікно входу Google робить саме це. Тому сесія навмисно
зберігається в localStorage — див. `createAuth` у `src/utils/firebase/client.ts`.
Не міняйте це на `getAuth()`, не перевіривши вхід у справжньому браузері.

## Як це працює

```
Кнопка в шапці ──► AuthProvider ──► setSyncUser(uid)
                                        │
                       sync/engine.ts ◄──┴──► Firestore
                            │                 users/{uid}/sheets/characters
                            ▼
                       localStorage
                            ▲
      ┌─────────────────────┼─────────────────────┐
useCharacterStore      useSheetLog        OracleGenerators
   (персонажі)      (журнал кидків)      (історія оракулів)
```

Кожен екран зберігає своє в `localStorage` і каже `notifyLocalChange()`;
двигун сам перечитує диск і вирішує, що відсилати. Зустрічний напрямок —
підписки `subscribeStore` / `subscribeSheetLog` / `subscribeOracleHistory`.

- **`src/utils/firebase/client.ts`** — конфіг і ліниве завантаження SDK.
  Firebase важить понад 200 КБ, тож підвантажується динамічно й лише коли
  потрібен; сайт-читалка правил цього не платить.
- **`src/utils/sync/snapshot.ts`** — що синхронізується і як зводяться
  розбіжності. Чиста логіка, без мережі, під тестами.
- **`src/utils/sync/logs.ts`** — злиття журналів; **`tombstones.ts`** — надгробки.
- **`src/utils/sync/engine.ts`** — Firestore, підписки, черга запису.
  Живе поза React: кнопка входу є на кожній сторінці, а аркуш і оракули
  змонтовані лише на своїх.
- **`src/components/auth/`** — провайдер, контекст і кнопка в шапці.

### Формат документа

Один документ на користувача — `users/{uid}/sheets/characters`:

```json
{
  "version": 1,
  "payload": "{\"characters\":[…],\"tombstones\":{…},\"sheetLog\":{…},\"oracleHistory\":{…}}",
  "updatedAt": 1734280000000
}
```

Усе в одному документі навмисно: Firestore рахує записи документами, а
злиття однією операцією простіше тримати послідовним. Журнал усередині —
це `{ entries, tombstones, clearedAt }`.

`payload` — JSON-рядок, той самий вміст, що й у `localStorage`. Так формат
аркуша не залежить від схеми Firestore, а міграції лишаються в одному місці
(`normalizeCharacter` у `storage.ts`).

### Розв'язання конфліктів

- Персонаж — неподільна одиниця: виграє той бік, чий `updatedAt` новіший.
- Видалення записується «надгробком» (`id → час`), інакше інший пристрій
  повернув би персонажа при найближчому злитті. Надгробки живуть 90 днів.
- Правка, зроблена після видалення, скасовує видалення.
- Порожні персонажі (гравець нічого не заповнив) у хмару не їдуть: аркуш
  ніколи не буває без жодного персонажа, тож кожен новий пристрій заводить
  свого, і без фільтра список поповнювався б порожніми «Без імені».
- Перший обмін після входу прибирає такі порожні картки й локально.

Журнали зводяться так само, але з двома відмінностями:

- запис журналу майже завжди лише додається, тож злиття — це об'єднання за
  `id`, відсортоване за часом кидка; кидок із телефона стає згори, а не в
  хвості списку;
- «Очистити журнал» стирає сотню рядків одним рухом, тож замість сотні
  надгробків пишеться одна позначка `clearedAt` — усе, що старше, зникає й
  на іншому пристрої. Кидки, зроблені після очищення, вона не чіпає.

Записи оракулів до появи синхронізації не мали `id`; він добудовується з
самого запису (час + вміст), а не випадково — інакше кожне завантаження
сторінки перейменовувало б їх, і хмара збирала б копію за копією.

## Збірка проти іншого проєкту Firebase

Значення за замовчуванням можна перекрити змінними оточення Vite —
`website/.env.local`:

```
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
```

## Що синхронізація не робить

- Не стирає нічого з пристрою під час виходу з акаунта: вихід лише зупиняє обмін.
- Не зберігає більше, ніж тримає сам журнал: після злиття лишаються
  останні 100 записів, решта зникає — як і без синхронізації.
- Не працює як спільний стіл: документ читає й пише лише його власник.
