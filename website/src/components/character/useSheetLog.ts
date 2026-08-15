// Журнал кидків аркуша. Свій ключ у localStorage, окремо від історії оракулів
// (рішення №7): спільний лише тип запису, щоб потім злити журнали без переписування.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SheetRoll } from '../../utils/character/diceEngine';
import {
  MAX_SHEET_LOG,
  SHEET_LOG_META_KEY,
  loadSheetLog,
  saveSheetLog,
} from '../../utils/character/storage';
import { recordLogCleared, recordLogRemoval } from '../../utils/sync/logs';
import { notifyLocalChange, subscribeSheetLog } from '../../utils/sync/engine';

const SAVE_DELAY = 400;

export function useSheetLog() {
  const [log, setLog] = useState<SheetRoll[]>(loadSheetLog);
  const dirty = useRef(false);
  const latest = useRef(log);

  useEffect(() => {
    latest.current = log;
  }, [log]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      saveSheetLog(log);
      notifyLocalChange();
      dirty.current = false;
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [log]);

  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      saveSheetLog(latest.current);
      notifyLocalChange();
      dirty.current = false;
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // Зміни з іншого пристрою двигун уже поклав у localStorage, тож `dirty`
  // лишається чистим: зберігати те саме вдруге нічого не дає.
  useEffect(
    () =>
      subscribeSheetLog(next => {
        dirty.current = false;
        setLog(next);
      }),
    [],
  );

  const push = useCallback((roll: SheetRoll) => {
    dirty.current = true;
    setLog(current => [roll, ...current].slice(0, MAX_SHEET_LOG));
  }, []);

  const remove = useCallback((id: string) => {
    // Надгробок ставимо одразу: без нього найближча синхронізація
    // повернула б запис з іншого пристрою.
    recordLogRemoval(SHEET_LOG_META_KEY, id);
    dirty.current = true;
    setLog(current => current.filter(entry => entry.id !== id));
  }, []);

  const clear = useCallback(() => {
    // Одна позначка часу замість сотні надгробків — і вона ж скасовує їх усі.
    recordLogCleared(SHEET_LOG_META_KEY);
    dirty.current = true;
    setLog([]);
  }, []);

  return { log, push, remove, clear };
}
