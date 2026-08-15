// Синхронізація персонажів через Firestore.
//
// Живе поза React навмисно: кнопка входу стоїть у шапці всього сайту, а
// аркуш змонтований лише на /uk/character. Якби двигун був хуком аркуша,
// вхід зі сторінки правил нічого б не підтягнув, і гравець побачив би
// своїх персонажів тільки після переходу на аркуш.
//
// Один документ на користувача: users/{uid}/sheets/characters.
// Всередині — той самий JSON, що й у localStorage (див. sync.ts).

import type { CharacterStore } from './types';
import { STORE_VERSION } from './types';
import { createCharacter, loadStore, loadTombstones, saveStore, saveTombstones } from './storage';
import type { SyncSnapshot } from './sync';
import {
  SYNC_FORMAT_VERSION,
  emptySnapshot,
  isBlankCharacter,
  mergeSnapshots,
  parseSyncDocument,
  sameSnapshot,
  serializeSnapshot,
} from './sync';
import { getFirebase } from '../firebase/client';

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'saving' | 'error';

export interface SyncState {
  status: SyncStatus;
  /** Час останнього успішного обміну з хмарою. */
  lastSyncedAt: number | null;
  /** Уже перекладене українською пояснення для меню користувача. */
  error: string | null;
}

const PUSH_DELAY = 800;

/** Ліміт документа Firestore — 1 МіБ; лишаємо запас на службові поля. */
const MAX_PAYLOAD = 900_000;

let state: SyncState = { status: 'off', lastSyncedAt: null, error: null };
const stateListeners = new Set<(state: SyncState) => void>();
const storeListeners = new Set<(store: CharacterStore) => void>();

let uid: string | null = null;
/** Зростає на кожній зміні користувача: асинхронні хвости старого входу
    впізнають себе як застарілі й тихо припиняються. */
let session = 0;
let unsubscribeDoc: (() => void) | null = null;
/** Останній відомий стан хмари — щоб не писати те, що там уже лежить. */
let remote: SyncSnapshot | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingStore: CharacterStore | null = null;
let flushing = false;
let pushAgain = false;

// ── Підписки ──────────────────────────────────────────────────────────

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  stateListeners.add(listener);
  listener(state);
  return () => stateListeners.delete(listener);
}

/** Спрацьовує, коли з хмари приїхали зміни й локальне сховище оновлено. */
export function subscribeStore(listener: (store: CharacterStore) => void): () => void {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  for (const listener of stateListeners) listener(state);
}

// ── Помилки ───────────────────────────────────────────────────────────

function describe(cause: unknown): string {
  const code = (cause as { code?: string } | null)?.code;
  if (code === 'permission-denied') {
    return 'Немає доступу до даних у Firestore. Перевірте правила безпеки.';
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return 'Немає зв’язку з Firebase. Дані збережено на цьому пристрої.';
  }
  if (cause instanceof Error) return cause.message;
  return 'Не вдалося синхронізувати аркуш.';
}

// ── Локальний бік ─────────────────────────────────────────────────────

function localSnapshot(store: CharacterStore): SyncSnapshot {
  return { characters: store.characters, tombstones: loadTombstones() };
}

/**
 * Що саме їде в хмару. Порожні персонажі лишаються вдома: аркуш ніколи не
 * буває без жодного персонажа, тож кожен новий пристрій заводить свого, і
 * без цього фільтра список поповнювався б порожніми «Без імені».
 */
function outgoing(snapshot: SyncSnapshot): SyncSnapshot {
  return {
    characters: snapshot.characters.filter(character => !isBlankCharacter(character)),
    tombstones: snapshot.tombstones,
  };
}

/** users/{uid}/sheets/characters — по документу на користувача. */
function docRefPath(userId: string): [string, string, string, string] {
  return ['users', userId, 'sheets', 'characters'];
}

// ── Прийом змін із хмари ──────────────────────────────────────────────

function applyRemote(raw: unknown, pruneBlanks: boolean): void {
  let incoming: SyncSnapshot;
  try {
    incoming = raw === null ? emptySnapshot() : parseSyncDocument(raw);
  } catch (cause) {
    setState({ status: 'error', error: describe(cause) });
    return;
  }

  remote = incoming;

  const store = pendingStore ?? loadStore();
  const local = localSnapshot(store);
  const merged = mergeSnapshots(local, incoming, { pruneBlanks });

  // Видалення останнього персонажа на іншому пристрої не має лишати цей
  // без жодного: аркуш без персонажа — глухий кут, з нього навіть немає
  // чим створити нового.
  if (merged.characters.length === 0 && store.characters.length > 0) {
    merged.characters = [createCharacter()];
  }

  if (!sameSnapshot(merged, local)) {
    // Активним лишається той самий персонаж, поки він існує: підміняти
    // відкриту картку через зміну на іншому пристрої — це найгірше, що
    // синхронізація може зробити посеред гри.
    const activeId = merged.characters.some(character => character.id === store.activeId)
      ? store.activeId
      : merged.characters[0]?.id ?? null;
    const next: CharacterStore = { version: STORE_VERSION, activeId, characters: merged.characters };

    saveStore(next);
    saveTombstones(merged.tombstones);
    pendingStore = next;
    for (const listener of storeListeners) listener(next);
  }

  setState({ status: 'synced', lastSyncedAt: Date.now(), error: null });

  // Хмара могла не знати частини локальних змін — відсилаємо їх одразу.
  if (!sameSnapshot(outgoing(merged), incoming)) schedulePush(0);
}

