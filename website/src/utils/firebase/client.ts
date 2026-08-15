// Єдина точка доступу до Firebase.
//
// SDK підвантажується динамічно й лише тоді, коли він справді потрібен:
// сайт — це передусім читалка правил, і 200+ КБ auth+firestore не мають
// лежати в головному бандлі заради кнопки в шапці. Усі імпорти типів
// (`import type`) стираються під час збірки, тож рантайму не коштують нічого.

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Конфіг веб-застосунку Firebase не є секретом: він потрапляє в бандл
 * будь-якого клієнта. Доступ до даних обмежують правила Firestore
 * (див. `firestore.rules`), а не приховування цих значень. Змінні
 * оточення лишаємо як спосіб зібрати сайт проти іншого проєкту.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDip0ad52-pMD454h7pV-To1_TsFAiE-A8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'ironsworn-uk.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'ironsworn-uk',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'ironsworn-uk.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '750183841115',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:750183841115:web:34640522d425d663886e7e',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-DV83NH7J02',
};

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let pending: Promise<FirebaseClient> | null = null;

/**
 * Сесія зберігається в localStorage, а не в IndexedDB.
 *
 * `getAuth()` віддає перевагу IndexedDB, а той шар у @firebase/auth 1.13
 * закриває з'єднання, щойно вкладка ховається (`isHiding`). Вікно входу
 * Google робить саме це, тож повернення з нього падало з «Database is
 * closing/hidden» — на записі облікових даних, уже після успішного входу.
 * localStorage такого стану не має, а для сайту він і без того рідний.
 *
 * `initializeAuth` вимагає явного резолвера: без нього signInWithPopup
 * кинув би `auth/argument-error`.
 */
function createAuth(
  app: FirebaseApp,
  authModule: typeof import('firebase/auth'),
): Auth {
  try {
    return authModule.initializeAuth(app, {
      persistence: authModule.browserLocalPersistence,
      popupRedirectResolver: authModule.browserPopupRedirectResolver,
    });
  } catch {
    // Уже ініціалізовано (буває при гарячій заміні модулів у dev).
    return authModule.getAuth(app);
  }
}

/**
 * Ініціалізує Firebase один раз на вкладку. Повторні виклики повертають
 * ту саму обіцянку — зокрема й ту, що ще не виконалася, тож паралельні
 * виклики (шапка + аркуш) не створять другого застосунку.
 */
export function getFirebase(): Promise<FirebaseClient> {
  pending ??= (async () => {
    try {
      const [appModule, authModule, firestoreModule] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);

      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(firebaseConfig);

      return {
        app,
        auth: createAuth(app, authModule),
        db: firestoreModule.getFirestore(app),
      };
    } catch (cause) {
      // Невдале завантаження не має «залипати»: наступна спроба входу
      // почне все спочатку (мережа могла просто впасти на секунду).
      pending = null;
      throw cause;
    }
  })();

  return pending;
}
