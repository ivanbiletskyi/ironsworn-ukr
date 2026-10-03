// П'ять характеристик у ряд, як угорі паперового аркуша.
// Клік по великому числу відкриває панель кидка з полем додатків.

import { useEffect, useState } from 'react';
import type { AttrKey, Character } from '../../utils/character/types';
import { ATTR_KEYS, MAX_ATTR, MIN_ATTR } from '../../utils/character/types';
import { ATTR_LABELS, UI, formatScaleValue } from '../../utils/character/labels';

const MAX_ADDS = 5;

/** «Ходи з Вістрям»: назва атрибута в орудному відмінку. */
const ATTR_INSTRUMENTAL: Record<AttrKey, string> = {
  edge: 'Вістрям',
  heart: 'Серцем',
  iron: 'Залізом',
  shadow: 'Тінню',
  wits: 'Розумом',
};

/**
 * Степери повідомляють крок, а не готове значення: нове значення рахується
 * від актуального стану в reducer'і. Інакше кілька кліків, що потрапили в
 * один такт React, прочитали б однакове застаріле значення й дали +1 замість +3.
 */
const AttributeBoxes = ({
  character,
  onStep,
  onRoll,
  onShowMoves,
}: {
  character: Character;
  onStep: (attribute: AttrKey, delta: number) => void;
  onRoll: (attribute: AttrKey, adds: number) => void;
  /** «Ходи з Вістрям →»: шторка ходів із фільтром за цим атрибутом. */
  onShowMoves?: (attribute: AttrKey) => void;
}) => {
  const [selected, setSelected] = useState<AttrKey | null>(null);
  const [adds, setAdds] = useState(0);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const select = (attribute: AttrKey) => {
    setAdds(0);
    setSelected(current => (current === attribute ? null : attribute));
  };

  return (
    <div className="attribute-section">
      <div className="attribute-section__header">
        <button
          type="button"
          className={`attribute-edit-toggle${editMode ? ' attribute-edit-toggle--active' : ''}`}
          onClick={() => setEditMode(current => !current)}
          aria-pressed={editMode}
        >
          {editMode ? `✓ ${UI.doneEditingAttributes}` : `✎ ${UI.editAttributes}`}
        </button>
      </div>
      <div className="attribute-boxes">
        {ATTR_KEYS.map(attribute => {
          const value = character.attributes[attribute];
          return (
            <div
              key={attribute}
              className={`attribute-box${selected === attribute ? ' attribute-box--selected' : ''}`}
            >
              <h3 className="attribute-box__title">{ATTR_LABELS[attribute]}</h3>
              <button
                type="button"
                className="attribute-box__value"
                onClick={() => select(attribute)}
                aria-expanded={selected === attribute}
                aria-label={`${UI.roll}: ${ATTR_LABELS[attribute]}`}
              >
                {formatScaleValue(value)}
              </button>
              {editMode && (
                <div className="attribute-box__steppers">
                  <button
                    type="button"
                    className="stepper"
                    onClick={() => onStep(attribute, -1)}
                    disabled={value <= MIN_ATTR}
                    aria-label={`${ATTR_LABELS[attribute]}: зменшити`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="stepper"
                    onClick={() => onStep(attribute, 1)}
                    disabled={value >= MAX_ATTR}
                    aria-label={`${ATTR_LABELS[attribute]}: збільшити`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Панель — окремий ряд, а не спливаюче вікно над плиткою: так вона
          не вилазить за край на вузьких екранах. */}
      {selected && (
        <div className="roll-panel">
          <span className="roll-panel__target">
            {UI.rollWith} <strong>{ATTR_LABELS[selected]}</strong>{' '}
            {formatScaleValue(character.attributes[selected])}
          </span>
          <span className="roll-panel__adds">
            {UI.adds}
            <button
              type="button"
              className="stepper"
              onClick={() => setAdds(current => Math.max(0, current - 1))}
              disabled={adds <= 0}
              aria-label={`${UI.adds}: зменшити`}
            >
              −
            </button>
            <output className="roll-panel__adds-value">{formatScaleValue(adds)}</output>
            <button
              type="button"
              className="stepper"
              onClick={() => setAdds(current => Math.min(MAX_ADDS, current + 1))}
              disabled={adds >= MAX_ADDS}
              aria-label={`${UI.adds}: збільшити`}
            >
              +
            </button>
          </span>
          <button
            type="button"
            className="roll-button"
            onClick={() => {
              onRoll(selected, adds);
              // Кидок закриває панель: результат уже спливає карткою, а ряд,
              // що лишився відкритим, лише зсовує аркуш і виглядає так, ніби
              // кидок не відбувся.
              setSelected(null);
            }}
          >
            🎲 {UI.roll}
          </button>
          {onShowMoves && (
            <button
              type="button"
              className="roll-panel__moves"
              onClick={() => {
                onShowMoves(selected);
                setSelected(null);
              }}
            >
              Ходи з {ATTR_INSTRUMENTAL[selected]} →
            </button>
          )}
          <button
            type="button"
            className="roll-panel__close"
            onClick={() => setSelected(null)}
            aria-label={UI.closeRollPanel}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default AttributeBoxes;