// ── Відправлення змін ─────────────────────────────────────────────────

function schedulePush(delay = PUSH_DELAY): void {
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void flushPush();
  }, delay);
}

async function flushPush(): Promise<void> {
  if (!uid) return;
  // Записи не мають накладатися: зміну, що надійшла посеред запису,
  // відсилаємо наступним колом, а не паралельно.
  if (flushing) {
    pushAgain = true;
    return;
  }
  const token = session;
  const userId = uid;

  const local = localSnapshot(pendingStore ?? loadStore());
  const payload = outgoing(local);
  if (remote && sameSnapshot(payload, remote)) {
    setState({ status: 'synced', lastSyncedAt: Date.now(), error: null });
    return;
  }

  const text = serializeSnapshot(payload);
  if (text.length > MAX_PAYLOAD) {
    setState({
      status: 'error',
      error: 'Аркуш завеликий для синхронізації. Видаліть зайвих персонажів або скоротіть записи.',
    });
    return;
  }

  flushing = true;
  setState({ status: 'saving', error: null });
  try {
    const { db } = await getFirebase();
    const { doc, setDoc } = await import('firebase/firestore');
    if (token !== session) return;

    await setDoc(doc(db, ...docRefPath(userId)), {
      version: SYNC_FORMAT_VERSION,
      payload: text,
      updatedAt: Date.now(),
    });
    if (token !== session) return;

    // Запам'ятовуємо, що саме поклали: без цього наступний знімок із
    // сервера виглядав би як чужа зміна й тягнув за собою зайвий запис.
    remote = payload;
    setState({ status: 'synced', lastSyncedAt: Date.now(), error: null });
  } catch (cause) {
    if (token === session) setState({ status: 'error', error: describe(cause) });
  } finally {
    flushing = false;
    if (pushAgain) {
      pushAgain = false;
      schedulePush(0);
    }
  }
}

// ── Публічний API ─────────────────────────────────────────────────────

/** Викликає аркуш після кожного локального збереження. */
export function pushLocal(store: CharacterStore): void {
  pendingStore = store;
  if (!uid) return;
  schedulePush();
}

/** Примусовий обмін — кнопка «Синхронізувати зараз». */
export function syncNow(): void {
  if (!uid) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  void flushPush();
}

function disconnect(): void {
  unsubscribeDoc?.();
  unsubscribeDoc = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  remote = null;
  pushAgain = false;
}

async function connect(userId: string, token: number): Promise<void> {
  setState({ status: 'connecting', error: null });
  try {
    const { db } = await getFirebase();
    const { doc, onSnapshot } = await import('firebase/firestore');
    if (token !== session) return;

    // Перше злиття прибирає порожніх персонажів, які завів цей пристрій до
    // входу. Далі так робити не можна: щойно створений персонаж теж
    // порожній, і синхронізація з'їдала б його з-під рук.
    let pristine = true;

    unsubscribeDoc = onSnapshot(
      doc(db, ...docRefPath(userId)),
      snapshot => {
        if (token !== session) return;
        // Власний ще не підтверджений запис нічого нового не повідомляє.
        if (snapshot.metadata.hasPendingWrites) return;
        const fromServer = !snapshot.metadata.fromCache;
        const pruneBlanks = pristine && fromServer;
        if (fromServer) pristine = false;
        applyRemote(snapshot.exists() ? snapshot.data() : null, pruneBlanks);
      },
      cause => {
        if (token !== session) return;
        setState({ status: 'error', error: describe(cause) });
      },
    );
  } catch (cause) {
    if (token === session) setState({ status: 'error', error: describe(cause) });
  }
}

/** Вмикає синхронізацію під цим користувачем; `null` — вимикає. */
export function setSyncUser(nextUid: string | null): void {
  if (nextUid === uid) return;

  session += 1;
  disconnect();
  uid = nextUid;

  if (!nextUid) {
    setState({ status: 'off', error: null });
    return;
  }

  void connect(nextUid, session);
}
