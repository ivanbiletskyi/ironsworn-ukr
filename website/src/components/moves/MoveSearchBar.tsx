// Липка смуга пошуку: поле «Що ви робите?», чіпи категорій і статів,
// «Тільки основні». На телефоні чіпи статів сховано за «Фільтри», щоб не
// займати другий рядок.

import { forwardRef, useState } from 'react';
import type { AttrKey } from '../../utils/character/types';
import { ATTR_LABELS } from '../../utils/character/labels';
import type { MoveCategory } from '../../utils/moves';
import { CATEGORY_META, MOVE_CATEGORIES } from '../../utils/moves';
import { CategoryIcon } from './MoveBits';

const ATTRS: AttrKey[] = ['edge', 'heart', 'iron', 'shadow', 'wits'];

export interface MoveSearchBarProps {
  query: string;
  onQuery: (query: string) => void;
  onSubmit: () => void;
  category: MoveCategory | null;
  onCategory: (category: MoveCategory | null) => void;
  stat: AttrKey | null;
  onStat: (stat: AttrKey | null) => void;
  coreOnly: boolean;
  onCoreOnly: (value: boolean) => void;
  /** На телефоні статам і «основним» дається окремий рядок за кнопкою. */
  compact: boolean;
  hidden?: boolean;
}

const MoveSearchBar = forwardRef<HTMLInputElement, MoveSearchBarProps>(function MoveSearchBar(
  { query, onQuery, onSubmit, category, onCategory, stat, onStat, coreOnly, onCoreOnly, compact, hidden = false },
  inputRef,
) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = (stat ? 1 : 0) + (coreOnly ? 1 : 0);
  const showSecondRow = !compact || filtersOpen;

  return (
    <div className={`move-search ${hidden ? 'move-search--hidden' : ''}`}>
      <form
        className="move-search__form"
        role="search"
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <svg className="move-search__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="6.8" cy="6.8" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.4 10.4 L14.2 14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="move-search__input"
          value={query}
          onChange={event => onQuery(event.target.value)}
          placeholder="Що ви робите? тікаю, лікую, дуель…"
          aria-label="Пошук ходу"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" className="move-search__clear" onClick={() => onQuery('')} aria-label="Очистити пошук">
            ×
          </button>
        )}
        {compact && (
          <button
            type="button"
            className={`move-search__filters ${activeFilters ? 'is-active' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(open => !open)}
          >
            Фільтри{activeFilters ? ` · ${activeFilters}` : ''}
          </button>
        )}
      </form>

      <div className="chip-row chip-row--categories" role="group" aria-label="Категорія">
        <button
          type="button"
          className={`chip ${category === null ? 'is-active' : ''}`}
          aria-pressed={category === null}
          onClick={() => onCategory(null)}
        >
          Усі
        </button>
        {MOVE_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`chip chip--${cat} ${category === cat ? 'is-active' : ''}`}
            aria-pressed={category === cat}
            onClick={() => onCategory(category === cat ? null : cat)}
          >
            <CategoryIcon category={cat} size={16} />
            {CATEGORY_META[cat].short}
          </button>
        ))}
      </div>

      {showSecondRow && (
        <div className="chip-row chip-row--stats" role="group" aria-label="Стат">
          {ATTRS.map(attr => (
            <button
              key={attr}
              type="button"
              className={`chip chip--stat ${stat === attr ? 'is-active' : ''}`}
              aria-pressed={stat === attr}
              onClick={() => onStat(stat === attr ? null : attr)}
            >
              {ATTR_LABELS[attr]}
            </button>
          ))}
          <button
            type="button"
            className={`chip chip--core ${coreOnly ? 'is-active' : ''}`}
            aria-pressed={coreOnly}
            onClick={() => onCoreOnly(!coreOnly)}
          >
            Тільки основні
          </button>
        </div>
      )}
    </div>
  );
});

export default MoveSearchBar;
