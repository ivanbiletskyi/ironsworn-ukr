// Оракули доповнень для сторінки «Генератори оракулів».
//
// Сторінка завантажує кожне увімкнене доповнення (той самий кеш, що й
// маршрут /x/{id}/) і бере з його ExtensionDefinition `oracles` та
// `oracleCombos`. Доповнення, яке не завантажилося, просто не дає секції:
// сторінка про нього не згадує.

import { useEffect, useMemo, useState } from 'react';
import { ORACLES } from '../utils/oracles/index';
import type { ComboPreset, Lang, Oracle } from '../utils/oracles/oracle-types';
import type { ExtensionDefinition } from './api';
import { useOptionalExtensions } from './extensionsContext';
import type { CatalogEntry } from './loader';

export interface ExtensionOracleGroup {
  extId: string;
  title: Partial<Record<Lang, string>>;
  oracles: Oracle[];
  combos: ComboPreset[];
}

const KINDS = new Set<string>(['simple', 'range', 'twoStep', 'compound', 'multiColumn']);
const CORE_IDS = new Set(ORACLES.map(o => o.id));

const isLocalized = (value: unknown): boolean => {
  const v = value as Record<string, unknown> | null | undefined;
  return typeof v?.uk === 'string' && typeof v?.en === 'string';
};

// «:» зайнята: нею двигун відділяє колонку multiColumn від id оракула.
const isId = (value: unknown): value is string => typeof value === 'string' && value !== '' && !value.includes(':');

/** Достатньо, щоб картка відрендерилася; решту форми гарантують типи розширення. */
function isOracle(value: unknown): value is Oracle {
  const o = value as Partial<Oracle> | null;
  return typeof o === 'object' && o !== null && KINDS.has(String(o.kind)) && isId(o.id) && isLocalized(o.title);
}

/**
 * Оракули й комбо одного доповнення з префіксом `{extId}/` в id, щоб не
 * зійтися з основною книгою чи з іншим доповненням. Комбо можуть посилатися
 * і на власні оракули, і на оракули основної книги.
 */
export function toOracleGroup(entry: CatalogEntry, definition: ExtensionDefinition): ExtensionOracleGroup | null {
  const prefix = `${entry.id}/`;
  const own = (Array.isArray(definition.oracles) ? definition.oracles : []).filter(isOracle);
  const ownIds = new Set(own.map(o => o.id));
  const oracles = own.map(o => ({ ...o, id: prefix + o.id }));

  const combos = (Array.isArray(definition.oracleCombos) ? definition.oracleCombos : []).flatMap(combo => {
    if (!combo || !isId(combo.id) || !isLocalized(combo.label) || !Array.isArray(combo.oracleIds)) return [];
    const oracleIds = combo.oracleIds.flatMap(id =>
      ownIds.has(id) ? [prefix + id] : CORE_IDS.has(id) ? [id] : [],
    );
    return oracleIds.length ? [{ ...combo, id: prefix + combo.id, oracleIds }] : [];
  });

  if (!oracles.length && !combos.length) return null;
  return { extId: entry.id, title: entry.title, oracles, combos };
}

/** Секції оракулів від увімкнених доповнень, у порядку каталогу. */
export function useExtensionOracles(): ExtensionOracleGroup[] {
  const extensions = useOptionalExtensions();
  const catalog = extensions?.catalog;
  const disabled = extensions?.disabled;
  const load = extensions?.load;

  const entries = useMemo(
    () => (catalog?.status === 'ready' ? catalog.entries.filter(entry => !disabled?.has(entry.id)) : []),
    [catalog, disabled],
  );
  const [loaded, setLoaded] = useState<{ entries: CatalogEntry[]; groups: ExtensionOracleGroup[] } | null>(null);

  useEffect(() => {
    if (!load || !entries.length) return;
    let active = true;
    void Promise.all(
      entries.map(entry =>
        load(entry).then(
          definition => toOracleGroup(entry, definition),
          cause => {
            console.error(`Оракули розширення ${entry.id} недоступні:`, cause);
            return null;
          },
        ),
      ),
    ).then(groups => {
      if (active) setLoaded({ entries, groups: groups.filter((g): g is ExtensionOracleGroup => g !== null) });
    });
    return () => { active = false; };
  }, [entries, load]);

  return loaded?.entries === entries ? loaded.groups : [];
}
