// Журнал кидків аркуша. Свій ключ у localStorage, окремо від історії оракулів
// (рішення №7): спільний лише тип запису, щоб потім злити журнали без переписування.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SheetRoll } from '../../utils/character/diceEngine';
import { MAX_SHEET_LOG, loadSheetLog, saveSheetLog } from '../../utils/character/storage';

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
      dirty.current = false;
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [log]);

  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      saveSheetLog(latest.current);
      dirty.current = false;
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  const push = useCallback((roll: SheetRoll) => {
    dirty.current = true;
    setLog(current => [roll, ...current].slice(0, MAX_SHEET_LOG));
  }, []);

  const remove = useCallback((id: string) => {
    dirty.current = true;
    setLog(current => current.filter(entry => entry.id !== id));
  }, []);

  const clear = useCallback(() => {
    dirty.current = true;
    setLog([]);
  }, []);

  return { log, push, remove, clear };
}
