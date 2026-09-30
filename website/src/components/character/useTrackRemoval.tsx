// Видалення рядка з кнопкою «×» — спільне для присяг і переліку стосунків.
// Хук віддає готову розмітку, а не лише стан, бо кнопка «×» стоїть у рядку
// назви (через проп `action`), а питання — окремим рядком під ним: одним
// компонентом їх не обгорнути.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../../utils/character/labels';

export function useTrackRemoval({
  empty,
  label,
  removeLabel,
  confirmText,
  isOnly,
  onRemove,
}: {
  /** Рядок без роботи гравця: порожня шкала чи порожнє ім'я стосунку. */
  empty: boolean;
  /** Назва або запасна на кшталт «Присяга 2» — для aria. */
  label: string;
  /** «Видалити присягу» / «Видалити стосунок». */
  removeLabel: string;
  /** Питання перед видаленням непорожнього рядка. */
  confirmText: string;
  /** Єдиний рядок у зоні — його порожнім прибирати нема сенсу. */
  isOnly: boolean;
  onRemove: () => void;
}): { action?: ReactNode; confirm: ReactNode } {
  const [confirming, setConfirming] = useState(false);

  // Порожній рядок — це щойно натиснутий «+»: прибираємо без питань.
  // За назвою чи прогресом стоїть робота гравця, тож питаємо.
  const handleRemove = () => (empty ? onRemove() : setConfirming(true));

  return {
    action:
      isOnly && empty ? undefined : (
        <button
          type="button"
          className="progress-track__remove"
          onClick={handleRemove}
          aria-label={`${removeLabel}: ${label}`}
          title={removeLabel}
        >
          ×
        </button>
      ),

    // Підтвердження вбудоване, як і у панелі персонажів: системне вікно
    // не стилізується і блокує сторінку.
    confirm: confirming && (
      <div className="track-row__confirm">
        <span className="track-row__confirm-text">{confirmText}</span>
        <button
          type="button"
          className="track-button track-button--danger"
          onClick={() => {
            setConfirming(false);
            onRemove();
          }}
        >
          {UI.confirmRemove}
        </button>
        <button type="button" className="track-button" onClick={() => setConfirming(false)}>
          {UI.cancel}
        </button>
      </div>
    ),
  };
}
