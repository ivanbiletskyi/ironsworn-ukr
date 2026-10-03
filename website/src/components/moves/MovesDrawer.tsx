// Шторка ходів на аркуші персонажа: список із пошуком або картка ходу з
// панеллю кидка. На десктопі — колонка праворуч від аркуша, на телефоні —
// діалог на весь екран. Що відкрито, живе в URL аркуша (`?moves`,
// `?move=<id>`), тож системна «Назад» закриває картку, потім шторку.
//
// Кидок пишеться в той самий журнал аркуша, що й кидок атрибута; чіпи
// наслідків змінюють персонажа лише після тапу.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { To } from 'react-router-dom';
import type { AttrKey, Character } from '../../utils/character/types';
import type { OracleRollResult, SheetLogEntry } from '../../utils/character/diceEngine';
import { commitBurn, formatD100, previewBurn } from '../../utils/character/diceEngine';
import { resetMomentum } from '../../utils/character/rules';
import type { Effect, Move, MoveCategory, MoveTable } from '../../utils/moves';
import { getMove, isTable } from '../../utils/moves';
import { queryStems, searchMoves } from '../../utils/moves/search';
import {
  applyEffect,
  isD100Table,
  oracleOdds,
  revertEffect,
  tableRowFor,
  type EffectContext,
} from '../../utils/moves/play';
import RollResultCard from '../character/RollResultCard';
import MoveDetail from './MoveDetail';
import MoveList from './MoveList';
import MoveSearchBar from './MoveSearchBar';
import MoveRollPanel from './MoveRollPanel';
import EffectChips, { type AppliedEffect } from './EffectChips';
import CharacterStrip from './CharacterStrip';
import { OUTCOME_TEXT } from './outcomes';
import { initialDraft, prepareRoll, rollTable, type RollDraft } from './rollDraft';
import { useFavorites, useRecent } from './useMovesStorage';
import './MovesPage.css';
import './MovesDrawer.css';

interface TableRoll {
  entry: OracleRollResult;
  row: number;
}

/** Усе, що гравець зробив на картці одного ходу. Живе, поки відкрита сторінка. */
interface MoveSession {
  draft: RollDraft;
  result?: SheetLogEntry;
  tables: Record<string, TableRoll>;
  applied: Record<string, AppliedEffect>;
}

/** Запит аркуша відкрити хід із наперед вибраною шкалою чи шкодою. */
export interface DrawerPreset {
  moveId: string;
  draft: Partial<RollDraft>;
  /** Новий запит — нове число, навіть для того самого ходу. */
  nonce: number;
}

export interface MovesDrawerProps {
  character: Character;
  wide: boolean;
  moveId: string | null;
  initialStat?: AttrKey | null;
  backTo?: Move;
  preset?: DrawerPreset | null;
  linkFor: (move: Move) => To;
  listLinkState?: unknown;
  onOpenMove: (move: Move) => void;
  onShowList: () => void;
  onBack: () => void;
  onClose: () => void;
  onLog: (entry: SheetLogEntry) => void;
  onCharacter: (update: (current: Character) => Character) => void;
}

function summary(entry: SheetLogEntry): string {
  if (entry.kind === 'oracle') return `d100 · ${formatD100(entry.value)} → ${entry.result}`;
  const dice = `${entry.challengeDice[0]} і ${entry.challengeDice[1]}`;
  const score = entry.kind === 'action' ? entry.actionScore : entry.boxes;
  return `${OUTCOME_TEXT[entry.outcome].short} · ${score} проти ${dice}`;
}

