// Панель над аркушем: перемикач персонажів, створення, дублювання,
// видалення та експорт/імпорт JSON.

import { useRef, useState } from 'react';
import type { Character, CharacterStore } from '../../utils/character/types';
import { downloadCharacter } from '../../utils/character/storage';
import { UI } from '../../utils/character/labels';

const CharacterBar = ({
  store,
  character,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onImport,
}: {
  store: CharacterStore;
  character: Character;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: (id: string) => void;
  onImport: (text: string) => void;
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onImport(await file.text());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : UI.importFailed);
    }
  };

  return (
    <div className="character-bar">
      <select
        className="character-bar__select"
        value={character.id}
        aria-label={UI.chooseCharacter}
        onChange={event => {
          setConfirmingRemove(false);
          onSelect(event.target.value);
        }}
      >
        {store.characters.map((entry, index) => (
          <option key={entry.id} value={entry.id}>
            {entry.name.trim() || `${UI.unnamedCharacter} ${index + 1}`}
          </option>
        ))}
      </select>

      <div className="character-bar__actions">
        <button type="button" className="bar-button" onClick={onAdd}>
          {UI.newCharacter}
        </button>
        <button type="button" className="bar-button" onClick={onDuplicate}>
          {UI.duplicate}
        </button>
        <button type="button" className="bar-button" onClick={() => downloadCharacter(character)}>
          {UI.export}
        </button>
        <button type="button" className="bar-button" onClick={() => fileInput.current?.click()}>
          {UI.import}
        </button>

        {/* Підтвердження вбудоване, а не через confirm(): системне вікно
            не стилізується і блокує сторінку. */}
        {confirmingRemove ? (
          <span className="character-bar__confirm">
            <button
              type="button"
              className="bar-button bar-button--danger"
              onClick={() => {
                setConfirmingRemove(false);
                onRemove(character.id);
              }}
            >
              {UI.confirmRemove}
            </button>
            <button type="button" className="bar-button" onClick={() => setConfirmingRemove(false)}>
              {UI.cancel}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="bar-button bar-button--danger"
            onClick={() => setConfirmingRemove(true)}
          >
            {UI.remove}
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={event => {
          void handleFile(event.target.files?.[0]);
          event.target.value = ''; // щоб той самий файл можна було обрати вдруге
        }}
      />

      {error && <p className="character-bar__error">{error}</p>}
    </div>
  );
};

export default CharacterBar;
