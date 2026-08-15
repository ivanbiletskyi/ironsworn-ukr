import { useState, useEffect, useCallback, useRef } from 'react';
import { ORACLES, COMBO_PRESETS } from '../utils/oracles/index';
import type { Oracle, Lang } from '../utils/oracles/index';
import {
  HISTORY_META_KEY,
  MAX_HISTORY,
  rollOracle,
  rollCombo,
  loadHistory,
  newResultId,
  saveHistory,
  formatResultForClipboard,
} from '../utils/oracleEngine';
import type { RollResult, RollAtom } from '../utils/oracleEngine';
import { recordLogCleared, recordLogRemoval } from '../utils/sync/logs';
import { notifyLocalChange, subscribeOracleHistory } from '../utils/sync/engine';
import './OracleGenerators.css';

// ─── OracleCard ──────────────────────────────────────────────────────────────

interface OracleCardProps {
  oracle: Oracle;
  lang: Lang;
  lastAtoms: RollAtom[] | undefined;
  onRoll: (atoms: RollAtom[]) => void;
  onReroll: (atoms: RollAtom[]) => void;
  onDelete: () => void;
}

function OracleCard({ oracle, lang, lastAtoms, onRoll, onReroll, onDelete }: OracleCardProps) {
  const [animating, setAnimating] = useState(false);
  const [tickerText, setTickerText] = useState<string | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleRoll = useCallback(() => {
    const atoms = rollOracle(oracle, lang);
    onRoll(atoms);

    // The result itself renders from `lastAtoms`, which `onRoll` has just
    // updated; the ticker is only a flourish drawn over it while animating.
    if (prefersReduced) return;

    setAnimating(true);
    setTickerText('...');

    const fakeValues = ['Схема...', 'Битва...', 'Небезпека...', 'Таємниця...'];
    let count = 0;
    tickerRef.current = setInterval(() => {
      setTickerText(fakeValues[count % fakeValues.length]);
      count++;
      if (count >= 4) {
        clearInterval(tickerRef.current!);
        setAnimating(false);
      }
    }, 60);
  }, [oracle, lang, onRoll, prefersReduced]);

  useEffect(() => {
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, []);

  const resultText = lastAtoms && lastAtoms.length > 0
    ? lastAtoms.map(a => a.text).join(' / ')
    : null;
  const displayText = animating ? tickerText : resultText;

  const title = oracle.title[lang];
  const description = oracle.description?.[lang];
  const rollNums = lastAtoms?.flatMap(a => a.rolls) ?? [];
  const hasResult = displayText !== null;

  return (
    <div className="oracle-card">
      <div className="oracle-card-header">
        <h3 className="oracle-card-title">{title}</h3>
        {description && <p className="oracle-card-desc">{description}</p>}
      </div>

      <div className={`oracle-result ${animating ? 'animating' : ''} ${displayText ? 'has-result' : ''}`}>
        {displayText ? (
          <>
            <span className="oracle-result-text">{displayText}</span>
            {rollNums.length > 0 && !animating && (
              <span className="oracle-roll-chip">
                {rollNums.map((r, i) => (
                  <span key={i}>d100: <strong>{r}</strong>{i < rollNums.length - 1 ? ', ' : ''}</span>
                ))}
              </span>
            )}
          </>
        ) : (
          <span className="oracle-result-placeholder">
            {lang === 'uk' ? '— натисніть для кидка —' : '— tap to roll —'}
          </span>
        )}
      </div>

      <div className="oracle-roll-row">
        <button className="oracle-roll-btn" onClick={handleRoll} aria-label={`Roll ${title}`}>
          🎲 {lang === 'uk' ? 'Кинути' : 'Roll'}
        </button>
        {hasResult && (
          <button
            className="oracle-reroll-btn"
            onClick={() => { onReroll(rollOracle(oracle, lang)); }}
            aria-label={`Reroll ${title}`}
            title={lang === 'uk' ? 'Перекинути' : 'Reroll'}
          >
            🔄
          </button>
        )}
        {hasResult && (
          <button
            className="oracle-delete-btn"
            onClick={() => { onDelete(); }}
            aria-label={`Delete ${title}`}
            title={lang === 'uk' ? 'Видалити з журналу' : 'Delete from log'}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ComboPresetBar ───────────────────────────────────────────────────────────

interface ComboPresetBarProps {
  lang: Lang;
  onRoll: (result: RollResult) => void;
}

function ComboPresetBar({ lang, onRoll }: ComboPresetBarProps) {
  return (
    <div className="combo-bar">
      <span className="combo-bar-label">
        {lang === 'uk' ? 'Комбо:' : 'Combos:'}
      </span>
      {COMBO_PRESETS.map(preset => (
        <button
          key={preset.id}
          className="combo-chip"
          title={preset.description[lang]}
          onClick={() => onRoll(rollCombo(preset, lang))}
        >
          {preset.label[lang]}
        </button>
      ))}
    </div>
  );
}

// ─── RollLog ─────────────────────────────────────────────────────────────────

interface RollLogProps {
  history: RollResult[];
  lang: Lang;
  onClear: () => void;
  onReroll: (entryIndex: number, atomIndex: number) => void;
  onDeleteEntry: (entryIndex: number) => void;
  onDeleteAtom: (entryIndex: number, atomIndex: number) => void;
}

function RollLog({ history, lang, onClear, onReroll, onDeleteEntry, onDeleteAtom }: RollLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const copyAll = () => {
    const text = history.map(formatResultForClipboard).join('\n---\n');
    copyText(text, 'all');
  };

  const count = history.length;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const logContent = (
    <div className="roll-log-content">
      <div className="roll-log-toolbar">
        <span className="roll-log-count">
          {count} {lang === 'uk' ? 'кидків' : 'rolls'}
        </span>
        <button className="roll-log-action" onClick={copyAll} disabled={count === 0}>
          {copied === 'all' ? '✓' : '📋'} {lang === 'uk' ? 'Все' : 'All'}
        </button>
        <button className="roll-log-action danger" onClick={onClear} disabled={count === 0}>
          {lang === 'uk' ? 'Очистити' : 'Clear'}
        </button>
      </div>

      {count === 0 ? (
        <p className="roll-log-empty">
          {lang === 'uk' ? 'Ще немає кидків' : 'No rolls yet'}
        </p>
      ) : (
        <ul className="roll-log-list">
          {history.map((result, ri) => (
            // Ключ за id, а не за часом: після злиття з іншим пристроєм
            // записи можуть стати в іншому порядку, і React не має
            // переплутати рядки між собою.
            <li key={result.id} className="roll-log-entry">
              <div className="roll-log-entry-header">
                <span className="roll-log-time">{formatTime(result.timestamp)}</span>
                <button
                  className="roll-log-copy"
                  onClick={() => copyText(formatResultForClipboard(result), result.id)}
                  title={lang === 'uk' ? 'Скопіювати' : 'Copy'}
                >
                  {copied === result.id ? '✓' : '📋'}
                </button>
                <button
                  className="roll-log-delete-entry"
                  onClick={() => onDeleteEntry(ri)}
                  title={lang === 'uk' ? 'Видалити' : 'Delete'}
                >
                  ✕
                </button>
              </div>
              {result.atoms.map((atom, ai) => (
                <div key={ai} className="roll-log-atom">
                  <span className="roll-log-oracle-title">{atom.oracleTitle}</span>
                  <span className="roll-log-arrow">→</span>
                  <span className="roll-log-atom-text">{atom.text}</span>
                  <span className="roll-log-rolls">
                    {atom.rolls.map((r, i) => (
                      <span key={i} className="roll-log-roll-num">{r}</span>
                    ))}
                  </span>
                  <button
                    className="roll-log-reroll"
                    onClick={() => onReroll(ri, ai)}
                    title={lang === 'uk' ? 'Перекинути' : 'Reroll'}
                  >
                    🔄
                  </button>
                  <button
                    className="roll-log-delete-atom"
                    onClick={() => onDeleteAtom(ri, ai)}
                    title={lang === 'uk' ? 'Видалити рядок' : 'Delete line'}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: sticky panel */}
      <aside className="roll-log-panel desktop-only">
        <h3 className="roll-log-title">
          📜 {lang === 'uk' ? 'Журнал кидків' : 'Roll Log'}
        </h3>
        {logContent}
      </aside>

      {/* Mobile: floating button + slide-up drawer */}
      <div className="mobile-only">
        <button className="roll-log-fab" onClick={() => setIsOpen(true)}>
          📜 {count > 0 && <span className="roll-log-fab-count">{count}</span>}
        </button>
        {isOpen && (
          <div className="roll-log-drawer-overlay" onClick={() => setIsOpen(false)}>
            <aside className="roll-log-drawer" onClick={e => e.stopPropagation()}>
              <div className="roll-log-drawer-header">
                <h3 className="roll-log-title">
                  📜 {lang === 'uk' ? 'Журнал кидків' : 'Roll Log'}
                </h3>
                <button className="roll-log-close" onClick={() => setIsOpen(false)}>✕</button>
              </div>
              {logContent}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

// ─── OracleGenerators (page) ──────────────────────────────────────────────────

interface OracleGeneratorsProps {
  currentLang: Lang;
}

export default function OracleGenerators({ currentLang }: OracleGeneratorsProps) {
  const [history, setHistory] = useState<RollResult[]>(() => loadHistory(currentLang));
  const [lastByOracle, setLastByOracle] = useState<Record<string, RollAtom[]>>({});

  // Reload history when the language changes. Adjusted during render rather than
  // in an effect: an effect would let the save effect below run once with the
  // previous language's history already keyed to the new language.
  const [loadedLang, setLoadedLang] = useState(currentLang);
  if (loadedLang !== currentLang) {
    setLoadedLang(currentLang);
    setHistory(loadHistory(currentLang));
    setLastByOracle({});
  }

  useEffect(() => {
    saveHistory(currentLang, history);
    notifyLocalChange();
  }, [history, currentLang]);

  // Кидки з іншого пристрою двигун уже поклав у localStorage — лишається
  // показати їх. Мову звіряємо: журнали двох мов не змішуються.
  useEffect(
    () =>
      subscribeOracleHistory((lang, next) => {
        if (lang === currentLang) setHistory(next);
      }),
    [currentLang],
  );

  const pushResult = useCallback((result: RollResult) => {
    setHistory(h => [result, ...h].slice(0, MAX_HISTORY));
    // Group atoms by their base oracle id so each card shows only its own result
    const byOracle: Record<string, RollAtom[]> = {};
    result.atoms.forEach(atom => {
      const baseId = atom.oracleId.split(':')[0];
      (byOracle[baseId] ??= []).push(atom);
    });
    setLastByOracle(prev => ({ ...prev, ...byOracle }));
  }, []);

  const handleCardRoll = useCallback((atoms: RollAtom[]) => {
    pushResult({ id: newResultId(), atoms, timestamp: Date.now() });
  }, [pushResult]);

  const handleCardReroll = useCallback((atoms: RollAtom[]) => {
    const oracleId = atoms[0]?.oracleId.split(':')[0];
    if (!oracleId) return;
    setHistory(h => {
      const idx = h.findIndex(e => e.atoms.some(a => a.oracleId.split(':')[0] === oracleId));
      if (idx === -1) {
        return [{ id: newResultId(), atoms, timestamp: Date.now() }, ...h].slice(0, MAX_HISTORY);
      }
      const entry = h[idx];
      // Find the position of the first atom belonging to this oracle and replace in-place
      const firstPos = entry.atoms.findIndex(a => a.oracleId.split(':')[0] === oracleId);
      const withoutOld = entry.atoms.filter(a => a.oracleId.split(':')[0] !== oracleId);
      const replacedAtoms = [
        ...withoutOld.slice(0, firstPos),
        ...atoms,
        ...withoutOld.slice(firstPos),
      ];
      // `updatedAt`, а не `timestamp`: журнал показує час самого кидка, а
      // синхронізації потрібен час правки, щоб розв'язати конфлікт.
      return h.map((e, i) => i === idx ? { ...e, atoms: replacedAtoms, updatedAt: Date.now() } : e);
    });
    const byOracle: Record<string, RollAtom[]> = {};
    atoms.forEach(a => { (byOracle[a.oracleId.split(':')[0]] ??= []).push(a); });
    setLastByOracle(prev => ({ ...prev, ...byOracle }));
  }, []);

  /** Надгробок ставимо одразу: без нього найближча синхронізація
      повернула б запис з іншого пристрою. */
  const forget = useCallback(
    (entry: RollResult) => recordLogRemoval(HISTORY_META_KEY(currentLang), entry.id),
    [currentLang],
  );

  const handleDeleteEntry = useCallback((entryIndex: number) => {
    const entry = history[entryIndex];
    if (!entry) return;
    forget(entry);
    const removedIds = new Set(entry.atoms.map(a => a.oracleId.split(':')[0]));
    setLastByOracle(prev => {
      const next = { ...prev };
      removedIds.forEach(id => { delete next[id]; });
      return next;
    });
    setHistory(h => h.filter((_, i) => i !== entryIndex));
  }, [history, forget]);

  const handleDeleteAtom = useCallback((entryIndex: number, atomIndex: number) => {
    const entry = history[entryIndex];
    if (!entry) return;
    const oracleId = entry.atoms[atomIndex]?.oracleId.split(':')[0];
    if (oracleId) {
      setLastByOracle(prev => {
        const next = { ...prev };
        delete next[oracleId];
        return next;
      });
    }
    const remaining = entry.atoms.filter(a => a.oracleId.split(':')[0] !== oracleId);
    if (remaining.length === 0) {
      forget(entry);
      setHistory(h => h.filter((_, i) => i !== entryIndex));
      return;
    }
    setHistory(h =>
      h.map((e, i) => i === entryIndex ? { ...e, atoms: remaining, updatedAt: Date.now() } : e),
    );
  }, [history, forget]);

  const handleCardDelete = useCallback((oracleId: string) => {
    const idx = history.findIndex(e => e.atoms.some(a => a.oracleId.split(':')[0] === oracleId));
    if (idx !== -1) {
      const entry = history[idx];
      const remaining = entry.atoms.filter(a => a.oracleId.split(':')[0] !== oracleId);
      if (remaining.length === 0) {
        forget(entry);
        setHistory(h => h.filter((_, i) => i !== idx));
      } else {
        setHistory(h =>
          h.map((e, i) => i === idx ? { ...e, atoms: remaining, updatedAt: Date.now() } : e),
        );
      }
    }
    setLastByOracle(prev => {
      const next = { ...prev };
      delete next[oracleId];
      return next;
    });
  }, [history, forget]);

  /** Одна позначка часу замість сотні надгробків — і вона ж скасовує їх усі. */
  const handleClear = useCallback(() => {
    recordLogCleared(HISTORY_META_KEY(currentLang));
    setHistory([]);
    setLastByOracle({});
  }, [currentLang]);

  const handleReroll = useCallback((entryIndex: number, atomIndex: number) => {
    const entry = history[entryIndex];
    if (!entry) return;
    const atom = entry.atoms[atomIndex];
    if (!atom) return;
    const oracleId = atom.oracleId.split(':')[0];
    const oracle = ORACLES.find(o => o.id === oracleId);
    if (!oracle) return;
    const newAtoms = rollOracle(oracle, currentLang);
    const updatedAtoms = [
      ...entry.atoms.slice(0, atomIndex),
      ...newAtoms,
      ...entry.atoms.slice(atomIndex + 1),
    ];
    const now = Date.now();
    const newEntry: RollResult = {
      ...entry,
      atoms: updatedAtoms,
      timestamp: now,
      updatedAt: now,
    };
    setHistory(h => h.map((e, i) => i === entryIndex ? newEntry : e));
    const byOracle: Record<string, RollAtom[]> = {};
    newAtoms.forEach(a => { (byOracle[a.oracleId.split(':')[0]] ??= []).push(a); });
    setLastByOracle(prev => ({ ...prev, ...byOracle }));
  }, [history, currentLang]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'c' || e.key === 'C') handleClear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClear]);

  return (
    <div className="oracle-page">
      <h1 className="oracle-page-title">
        {currentLang === 'uk' ? '🎲 Генератори оракулів' : '🎲 Oracle Generators'}
      </h1>
      <p className="oracle-page-subtitle">
        {currentLang === 'uk'
          ? 'Кидайте оракули для натхнення під час гри. C — очистити журнал.'
          : 'Roll oracles for in-game inspiration. Press C to clear the log.'}
      </p>

      <ComboPresetBar lang={currentLang} onRoll={pushResult} />

      <div className="oracle-layout">
        <div className="oracle-grid">
          {ORACLES.map(oracle => (
            <OracleCard
              key={oracle.id}
              oracle={oracle}
              lang={currentLang}
              lastAtoms={lastByOracle[oracle.id]}
              onRoll={handleCardRoll}
              onReroll={handleCardReroll}
              onDelete={() => handleCardDelete(oracle.id)}
            />
          ))}
        </div>
        <RollLog
          history={history}
          lang={currentLang}
          onClear={handleClear}
          onReroll={handleReroll}
          onDeleteEntry={handleDeleteEntry}
          onDeleteAtom={handleDeleteAtom}
        />
      </div>
    </div>
  );
}
