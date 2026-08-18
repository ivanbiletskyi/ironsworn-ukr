// Дерево блоків картки: вступні рядки, умови, навички з кружечками, порожні
// лінії для вписування і вкладені списки — і з простими маркерами «•», і з
// власними кружечками («Маска»).
//
// Один рекурсивний компонент, бо вкладений кружечок — це той самий блок,
// лише глибший шлях: '0.2' замість '0' (PROFILES_PLAN.md §6.2).

import type { ProfileBlock } from '../../utils/profiles';
import { abilityName } from '../../utils/character/profiles';
import { UI } from '../../utils/character/labels';
import { richText } from '../../utils/character/richText';

export interface ProfileBlocksProps {
  blocks: ProfileBlock[];
  /** Шлях батьківського блока; порожній — верхній рівень. */
  prefix?: string;
  marked: string[];
  fields: Record<string, string>;
  onToggle?: (path: string) => void;
  onField?: (id: string, value: string) => void;
  /** Прев'ю у вікні вибору: кружечки й лінії показуємо, але не редагуємо. */
  readOnly?: boolean;
}

const ProfileBlocks = ({
  blocks,
  prefix = '',
  marked,
  fields,
  onToggle,
  onField,
  readOnly = false,
}: ProfileBlocksProps) => (
  <div className="profile-blocks">
    {blocks.map((block, index) => {
      const path = prefix === '' ? String(index) : `${prefix}.${index}`;
      return (
        <div key={path} className="profile-block">
          <ProfileBlockBody
            block={block}
            path={path}
            marked={marked}
            fields={fields}
            onToggle={onToggle}
            onField={onField}
            readOnly={readOnly}
          />
          {block.children && block.children.length > 0 && (
            <ProfileBlocks
              blocks={block.children}
              prefix={path}
              marked={marked}
              fields={fields}
              onToggle={onToggle}
              onField={onField}
              readOnly={readOnly}
            />
          )}
        </div>
      );
    })}
  </div>
);

const ProfileBlockBody = ({
  block,
  path,
  marked,
  fields,
  onToggle,
  onField,
  readOnly,
}: {
  block: ProfileBlock;
  path: string;
} & Omit<ProfileBlocksProps, 'blocks' | 'prefix'>) => {
  // Порожня лінія картки: «Ім'я:», «Атрибут:», «Ремесло:».
  if (block.field) {
    const { id, label } = block.field;
    return (
      <p className="profile-field">
        <span className="profile-field__label">{label}</span>
        {readOnly ? (
          <span className="profile-field__blank" aria-hidden="true" />
        ) : (
          <input
            className="profile-field__input"
            value={fields[id] ?? ''}
            aria-label={label}
            onChange={event => onField?.(id, event.target.value)}
          />
        )}
      </p>
    );
  }

  const text = block.text ?? '';

  // Навичка з кружечком. Ціль дотику — весь рядок, а не сам кружечок:
  // так само зроблено зі слабкостями (§6.2).
  if (block.mark) {
    const open = marked.includes(path);
    const state = open ? UI.abilityOpen : UI.abilityLocked;
    const className = `profile-mark${open ? ' profile-mark--open' : ''}`;

    if (readOnly) {
      return (
        <p className={className}>
          <span className="profile-mark__circle" aria-hidden="true" />
          <span className="profile-mark__text">{richText(text)}</span>
        </p>
      );
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-label={`${abilityName(text)}: ${state}`}
        className={className}
        onClick={() => onToggle?.(path)}
      >
        <span className="profile-mark__circle" aria-hidden="true" />
        <span className="profile-mark__text">{richText(text)}</span>
      </button>
    );
  }

  // Вкладений вибір без кружечка — його не відкривають досвідом.
  if (block.bullet) {
    return (
      <p className="profile-bullet">
        <span className="profile-bullet__dot" aria-hidden="true" />
        <span>{richText(text)}</span>
      </p>
    );
  }

  // Вступний рядок або умова («Щойно ви стали скаліченим…») — просто абзац.
  return <p className="profile-line">{richText(text)}</p>;
};

export default ProfileBlocks;
