// Текст ходу: абзаци, списки «➢» і таблиці з `MoveBlock[]`. Розбір
// розмітки всередині рядка — у moveMarkup.tsx.

import type { ReactNode } from 'react';
import { isTable, itemEffects, itemText, type Effect, type MoveBlock, type MoveTable } from '../../utils/moves';
import { inline, type OpenMove } from './moveMarkup';

/**
 * Чіпи наслідків під пунктом чи результатом. Є лише на аркуші: довідник без
 * персонажа їх не показує, тож функція необовʼязкова.
 */
export type RenderEffects = (effects: Effect[], key: string) => ReactNode;

/** Кнопка кидка d100 біля таблиці; ключ — «after.0», «miss.1». */
export type RenderTableAction = (table: MoveTable, key: string) => ReactNode;

export function MoveTableView({
  table,
  onOpen,
  highlightRow,
}: {
  table: MoveTable;
  onOpen?: OpenMove;
  /** Рядок, що випав на d100. */
  highlightRow?: number;
}) {
  return (
    <div className="move-table-wrap">
      <table className="move-table">
        <thead>
          <tr>
            <th scope="col">{table.head[0]}</th>
            <th scope="col">{table.head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([range, result], index) => (
            <tr key={range} className={index === highlightRow ? 'move-table__hit' : undefined}>
              <td className="move-table__range">{range}</td>
              <td>{inline(result, onOpen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Таблиця довша за 6 рядків згорнута за замовчуванням. */
const COLLAPSE_AFTER = 6;

export function MoveBlocks({
  blocks,
  onOpen,
  renderEffects,
  keyPrefix = '',
  tableAction,
  tableHighlight,
}: {
  blocks: MoveBlock[];
  onOpen?: OpenMove;
  renderEffects?: RenderEffects;
  /** Ключ наслідків: «weak.1.2» — третій пункт другого блока смуги. */
  keyPrefix?: string;
  tableAction?: RenderTableAction;
  /** Рядок таблиці з ключем `key`, що випав на d100. */
  tableHighlight?: (key: string) => number | undefined;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        if (typeof block === 'string') {
          return <p key={index}>{inline(block, onOpen)}</p>;
        }
        if (isTable(block)) {
          const key = `${keyPrefix}${index}`;
          const highlightRow = tableHighlight?.(key);
          const view = <MoveTableView table={block} onOpen={onOpen} highlightRow={highlightRow} />;
          // Таблиця, у якій щось випало, розгорнута: інакше рядок сховано.
          return (
            <div key={index} className="move-table-block">
              {tableAction?.(block, key)}
              {block.rows.length > COLLAPSE_AFTER ? (
                <details className="move-table-details" open={highlightRow !== undefined || undefined}>
                  <summary>
                    Таблиця: {block.head[0]} · {block.rows.length} рядків
                  </summary>
                  {view}
                </details>
              ) : (
                view
              )}
            </div>
          );
        }
        return (
          <ul key={index} className="move-list">
            {block.map((item, itemIndex) => {
              const effects = itemEffects(item);
              return (
                <li key={itemText(item)}>
                  {inline(itemText(item), onOpen)}
                  {renderEffects &&
                    effects.length > 0 &&
                    renderEffects(effects, `${keyPrefix}${index}.${itemIndex}`)}
                </li>
              );
            })}
          </ul>
        );
      })}
    </>
  );
}
