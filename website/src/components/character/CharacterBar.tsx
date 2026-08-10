// Меню персонажів: перемикач, створення, дублювання, видалення
// та експорт/імпорт JSON. Живе у випадному меню під кнопкою-бургером
// у заголовку зони «Персонаж».

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const menuRoot = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Закрите меню забуває про підтвердження й помилку: наступне відкриття
      починається з чистого списку дій. */
  const closeMenu = useCallback(() => {
    setOpen(false);
    setConfirmingRemove(false);
    setError(null);
  }, []);

  // Клік поза меню й Escape закривають його — як і в будь-якому випадному меню.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRoot.current?.contains(event.target as Node)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeMenu]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onImport(await file.text());
      closeMenu(); // персонаж уже на аркуші — меню більше нічого не тримає
    } catch (cause) {
      // Помилка лишає меню відкритим: інакше пояснення нікому не видно.
      setError(cause instanceof Error ? cause.message : UI.importFailed);
    }
  };

  /** Дія, після якої меню вже не потрібне: аркуш змінився. */
  const runAndClose = (action: () => void) => () => {
    action();
    closeMenu();
  };

  return (
    <div className="character-menu" ref={menuRoot}>
      <button
        type="button"
        className={`character-menu__toggle${open ? ' character-menu__toggle--open' : ''}`}
        aria-label={UI.characterMenu}
        title={UI.characterMenu}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : setOpen(true))}
      >
        <span className="character-menu__line" />
        <span className="character-menu__line" />
        <span className="character-menu__line" />
      </button>

      {open && (
        <div className="character-bar">
          {/* Список, а не <select>: власне вікно нативного списку відкривається
              поверх меню й стає на місце, яке ми не контролюємо жодним CSS —
              на телефоні воно від'їжджало від самого поля. Рядки меню ще й
              позбавляють гравця другого дотику: персонаж перемикається одразу. */}
          <ul className="character-bar__list" aria-label={UI.chooseCharacter}>
            {store.characters.map((entry, index) => {
              const active = entry.id === character.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`character-bar__item${active ? ' character-bar__item--active' : ''}`}
                    aria-current={active}
                    onClick={() => {
                      closeMenu();
                      onSelect(entry.id);
                    }}
                  >
                    {entry.name.trim() || `${UI.unnamedCharacter} ${index + 1}`}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="character-bar__actions">
            <button type="button" className="bar-button" onClick={runAndClose(onAdd)}>
              {UI.newCharacter}
            </button>
            <button type="button" className="bar-button" onClick={runAndClose(onDuplicate)}>
              {UI.duplicate}
            </button>
            <button
              type="button"
              className="bar-button"
              onClick={runAndClose(() => downloadCharacter(character))}
            >
              {UI.export}
            </button>
            {/* Меню лишається відкритим: діалог вибору файла ще попереду. */}
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
                  onClick={runAndClose(() => onRemove(character.id))}
                >
                  {UI.confirmRemove}
                </button>
                <button
                  type="button"
                  className="bar-button"
                  onClick={() => setConfirmingRemove(false)}
                >
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

          {error && <p className="character-bar__error">{error}</p>}
        </div>
      )}

      {/* Поле файла живе поза меню: інакше закриття меню під час системного
          діалогу забрало б елемент, який має прийняти вибраний файл. */}
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
    </div>
  );
};

export default CharacterBar;
