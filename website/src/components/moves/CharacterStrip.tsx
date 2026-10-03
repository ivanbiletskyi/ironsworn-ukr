// Рядок стану персонажа вгорі шторки. На телефоні шторка закриває аркуш,
// тож лише тут видно, що змінили кидок і чіпи наслідків.

import type { Character } from '../../utils/character/types';
import { STAT_LABELS } from '../../utils/character/labels';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export default function CharacterStrip({ character }: { character: Character }) {
  return (
    <div className="character-strip" aria-label="Стан персонажа">
      <span className="character-strip__name">{character.name.trim() || 'Без імені'}</span>
      <span className="character-strip__stats">
        <span>
          Імпульс <strong data-testid="strip-momentum">{signed(character.momentum)}</strong>
        </span>
        <span>
          {STAT_LABELS.health} <strong data-testid="strip-health">{character.stats.health}</strong>
        </span>
        <span>
          {STAT_LABELS.spirit} <strong data-testid="strip-spirit">{character.stats.spirit}</strong>
        </span>
        <span>
          {STAT_LABELS.supply} <strong data-testid="strip-supply">{character.stats.supply}</strong>
        </span>
      </span>
    </div>
  );
}
