// Які з доступних розширень гравець вимкнув.
//
// Зберігається список вимкнених, а не увімкнених: щойно виданий дозвіл
// одразу з'являється в меню, без зайвого кроку на сторінці профілю.
//
// Під акаунтом — users/{uid}/settings/extensions, тож вибір однаковий на
// всіх пристроях. Dev-розширення без входу пам'ятають вибір у localStorage.

import { getFirebase } from '../utils/firebase/client';

/** `users/{uid}/settings/extensions` */
export interface ExtensionPrefsDoc {
  disabled: string[];
  updatedAt: number;
}

const DEV_KEY = 'ironsworn-ext-disabled';

function parseDisabled(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

/**
 * Стежить за вимкненими розширеннями акаунта; `uid === null` — локальні
 * налаштування dev-збірки. Повертає відписку.
 */
export function subscribeDisabled(
  uid: string | null,
  onChange: (disabled: string[]) => void,
  onError: (cause: unknown) => void,
): () => void {
  if (!uid) {
    try {
      onChange(parseDisabled(JSON.parse(localStorage.getItem(DEV_KEY) ?? '[]')));
    } catch {
      onChange([]);
    }
    return () => {};
  }

  let active = true;
  let unsubscribe: (() => void) | null = null;
  void (async () => {
    try {
      const { db } = await getFirebase();
      const { doc, onSnapshot } = await import('firebase/firestore');
      if (!active) return;
      unsubscribe = onSnapshot(
        doc(db, 'users', uid, 'settings', 'extensions'),
        snapshot => onChange(parseDisabled(snapshot.data()?.disabled)),
        onError,
      );
    } catch (cause) {
      if (active) onError(cause);
    }
  })();

  return () => {
    active = false;
    unsubscribe?.();
  };
}

export async function saveDisabled(uid: string | null, disabled: string[]): Promise<void> {
  if (!uid) {
    localStorage.setItem(DEV_KEY, JSON.stringify(disabled));
    return;
  }
  const { db } = await getFirebase();
  const { doc, setDoc } = await import('firebase/firestore');
  const data: ExtensionPrefsDoc = { disabled, updatedAt: Date.now() };
  await setDoc(doc(db, 'users', uid, 'settings', 'extensions'), data);
}
