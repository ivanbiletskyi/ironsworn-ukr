// Видалення рядка зі шкалою — спільне для присяг і стосунків.
// Хук віддає готову розмітку, а не лише стан, бо кнопка «×» стоїть у рядку
// назви (через проп `action`), а питання — окремим рядком під шкалою: одним
// компонентом їх не обгорнути.

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Track } from '../../utils/character/types';
import { isEmptyTrack } from '../../utils/character/storage';
import { confirmTrackRemoval, UI } from '../../utils/character/labels';

export function useTrackRemoval({
  track,
  label,
  removeLabel,
  isOnly,
  onRemove,
}: {
  track: Track;
  /** Назва шкали або запасна на кшталт «Присяга 2» — для питання й aria. */
  label: string;
  /** «Видалити присягу» / «Видалити стосунок». */
  removeLabel: string;
  /** Єдиний рядок у зоні — його порожню шкалу прибирати нема сенсу. */
  isOnly: boolean;
  onRemove: () => void;
}): { action?: ReactNode; confirm: ReactNode } {
  const [confirming, setConfirming] = useState(false);

  const empty = isEmptyTrack(track);

  // Порожня шкала — це щойно натиснутий «+»: прибираємо без питань.
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
        <span className="track-row__confirm-text">{confirmTrackRemoval(label)}</span>
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
