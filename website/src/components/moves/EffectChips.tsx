// Чіпи наслідків під текстом ходу: «Імпульс +1 · 4 → 5». Персонаж
// змінюється лише після тапу; застосований чіп пропонує скасувати саме
// цю зміну. Чіп, що нічого не змінить, неактивний і каже чому.

import { useState } from 'react';
import type { Character } from '../../utils/character/types';
import type { Effect } from '../../utils/moves';
import { getMove } from '../../utils/moves';
import { previewEffect, progressTracks, type EffectContext } from '../../utils/moves/play';

export interface AppliedEffect {
  before: Character;
  context: EffectContext;
}

export interface EffectChipsProps {
  effects: Effect[];
  /** Ключ місця в тексті: «weak.1.2»; разом з індексом — ключ чіпа. */
  chipKey: string;
  character: Character;
  applied: Record<string, AppliedEffect>;
  onApply: (key: string, effect: Effect, context: EffectContext) => void;
  onRevert: (key: string, effect: Effect) => void;
  onOpenMove: (moveId: string, harm?: number) => void;
}

function EffectChip({
  effect,
  id,
  character,
  applied,
  onApply,
  onRevert,
  onOpenMove,
}: Omit<EffectChipsProps, 'effects' | 'chipKey' | 'applied'> & {
  effect: Effect;
  id: string;
  applied?: AppliedEffect;
}) {
  const tracks = effect.kind === 'progress' ? progressTracks(character, effect.tracks) : [];
  const [trackId, setTrackId] = useState<string | undefined>(tracks[0]?.id);
  const context: EffectContext = { trackId };

  if (effect.kind === 'move') {
    const preview = previewEffect(character, effect);
    return (
      <button type="button" className="effect-chip effect-chip--move" onClick={() => onOpenMove(effect.moveId, effect.harm)}>
        {preview.label}
      </button>
    );
  }

  if (applied) {
    return (
      <span className="effect-chip effect-chip--applied">
        <span>✓ {previewEffect(applied.before, effect, applied.context).label}</span>
        <button type="button" className="effect-chip__undo" onClick={() => onRevert(id, effect)}>
          Скасувати
        </button>
      </span>
    );
  }

  const preview = previewEffect(character, effect, context);
  const followUp = preview.followUp ? getMove(preview.followUp) : undefined;
  return (
    <span className="effect-chip-wrap">
      <button
        type="button"
        className="effect-chip"
        disabled={Boolean(preview.disabled)}
        title={preview.disabled}
        onClick={() => onApply(id, effect, context)}
      >
        {preview.label}
        {preview.change && <span className="effect-chip__change"> · {preview.change}</span>}
        {preview.disabled && <span className="effect-chip__change"> · {preview.disabled}</span>}
      </button>
      {tracks.length > 1 && (
        <select
          className="effect-chip__track"
          value={trackId}
          onChange={event => setTrackId(event.target.value)}
          aria-label="Шкала"
        >
          {tracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.label}
            </option>
          ))}
        </select>
      )}
      {followUp && (
        <button type="button" className="effect-chip effect-chip--move" onClick={() => onOpenMove(followUp.id)}>
          → {followUp.name}
        </button>
      )}
    </span>
  );
}

export default function EffectChips({ effects, chipKey, applied, ...rest }: EffectChipsProps) {
  if (effects.length === 0) return null;
  return (
    <div className="effect-chips">
      {effects.map((effect, index) => {
        const id = `${chipKey}#${index}`;
        return <EffectChip key={id} id={id} effect={effect} applied={applied[id]} {...rest} />;
      })}
    </div>
  );
}
