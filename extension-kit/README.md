# extension-kit

Набір для розширень сайту [ironsworn-ukr](../website): окремих модулів, що
живуть у власних (зазвичай приватних) репозиторіях і завантажуються сайтом із
Firestore лише для акаунтів, яким видано доступ.

Цей репозиторій містить тільки загальний механізм. Про жодне конкретне
розширення він не знає.

## Як влаштовано

```
репо розширення ──push──► CI: build → підпис → Firestore ◄──читання з дозволом── сайт
     ▲                                     ext/{id}, grants/{email}/ext/{id}
     └── host/ (git submodule цього репо): extension-kit + типи HostApi
```

- Контракт: [`website/src/extensions/api.ts`](../website/src/extensions/api.ts).
  Модуль розширення робить `export default (host: HostApi) => ({ routes })`.
  Маршрути монтуються під `/:lang/x/{id}/`.
- React і router бере з хоста: пресет [`vite.mjs`](./vite.mjs) підміняє ці
  імпорти, у бандлі їх немає.
- Реліз — один ES-модуль, підписаний ECDSA P-256. Хост виконує його лише після
  перевірки підпису публічним ключем із `website/src/extensions/keys.ts`.
- Доступ: правила у [`website/firestore.rules`](../website/firestore.rules).

## Репозиторій розширення

```
extension.json      id, title, nav, requires.hostApi, entry
access.json         { "emails": [...] } — Google-акаунти з доступом
content/{uk,en}/    Markdown (необов'язково; посилання перевіряє publish.mjs)
src/index.tsx       export default function register(host) { … }
vite.config.mjs     export { default } from …; див. нижче
host/               git submodule ironsworn-ukr
```

```js
// vite.config.mjs
import { extensionPreset } from './host/extension-kit/vite.mjs';
export default extensionPreset();
```

`package.json` розширення має містити `vite`, `typescript`, `@types/react`,
`firebase-admin`, а також `react` і `react-router-dom` тих самих мажорних
версій, що й на сайті. Останні два потрібні лише для типів і переліку
експортів, у бандл вони не потрапляють.

## Ключі

```sh
node extension-kit/keygen.mjs ~/.config/ironsworn-ext/signing-key.json
```

Публічний ключ додайте в `website/src/extensions/keys.ts`, а вміст файлу
приватного ключа збережіть як секрет `EXT_SIGNING_KEY` у репозиторії
розширення.

Для Firestore потрібен сервісний акаунт проєкту `ironsworn-uk` лише з роллю
**Cloud Datastore User**. Його JSON-ключ зберігається як секрет
`FIREBASE_SERVICE_ACCOUNT`.

## Публікація й відкат

Скопіюйте [`publish.yml`](./publish.yml) у `.github/workflows/` розширення.
Пуш у `main` збирає, підписує й публікує реліз, синхронізує доступ і лишає
5 останніх релізів. Відкат запускається вручну (Run workflow → `rollback`:
версія) і лише перемикає `current`.

```sh
node host/extension-kit/publish.mjs --dry-run       # перевірки
node host/extension-kit/publish.mjs rollback abc1234
```

## Локальна розробка

```sh
npm run dev                                    # розширення на :5174
cd host/website && VITE_EXT_DEV="<id>=http://localhost:5174" yarn dev
```

У dev-збірці сайт бере розширення прямо з Vite-сервера, без Firestore і
підпису. Після змін оновіть сторінку. У production-збірці цього шляху немає.
