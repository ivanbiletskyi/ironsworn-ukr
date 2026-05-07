export type Lang = 'en' | 'uk';
export type Localized<T> = Record<Lang, T>;

export interface SimpleOracle {
  kind: 'simple';
  id: string;
  title: Localized<string>;
  description?: Localized<string>;
  // index 0 = roll 1, index 99 = roll 100
  entries: Localized<string[]>;
}

export interface RangeRow {
  min: number;
  max: number;
  result: string;
  rollAgain?: number;
}

export interface RangeOracle {
  kind: 'range';
  id: string;
  title: Localized<string>;
  description?: Localized<string>;
  rows: Localized<RangeRow[]>;
}

export interface TwoStepCategory {
  min: number;
  max: number;
  subId: string;
  label: string;
}

export interface TwoStepOracle {
  kind: 'twoStep';
  id: string;
  title: Localized<string>;
  description?: Localized<string>;
  // first d100 picks a sub-table
  categories: Localized<TwoStepCategory[]>;
  // second d10 (1-10) picks within the sub-table; each sub-table has 10 entries
  subTables: Localized<Record<string, string[]>>;
}

export interface CompoundPart {
  label: string;
  rows: { min: number; max: number; value: string }[];
}

export interface CompoundOracle {
  kind: 'compound';
  id: string;
  title: Localized<string>;
  description?: Localized<string>;
  parts: Localized<CompoundPart[]>;
  // e.g. "{0}{1}" — {N} replaced by part N result
  template: string;
}

export interface MultiColumnOracle {
  kind: 'multiColumn';
  id: string;
  title: Localized<string>;
  description?: Localized<string>;
  columns: Localized<{ label: string; rows: { min: number; max: number; value: string }[] }[]>;
}

export type Oracle =
  | SimpleOracle
  | RangeOracle
  | TwoStepOracle
  | CompoundOracle
  | MultiColumnOracle;

export interface ComboPreset {
  id: string;
  label: Localized<string>;
  description: Localized<string>;
  oracleIds: string[];
}
