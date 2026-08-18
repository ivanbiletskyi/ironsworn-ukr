// `**жирний**` і `*курсив*` із тексту картки профілю — у React-вузли.
//
// Свій, а не `MarkdownRenderer`: той тягне `@uiw/react-markdown-preview`
// і повний markdown, тоді як картці треба рівно два правила — жирні назви
// навичок і курсив назв ходів (PROFILES_PLAN.md §7). І жодного
// `dangerouslySetInnerHTML`: текст іде у вузли, а не в розмітку.

import type { ReactNode } from 'react';

/** Жирний перевіряється першим, інакше `**` розпалося б на два курсиви. */
const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*/g;

export function richText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      match[1] !== undefined ? (
        <strong key={key++}>{match[1]}</strong>
      ) : (
        <em key={key++}>{match[2]}</em>
      ),
    );
    cursor = start + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
