// Режим «Тренування»: ходи запамʼятовуються через тригери, тож картки
// тренують саме звʼязок «ситуація ↔ хід».
//
// «Ситуація → хід» — тригер і 4 назви з тієї ж категорії. «Хід → кидок» —
// назва, гравець згадує стат і результати, перевертає й оцінює себе сам.
// Проста система Лейтнера з 3 коробками: «не знав» повертає хід у першу,
// і в сесії він трапляється частіше.

import { useState } from 'react';
import type { Move, MoveCategory } from '../../utils/moves';
import { CATEGORY_META, MOVES, MOVE_CATEGORIES } from '../../utils/moves';
import { CategoryIcon, Diamonds, RollBadge } from './MoveBits';
import { OUTCOME_KEYS, OUTCOME_TEXT } from './outcomes';
import { outcomeSummary, plain } from './moveMarkup';
import { useTrainerBoxes } from './useMovesStorage';
import { SESSION_SIZE, buildDeck, choicesFor } from './trainerDeck';

type Mode = 'situation' | 'roll';

interface Session {
  mode: Mode;
  deck: Move[];
  index: number;
  knew: number;
  choices: Move[];
  picked: string | null;
  flipped: boolean;
}

export default function MoveTrainer() {
  const { boxes, answer, resetBoxes } = useTrainerBoxes();
  const [mode, setMode] = useState<Mode>('situation');
  const [categories, setCategories] = useState<MoveCategory[]>([...MOVE_CATEGORIES]);
  const [coreOnly, setCoreOnly] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const pool = MOVES.filter(move => categories.includes(move.category) && (!coreOnly || move.core));
  const learned = MOVES.filter(move => boxes[move.id] === 3).length;

  const start = () => {
    const deck = buildDeck(pool, boxes, SESSION_SIZE);
    if (deck.length === 0) return;
    setSession({ mode, deck, index: 0, knew: 0, choices: choicesFor(deck[0]), picked: null, flipped: false });
  };

  const record = (knew: boolean, picked: string | null = null) => {
    if (!session) return;
    answer(session.deck[session.index].id, knew);
    setSession({ ...session, knew: session.knew + (knew ? 1 : 0), picked, flipped: true });
  };

  const next = () => {
    if (!session) return;
    const index = session.index + 1;
    setSession({
      ...session,
      index,
      picked: null,
      flipped: false,
      choices: index < session.deck.length ? choicesFor(session.deck[index]) : [],
    });
  };

  if (!session) {
    return (
      <div className="trainer">
        <h2 className="trainer__title">Тренування</h2>
        <p className="trainer__lead">
          {SESSION_SIZE} карток за сесію. Ходи, яких ви не знали, повертаються частіше. Вивчено:{' '}
          <strong>
            {learned} з {MOVES.length}
          </strong>
          .
        </p>
        <fieldset className="trainer__field">
          <legend>Режим</legend>
          <label className="trainer__option">
            <input type="radio" name="trainer-mode" checked={mode === 'situation'} onChange={() => setMode('situation')} />
            Ситуація → хід
          </label>
          <label className="trainer__option">
            <input type="radio" name="trainer-mode" checked={mode === 'roll'} onChange={() => setMode('roll')} />
            Хід → кидок
          </label>
        </fieldset>
        <fieldset className="trainer__field">
          <legend>Категорії</legend>
          {MOVE_CATEGORIES.map(category => (
            <label key={category} className="trainer__option">
              <input
                type="checkbox"
                checked={categories.includes(category)}
                onChange={() =>
                  setCategories(prev =>
                    prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category],
                  )
                }
              />
              <CategoryIcon category={category} size={16} />
              {CATEGORY_META[category].short}
            </label>
          ))}
          <label className="trainer__option">
            <input type="checkbox" checked={coreOnly} onChange={() => setCoreOnly(v => !v)} />
            Тільки основні
          </label>
        </fieldset>
        <div className="trainer__actions">
          <button type="button" className="trainer__primary" onClick={start} disabled={pool.length === 0}>
            Почати
          </button>
          {Object.keys(boxes).length > 0 && (
            <button type="button" className="trainer__secondary" onClick={resetBoxes}>
              Скинути прогрес
            </button>
          )}
        </div>
      </div>
    );
  }

  if (session.index >= session.deck.length) {
    return (
      <div className="trainer">
        <h2 className="trainer__title">Сесію завершено</h2>
        <p className="trainer__score" aria-live="polite">
          Знали {session.knew} з {session.deck.length}
        </p>
        <div className="trainer__actions">
          <button type="button" className="trainer__primary" onClick={start}>
            Ще сесія
          </button>
          <button type="button" className="trainer__secondary" onClick={() => setSession(null)}>
            Налаштування
          </button>
        </div>
      </div>
    );
  }

  const move = session.deck[session.index];
  const progress = `${session.index + 1} / ${session.deck.length}`;

  return (
    <div className="trainer">
      <div className="trainer__meta">
        <span>{session.mode === 'situation' ? 'Ситуація → хід' : 'Хід → кидок'}</span>
        <span>{progress}</span>
      </div>

      <div className={`trainer-card trainer-card--${move.category}`}>
        {session.mode === 'situation' ? (
          <>
            <p className="trainer-card__prompt">Який це хід?</p>
            <p className="trainer-card__situation">Коли… {plain(move.trigger)}</p>
            <div className="trainer-card__choices" role="group" aria-label="Варіанти">
              {session.choices.map(choice => {
                const state = !session.flipped
                  ? ''
                  : choice.id === move.id
                    ? 'is-correct'
                    : choice.id === session.picked
                      ? 'is-wrong'
                      : '';
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`trainer-choice ${state}`}
                    disabled={session.flipped}
                    onClick={() => record(choice.id === move.id, choice.id)}
                  >
                    {choice.name}
                  </button>
                );
              })}
            </div>
            {session.flipped && (
              <p className="trainer-card__verdict" aria-live="polite">
                {session.picked === move.id ? 'Так!' : `Ні — це «${move.name}».`}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="trainer-card__prompt">Що кидати і що буває?</p>
            <p className="trainer-card__name">
              <CategoryIcon category={move.category} size={22} />
              {move.name}
            </p>
            {session.flipped ? (
              <div className="trainer-card__back">
                <p>
                  <RollBadge move={move} /> {move.trigger}
                </p>
                {move.outcomes ? (
                  <ul className="cheat-card__outcomes">
                    {OUTCOME_KEYS.map(key => (
                      <li key={key} className={`cheat-card__outcome cheat-card__outcome--${key}`}>
                        <Diamonds outcome={key} />
                        <span>
                          <strong>{OUTCOME_TEXT[key].short}:</strong> {outcomeSummary(move.outcomes![key])}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{plain(move.lead.find((b): b is string => typeof b === 'string') ?? '')}</p>
                )}
              </div>
            ) : (
              <button type="button" className="trainer__primary" onClick={() => setSession({ ...session, flipped: true })}>
                Перевернути
              </button>
            )}
          </>
        )}
      </div>

      <div className="trainer__actions">
        {session.mode === 'roll' && session.flipped && session.picked === null && (
          <>
            <button type="button" className="trainer__primary" onClick={() => { record(true, 'self'); }}>
              Знав
            </button>
            <button type="button" className="trainer__secondary" onClick={() => { record(false, 'self-miss'); }}>
              Не знав
            </button>
          </>
        )}
        {session.picked !== null && (
          <button type="button" className="trainer__primary" onClick={next} autoFocus>
            Далі →
          </button>
        )}
      </div>
    </div>
  );
}
