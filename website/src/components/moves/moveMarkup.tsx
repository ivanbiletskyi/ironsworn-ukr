// Розбір розмітки тексту ходу у вузли React і в простий рядок.
//
// Розмітка та сама, що в картках профілів (`**жирний**`, `*курсив*`), але
// курсив тут — назва іншого ходу, і він стає кнопкою переходу. Тому свій
// рекурсивний розбір, а не `richText`: у ходах буває курсив усередині
// жирного («***Здобуваєте перевагу* на користь…**»).

import type { ReactNode } from 'react';
import { findMoveByName, type Move, type MoveBlock } from '../../utils/moves';

/** Жирний перевіряється першим, інакше `**` розпалося б на два курсиви. */
const TOKEN = /\*\*(.+?)\*\*(?!\*)|\*(.+?)\*/g;

export type OpenMove = (move: Move) => void;

export function inline(text: string, onOpen?: OpenMove, keyPrefix = ''): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const k = `${keyPrefix}${key++}`;
    if (match[1] !== undefined) {
      nodes.push(<strong key={k}>{inline(match[1], onOpen, `${k}.`)}</strong>);
    } else {
      const target = findMoveByName(match[2]);
      nodes.push(
        target && onOpen ? (
          <button
            key={k}
            type="button"
            className="move-ref"
            onClick={() => onOpen(target)}
            title={`Відкрити хід «${target.name}»`}
          >
            {match[2]}
          </button>
        ) : (
          <em key={k}>{match[2]}</em>
        ),
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** Розмітка геть — для однорядкових підсумків шпаргалки. */
export function plain(text: string): string {
  return text.replace(/\*/g, '');
}

/**
 * Перше речення результату одним рядком — для шпаргалки й друку.
 * «оберіть одне:» з наступним списком стає «оберіть одне: …».
 */
export function outcomeSummary(blocks: MoveBlock[]): string {
  const first = blocks.find((block): block is string => typeof block === 'string') ?? '';
  const text = plain(first);
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  return sentence.endsWith(':') ? `${sentence} …` : sentence;
}
