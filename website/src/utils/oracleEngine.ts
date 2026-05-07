import type { Oracle, Lang, ComboPreset } from './oracles/index';
import { ORACLES } from './oracles/index';

export interface RollAtom {
  oracleId: string;
  oracleTitle: string;
  rolls: number[];
  text: string;
}

export interface RollResult {
  atoms: RollAtom[];
  timestamp: number;
  comboId?: string;
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
  return { atoms: rollOracle(oracle, lang), timestamp: Date.now() };
}

export function rollCombo(preset: ComboPreset, lang: Lang): RollResult {
  const byId = new Map(ORACLES.map(o => [o.id, o]));
  const atoms = preset.oracleIds.flatMap(id => {
    const o = byId.get(id);
    if (!o) return [];
    return rollOracle(o, lang);
  });
  return { atoms, timestamp: Date.now(), comboId: preset.id };
}

const HISTORY_KEY = (lang: Lang) => `ironsworn-oracle-history-${lang}`;
const MAX_HISTORY = 100;

export function loadHistory(lang: Lang): RollResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(lang));
    return raw ? (JSON.parse(raw) as RollResult[]) : [];
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