export default function MovesDrawer({
  character,
  wide,
  moveId,
  initialStat = null,
  backTo,
  preset,
  linkFor,
  listLinkState,
  onOpenMove,
  onShowList,
  onBack,
  onClose,
  onLog,
  onCharacter,
}: MovesDrawerProps) {
  const move = moveId ? getMove(moveId) : undefined;
  const { favorites, toggleFavorite } = useFavorites();
  const { pushRecent } = useRecent();
  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Пошук і фільтри — свої в шторці: URL аркуша несе лише те, що відкрито.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MoveCategory | null>(null);
  const [stat, setStat] = useState<AttrKey | null>(initialStat);
  const [coreOnly, setCoreOnly] = useState(false);
  const stems = useMemo(() => queryStems(query), [query]);
  const hits = useMemo(() => searchMoves(query, { category, stat, coreOnly }), [query, category, stat, coreOnly]);

  // Кидки на картках належать персонажу: інший персонаж — чисті картки.
  const [sessions, setSessions] = useState<Record<string, MoveSession>>({});
  const [sessionOwner, setSessionOwner] = useState(character.id);
  if (sessionOwner !== character.id) {
    setSessionOwner(character.id);
    setSessions({});
  }

  // Запит аркуша («Кинути прогрес» на присязі) перезаписує чернетку ходу.
  const [appliedPreset, setAppliedPreset] = useState<number | null>(null);
  if (preset && preset.nonce !== appliedPreset) {
    setAppliedPreset(preset.nonce);
    const target = getMove(preset.moveId);
    if (target) {
      setSessions(current => ({
        ...current,
        [target.id]: { draft: initialDraft(target, character, preset.draft), tables: {}, applied: {} },
      }));
    }
  }

  useEffect(() => {
    if (move) pushRecent(move.id);
  }, [move, pushRecent]);

  // На телефоні шторка — діалог: фокус усередину, сторінка під нею стоїть.
  useEffect(() => {
    if (wide) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [wide]);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('.moves-drawer__head button')?.focus();
  }, [moveId]);

  const session: MoveSession | undefined = move
    ? (sessions[move.id] ?? { draft: initialDraft(move, character), tables: {}, applied: {} })
    : undefined;

  const updateSession = (update: (current: MoveSession) => MoveSession) => {
    if (!move || !session) return;
    setSessions(current => ({ ...current, [move.id]: update(current[move.id] ?? session) }));
  };

  /** Відкрити інший хід; `harm` підставляється в його крок втрати. */
  const openMove = (targetId: string, harm?: number) => {
    const target = getMove(targetId);
    if (!target) return;
    if (harm !== undefined) {
      setSessions(current => ({
        ...current,
        [target.id]: { draft: initialDraft(target, character, { harm }), tables: {}, applied: {} },
      }));
    }
    onOpenMove(target);
  };

  const applyChip = (key: string, effect: Effect, context: EffectContext) => {
    const before = character;
    onCharacter(current => applyEffect(current, effect, context));
    updateSession(current => ({ ...current, applied: { ...current.applied, [key]: { before, context } } }));
  };

  const revertChip = (key: string, effect: Effect) => {
    const applied = session?.applied[key];
    if (!applied) return;
    onCharacter(current => revertEffect(current, applied.before, effect, applied.context));
    updateSession(current => {
      const rest = { ...current.applied };
      delete rest[key];
      return { ...current, applied: rest };
    });
  };

  const rollOnTable = (table: MoveTable, key: string) => {
    if (!move) return;
    const entry = rollTable(`${move.name} · d100`, table);
    onLog(entry);
    updateSession(current => ({
      ...current,
      tables: { ...current.tables, [key]: { entry, row: tableRowFor(table, entry.value) } },
    }));
  };

  const prepared = move && session ? prepareRoll(move, character, session.draft) : null;

  const doRoll = () => {
    if (!move || !prepared?.ready || !prepared.roll) return;
    const entry = prepared.roll();
    onLog(entry);
    updateSession(current => {
      const tables = { ...current.tables };
      if (prepared.tableKey && entry.kind === 'oracle') {
        const table = (move.after ?? []).find(isTable);
        if (table) tables[prepared.tableKey] = { entry, row: tableRowFor(table, entry.value) };
      }
      return { ...current, result: entry, tables, applied: {} };
    });
  };

  const newRoll = () =>
    updateSession(current => ({
      ...current,
      result: undefined,
      applied: {},
      tables: {},
      draft: { ...current.draft, lossApplied: false },
    }));

  const result = session?.result;
  const burnPreview = result?.kind === 'action' ? previewBurn(result, character.momentum) : null;
  const burn = () => {
    if (result?.kind !== 'action') return;
    const burned = commitBurn(result, character.momentum);
    if (!burned) return;
    onLog(burned);
    onCharacter(current => ({ ...current, momentum: resetMomentum(current) }));
    updateSession(current => ({ ...current, result: burned }));
  };

  /** Рядок «Спитати Оракула», що відповідає вибраним шансам після кидка. */
  const oddsHighlight =
    move?.roll?.kind === 'askTheOracle' && result && session?.draft.oddsRow !== null
      ? oracleOdds(move).find(odds => odds.row === session?.draft.oddsRow)?.row
      : undefined;

  const renderEffects = (effects: Effect[], key: string) => (
    <EffectChips
      effects={effects}
      chipKey={key}
      character={character}
      applied={session?.applied ?? {}}
      onApply={applyChip}
      onRevert={revertChip}
      onOpenMove={openMove}
    />
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    const input = event.target as HTMLElement;
    if (input.tagName === 'INPUT' && (input as HTMLInputElement).value) return;
    event.stopPropagation();
    onClose();
  };

  const resultSlot =
    result &&
    (result.kind === 'oracle' ? (
      <div className="oracle-result" aria-live="polite">
        <span>d100</span>
        <strong className="oracle-result__value">{formatD100(result.value)}</strong>
        <span>→ {result.result}</span>
        {result.matched && move?.roll?.kind === 'askTheOracle' && (
          <span className="oracle-result__twist">дубль — несподіванка</span>
        )}
      </div>
    ) : (
      <div className="move-roll-result" aria-live="polite">
        <RollResultCard roll={result} burnPreview={burnPreview} onBurn={burn} />
      </div>
    ));

  return (
    <aside
      ref={rootRef}
      className={`moves-page moves-drawer ${wide ? 'moves-drawer--wide' : 'moves-drawer--full'}`}
      role={wide ? 'complementary' : 'dialog'}
      aria-modal={wide ? undefined : true}
      aria-label="Ходи"
      onKeyDown={onKeyDown}
    >
      <div className="moves-drawer__head">
        {move ? (
          backTo ? (
            <button type="button" className="moves-drawer__nav" onClick={onBack}>
              ← Назад до {backTo.name}
            </button>
          ) : (
            <button type="button" className="moves-drawer__nav" onClick={onShowList}>
              ← Ходи
            </button>
          )
        ) : (
          <h2 className="moves-drawer__title">Ходи</h2>
        )}
        <button type="button" className="moves-drawer__close" onClick={onClose} aria-label="Закрити ходи">
          ×
        </button>
      </div>

      <CharacterStrip character={character} />

      <div className="moves-drawer__scroll">
        {move && session ? (
          <MoveDetail
            move={move}
            favorite={favorites.includes(move.id)}
            onToggleFavorite={toggleFavorite}
            onOpen={target => openMove(target.id)}
            bookBase="/uk"
            play={{
              rollSlot: (
                <MoveRollPanel
                  move={move}
                  character={character}
                  draft={session.draft}
                  onDraft={patch => updateSession(current => ({ ...current, draft: { ...current.draft, ...patch } }))}
                  onCharacter={onCharacter}
                />
              ),
              resultSlot,
              outcome: result && result.kind !== 'oracle' ? result.outcome : null,
              renderEffects,
              tableAction: (table, key) =>
                isD100Table(table) ? (
                  <button type="button" className="table-roll" onClick={() => rollOnTable(table, key)}>
                    🎲 Кинути d100
                  </button>
                ) : null,
              tableHighlight: key => session.tables[key]?.row ?? (key.startsWith('after.') ? oddsHighlight : undefined),
            }}
          />
        ) : moveId ? (
          <p className="move-not-found">Ходу «{moveId}» немає в довіднику.</p>
        ) : (
          <>
            <MoveSearchBar
              ref={searchRef}
              query={query}
              onQuery={setQuery}
              onSubmit={() => hits[0] && onOpenMove(hits[0].move)}
              category={category}
              onCategory={setCategory}
              stat={stat}
              onStat={setStat}
              coreOnly={coreOnly}
              onCoreOnly={setCoreOnly}
              compact
            />
            {hits.length === 0 ? (
              <p className="moves-empty">Не знайшли такого ходу.</p>
            ) : (
              <MoveList
                hits={hits}
                grouped={stems.length === 0}
                stems={stems}
                favorites={favorites}
                showFavorites={stems.length === 0 && favorites.length > 0}
                linkFor={linkFor}
                linkState={listLinkState}
                replaceLinks={false}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </>
        )}
      </div>

      {move && prepared && (
        <div className="moves-drawer__bar">
          {result ? (
            <>
              <span className="moves-drawer__summary">{summary(result)}</span>
              <button type="button" className="moves-drawer__secondary" onClick={newRoll}>
                Новий кидок
              </button>
            </>
          ) : (
            <>
              {prepared.reason && <span className="moves-drawer__reason">{prepared.reason}</span>}
              <button
                type="button"
                className="moves-drawer__roll"
                disabled={!prepared.ready}
                onClick={doRoll}
              >
                🎲 {prepared.label}
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
