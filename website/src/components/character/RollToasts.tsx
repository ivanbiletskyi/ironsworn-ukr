// Картки кидків як сповіщення macOS: стос у правому верхньому куті, найновіша
// зверху. Прибрати картку можна свайпом убік або кнопкою «ОК»; поки її не
// прибрали, вона лишається на екрані, а нові кидки лягають над нею.

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ActionRollResult, SheetRoll } from '../../utils/character/diceEngine';
import RollResultCard from './RollResultCard';

/** Скільки карток тримати на екрані. Стос не прокручується, тож більше трьох
    не влізло б у висоту телефона; історія кидків усе одно ціла в журналі,
    тож найстаріші картки можна відпускати. */
export const MAX_TOASTS = 3;

/** Від якої відстані (px) горизонтальний жест зараховується як свайп. */
const SWIPE_THRESHOLD = 80;

/** Скільки триває відліт картки — те саме значення, що й transition у CSS. */
const EXIT_MS = 200;

/** Свайп на цю відстань гасить картку майже повністю — жест видно ще до кінця. */
const FADE_DISTANCE = 320;

const RollToast = ({
  roll,
  burnPreview,
  onBurn,
  onDismiss,
}: {
  roll: SheetRoll;
  /** Наслідок спалення, або null, якщо воно недоступне для цієї картки. */
  burnPreview: ActionRollResult | null;
  onBurn: () => void;
  onDismiss: (id: string) => void;
}) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /** Позиція вказівника на початку жесту; null — коли жесту немає. */
  const origin = useRef<number | null>(null);

  // Картка спершу відлітає й лише потім зникає зі стосу, тож зі списку її
  // прибирає таймер, а не сам клік.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onDismiss(roll.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDismiss, roll.id]);

  const endDrag = (distance: number) => {
    origin.current = null;
    setDragging(false);
    if (Math.abs(distance) >= SWIPE_THRESHOLD) setLeaving(true);
    else setOffset(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Кнопки на картці лишаються кнопками: тягнути картку за «Спалити
    // імпульс» чи «ОК» не можна, інакше натиснути їх було б важко.
    if (leaving || (event.target as HTMLElement).closest('button')) return;
    origin.current = event.clientX;
    setDragging(true);
    // Захоплення тримає жест на картці, навіть коли палець вийшов за її межі.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (origin.current === null) return;
    setOffset(event.clientX - origin.current);
  };

  const handlePointerUp = () => {
    if (origin.current === null) return;
    endDrag(offset);
  };

  // Убік, куди тягнули; картка без жесту (кнопка «ОК») відлітає праворуч.
  const exitDirection = offset < 0 ? -1 : 1;

  return (
    <div className={`roll-toast${leaving ? ' roll-toast--leaving' : ''}`}>
      <div
        className={`roll-toast__card${dragging ? ' roll-toast__card--dragging' : ''}`}
        style={
          leaving
            ? { transform: `translateX(${exitDirection * 120}%)`, opacity: 0 }
            : {
                transform: offset === 0 ? undefined : `translateX(${offset}px)`,
                opacity: 1 - Math.min(Math.abs(offset) / FADE_DISTANCE, 0.75),
              }
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <RollResultCard
          roll={roll}
          burnPreview={burnPreview}
          onBurn={onBurn}
          onDismiss={() => setLeaving(true)}
        />
      </div>
    </div>
  );
};

/**
 * Стос карток. Спалення пропонується лише на найновішому кидку: імпульс
 * спалюють одразу після кидка, а не через три кидки, коли картка ще висить.
 */
const RollToasts = ({
  rolls,
  burnPreview,
  onBurn,
  onDismiss,
}: {
  /** Найновіший кидок — перший. */
  rolls: SheetRoll[];
  burnPreview: ActionRollResult | null;
  onBurn: () => void;
  onDismiss: (id: string) => void;
}) => {
  if (rolls.length === 0) return null;

  return (
    <div className="roll-toasts" aria-live="polite">
      {rolls.map((roll, index) => (
        // key за id: спалення підміняє картку новим записом, і перемонтування
        // програє анімацію граників ще раз.
        <RollToast
          key={roll.id}
          roll={roll}
          burnPreview={index === 0 ? burnPreview : null}
          onBurn={onBurn}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

export default RollToasts;
