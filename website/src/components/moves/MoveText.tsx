// Текст ходу: абзаци, списки «➢» і таблиці з `MoveBlock[]`. Розбір
// розмітки всередині рядка — у moveMarkup.tsx.

import { isTable, type MoveBlock, type MoveTable } from '../../utils/moves';
import { inline, type OpenMove } from './moveMarkup';

export function MoveTableView({ table, onOpen }: { table: MoveTable; onOpen?: OpenMove }) {
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
          {table.rows.map(([range, result]) => (
            <tr key={range}>
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

export function MoveBlocks({ blocks, onOpen }: { blocks: MoveBlock[]; onOpen?: OpenMove }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (typeof block === 'string') {
          return <p key={index}>{inline(block, onOpen)}</p>;
        }
        if (isTable(block)) {
          return block.rows.length > COLLAPSE_AFTER ? (
            <details key={index} className="move-table-details">
              <summary>
                Таблиця: {block.head[0]} · {block.rows.length} рядків
              </summary>
              <MoveTableView table={block} onOpen={onOpen} />
            </details>
          ) : (
            <MoveTableView key={index} table={block} onOpen={onOpen} />
          );
        }
        return (
          <ul key={index} className="move-list">
            {block.map(item => (
              <li key={item}>{inline(item, onOpen)}</li>
            ))}
          </ul>
        );
      })}
    </>
  );
}
