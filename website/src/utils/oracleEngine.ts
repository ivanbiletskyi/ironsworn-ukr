import type { Oracle, Lang, ComboPreset } from './oracles/index';
import { ORACLES } from './oracles/index';

export interface RollAtom {
  oracleId: string;
  oracleTitle: string;
  rolls: number[];
  text: string;
}

export interface RollResult {
  /** Стабільний ідентифікатор — за ним журнал зводиться між пристроями. */
  id: string;
  atoms: RollAtom[];
  timestamp: number;
  /**
   * Час останньої правки (перекидання, видалення рядка). За ним
   * розв'язується конфлікт; `timestamp` лишається часом самого кидка,
   * бо його показує журнал.
   */
  updatedAt?: number;
  comboId?: string;
}

let resultCounter = 0;

export function newResultId(): string {
  return `o-${Date.now().toString(36)}-${(resultCounter++).toString(36)}`;
}

/**
 * Ідентифікатор для записів, збережених до появи синхронізації. Береться
 * з самого запису, а не випадково: інакше кожне завантаження сторінки
 * перейменовувало б їх, і хмара збирала б копію за копією.
 */
function derivedId(timestamp: number, atoms: RollAtom[]): string {
  const text = JSON.stringify(atoms);
  let hash = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `o-${timestamp.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/** Приводить довільні дані до запису журналу; `null` — якщо це не він. */
export function normalizeResult(raw: unknown): RollResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const entry = raw as Partial<RollResult>;
  if (!Array.isArray(entry.atoms) || typeof entry.timestamp !== 'number') return null;
  return {
    ...entry,
    atoms: entry.atoms,
    timestamp: entry.timestamp,
    id: typeof entry.id === 'string' && entry.id ? entry.id : derivedId(entry.timestamp, entry.atoms),
  };
}

/** Час, за яким розв'язується конфлікт для цього запису. */
export function resultClock(entry: RollResult): number {
  return entry.updatedAt ?? entry.timestamp;
}

const d100 = () => Math.floor(Math.random() * 100) + 1;
const d10  = () => Math.floor(Math.random() * 10)  + 1;

function findRow<T extends { min: number; max: number }>(rows: T[], roll: number): T {
  const row = rows.find(r => roll >= r.min && roll <= r.max);
  if (!row) throw new Error(`No row for roll ${roll}`);
  return row;
}

export function rollOracle(oracle: Oracle, lang: Lang, depth = 0): RollAtom[] {
  if (depth > 4) return [];

  switch (oracle.kind) {
    case 'simple': {
      const r = d100();
      return [{
        oracleId: oracle.id,
        oracleTitle: oracle.title[lang],
        rolls: [r],
        text: oracle.entries[lang][r - 1],
      }];
    }

    case 'range': {
      const r = d100();
      const row = findRow(oracle.rows[lang], r);
      const atom: RollAtom = {
        oracleId: oracle.id,
        oracleTitle: oracle.title[lang],
        rolls: [r],
        text: row.result,
      };
      if (row.rollAgain && row.rollAgain > 0) {
        const extras = Array.from({ length: row.rollAgain }, () =>
          rollOracle(oracle, lang, depth + 1)
        ).flat();
        return [atom, ...extras];
      }
      return [atom];
    }

    case 'twoStep': {
      const r1 = d100();
      const cat = findRow(oracle.categories[lang], r1);
      const subEntries = oracle.subTables[lang][cat.subId];
      const r2 = d10();
      const text = subEntries[r2 - 1];
      return [{
        oracleId: oracle.id,
        oracleTitle: oracle.title[lang],
        rolls: [r1, r2],
        text: `${cat.label}: ${text}`,
      }];
    }

    case 'compound': {
      const parts = oracle.parts[lang];
      const rolls: number[] = [];
      const values = parts.map(part => {
        const r = d100();
        rolls.push(r);
        return findRow(part.rows, r).value;
      });
      const text = values.reduce((acc, v, i) => acc.replace(`{${i}}`, v), oracle.template);
      return [{
        oracleId: oracle.id,
        oracleTitle: oracle.title[lang],
        rolls,
        text,
      }];
    }

    case 'multiColumn': {
      return oracle.columns[lang].map(col => {
        const r = d100();
        return {
          oracleId: `${oracle.id}:${col.label}`,
          oracleTitle: `${oracle.title[lang]} — ${col.label}`,
          rolls: [r],
          text: findRow(col.rows, r).value,
        };
      });
    }
  }
}

export function rollSingle(oracleId: string, lang: Lang): RollResult {
  const oracle = ORACLES.find(o => o.id === oracleId);
  if (!oracle) throw new Error(`Oracle not found: ${oracleId}`);
  return { id: newResultId(), atoms: rollOracle(oracle, lang), timestamp: Date.now() };
}

export function rollCombo(preset: ComboPreset, lang: Lang): RollResult {
  const byId = new Map(ORACLES.map(o => [o.id, o]));
  const atoms = preset.oracleIds.flatMap(id => {
    const o = byId.get(id);
    if (!o) return [];
    return rollOracle(o, lang);
  });
  return { id: newResultId(), atoms, timestamp: Date.now(), comboId: preset.id };
}

const HISTORY_KEY = (lang: Lang) => `ironsworn-oracle-history-${lang}`;
/** Надгробки й час очищення журналу — окремим ключем поруч із ним. */
export const HISTORY_META_KEY = (lang: Lang) => `ironsworn-oracle-history-meta-${lang}`;
export const MAX_HISTORY = 100;

export function loadHistory(lang: Lang): RollResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(lang));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Записи, збережені до появи синхронізації, тут отримують id.
    return parsed.flatMap(item => {
      const entry = normalizeResult(item);
      return entry ? [entry] : [];
    });
  } catch {
    return [];
  }
}

export function saveHistory(lang: Lang, history: RollResult[]): void {
  try {
    localStorage.setItem(HISTORY_KEY(lang), JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function formatAtomForClipboard(atom: RollAtom): string {
  const rollStr = atom.rolls.map(r => `d100:${r}`).join(', ');
  return `${atom.oracleTitle} (${rollStr}) → ${atom.text}`;
}

export function formatResultForClipboard(result: RollResult): string {
  return result.atoms.map(formatAtomForClipboard).join('\n');
}
