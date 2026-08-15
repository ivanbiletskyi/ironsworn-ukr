// Стан аркуша: завантаження, автозбереження з debounce, операції над персонажами.
// Компоненти працюють лише через цей хук — так інваріанти правил тримаються
// в одному місці (див. clampMomentum нижче).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character, CharacterStore } from '../../utils/character/types';
import { STORE_VERSION } from '../../utils/character/types';
import { clampMomentum } from '../../utils/character/rules';
import {
  createCharacter,
  duplicateCharacter,
  getActiveCharacter,
  importCharacter,
  loadStore,
  parseCharacterFile,
  recordCharacterTombstone,
  removeCharacter as removeFromStore,
  saveStore,
  upsertCharacter,
} from '../../utils/character/storage';
import { notifyLocalChange, subscribeStore } from '../../utils/sync/engine';

const SAVE_DELAY = 500;

function initialStore(): CharacterStore {
  const loaded = loadStore();
  if (loaded.characters.length > 0) return loaded;
  const first = createCharacter();
  return { version: STORE_VERSION, activeId: first.id, characters: [first] };
}

export function useCharacterStore() {
  const [store, setStore] = useState<CharacterStore>(initialStore);

  // Зберігаємо і на першому рендері: так нормалізовані (змігровані) дані
  // одразу лягають у localStorage, а не чекають першого редагування.
  const dirty = useRef(true);
  const latest = useRef(store);

  useEffect(() => {
    latest.current = store;
  }, [store]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      saveStore(store);
      notifyLocalChange();
      dirty.current = false;
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [store]);

  // Скидаємо незбережене, коли вкладку ховають або компонент зникає.
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      saveStore(latest.current);
      notifyLocalChange();
      dirty.current = false;
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // Зміни з іншого пристрою двигун синхронізації вже поклав у localStorage,
  // тож `dirty` лишається чистим: зберігати те саме вдруге нічого не дає.
  useEffect(
    () =>
      subscribeStore(next => {
        dirty.current = false;
        setStore(next);
      }),
    [],
  );

  const commit = useCallback((next: CharacterStore) => {
    dirty.current = true;
    setStore(next);
  }, []);

  const character = useMemo(() => getActiveCharacter(store), [store]);

  /**
   * Єдина точка зміни персонажа. Після будь-якої правки імпульс
   * приводиться в межі −6…макс, бо максимум залежить від слабкостей
   * і міг щойно змінитися.
   */
  const updateCharacter = useCallback(
    (updater: (current: Character) => Character) => {
      setStore(current => {
        const active = getActiveCharacter(current);
        if (!active) return current;
        const next = updater(active);
        dirty.current = true;
        return upsertCharacter(current, { ...next, momentum: clampMomentum(next.momentum, next) });
      });
    },
    [],
  );

  const patchCharacter = useCallback(
    (patch: Partial<Character>) => updateCharacter(current => ({ ...current, ...patch })),
    [updateCharacter],
  );

  const selectCharacter = useCallback(
    (id: string) => commit({ ...latest.current, activeId: id }),
    [commit],
  );

  const addCharacter = useCallback(() => {
    const fresh = createCharacter();
    const current = latest.current;
    commit({ ...current, characters: [...current.characters, fresh], activeId: fresh.id });
    return fresh;
  }, [commit]);

  const duplicateActive = useCallback(() => {
    const current = latest.current;
    const active = getActiveCharacter(current);
    if (!active) return null;
    const copy = duplicateCharacter(active);
    commit({ ...current, characters: [...current.characters, copy], activeId: copy.id });
    return copy;
  }, [commit]);

  const removeCharacter = useCallback(
    (id: string) => {
      // Надгробок ставимо до зміни стану: без нього найближча
      // синхронізація повернула б персонажа з іншого пристрою.
      recordCharacterTombstone(id);
      const next = removeFromStore(latest.current, id);
      // Аркуш без жодного персонажа — глухий кут, тож одразу заводимо новий.
      if (next.characters.length === 0) {
        const fresh = createCharacter();
        commit({ ...next, characters: [fresh], activeId: fresh.id });
        return;
      }
      commit(next);
    },
    [commit],
  );

  /** Кидає помилку з поясненням українською, якщо файл непридатний. */
  const importFromText = useCallback(
    (text: string) => {
      const imported = parseCharacterFile(text);
      commit(importCharacter(latest.current, imported));
      return imported;
    },
    [commit],
  );

  return {
    store,
    character,
    updateCharacter,
    patchCharacter,
    selectCharacter,
    addCharacter,
    duplicateActive,
    removeCharacter,
    importFromText,
  };
}
