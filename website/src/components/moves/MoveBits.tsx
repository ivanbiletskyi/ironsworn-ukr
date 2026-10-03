// Дрібні спільні шматки довідника: піктограма категорії, ромби результату,
// бейдж кидка, зірочка й підсвічений збіг.

import type { ReactNode } from 'react';
import type { Move, MoveCategory } from '../../utils/moves';
import { rollBadge } from '../../utils/moves';
import type { OutcomeKey } from './outcomes';
import { matchRanges } from '../../utils/moves/search';
import adventureIcon from '../../assets/moves/adventure.png';
import relationshipIcon from '../../assets/moves/relationship.png';
import combatIcon from '../../assets/moves/combat.png';
import sufferIcon from '../../assets/moves/suffer.png';
import questIcon from '../../assets/moves/quest.png';
import fateIcon from '../../assets/moves/fate.png';

/**
 * Петрогліфи вирізано з ілюстрацій грального набору
 * (scripts/crop-move-icons.py): вогнище, поселення, спис, змій, коло з
 * хрестом, оракул. PNG — лише маска, колір дає `--cat-*`.
 */
const ICONS: Record<MoveCategory, string> = {
  adventure: adventureIcon,
  relationship: relationshipIcon,
  combat: combatIcon,
  suffer: sufferIcon,
  quest: questIcon,
  fate: fateIcon,
};

export function CategoryIcon({ category, size = 20 }: { category: MoveCategory; size?: number }) {
  const url = `url(${ICONS[category]})`;
  return (
    <span
      className={`cat-icon cat-icon--${category}`}
      style={{ width: size, height: size, maskImage: url, WebkitMaskImage: url }}
      aria-hidden="true"
    />
  );
}

/**
 * Два ромби — два кубики виклику: скільки d10 побито, стільки ромбів
 * заповнено. Колір дублює форму, тож ромби `aria-hidden` — слово поруч.
 */
export function Diamonds({ outcome }: { outcome: OutcomeKey }) {
  const filled = outcome === 'strong' ? 2 : outcome === 'weak' ? 1 : 0;
  return (
    <span className={`diamonds diamonds--${outcome}`} aria-hidden="true">
      {[0, 1].map(i => (
        <svg key={i} viewBox="0 0 10 10" width="10" height="10">
          <path
            d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z"
            fill={i < filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      ))}
    </span>
  );
}

export function RollBadge({ move }: { move: Move }) {
  return <span className={`roll-badge roll-badge--${move.rollKind}`}>{rollBadge(move)}</span>;
}

export function StarButton({
  move,
  active,
  onToggle,
}: {
  move: Move;
  active: boolean;
  onToggle: (id: string) => void;
}) {
  const label = active ? `Відкріпити «${move.name}»` : `Закріпити «${move.name}»`;
  return (
    <button
      type="button"
      className={`star-btn ${active ? 'star-btn--on' : ''}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(move.id);
      }}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

/** Слова, що починаються з основ запиту, — у `<mark>`. */
export function Highlight({ text, stems }: { text: string; stems: string[] }) {
  const ranges = matchRanges(text, stems);
  if (ranges.length === 0) return <>{text}</>;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<mark key={i}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
