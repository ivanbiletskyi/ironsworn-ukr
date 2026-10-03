// Аркуш персонажа: маршрут, розкладка зон і зведення всіх дій докупи.
// Правила та розкладку описано в CHARACTER_SHEET_PLAN.md.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams, type To } from 'react-router-dom';
import type {
  AttrKey,
  Character,
  CharacterProfile,
  ExtraTrack,
  ProgressTrack,
  TrackKind,
} from '../../utils/character/types';
import { emptyBond, emptyVow, newId } from '../../utils/character/storage';
import type { Profile } from '../../utils/profiles';
import { emptyCharacterProfile, resolveProfiles } from '../../utils/character/profiles';
import type { SheetRoll } from '../../utils/character/diceEngine';
import { commitBurn, previewBurn, rollAction, rollProgress } from '../../utils/character/diceEngine';
import { ATTR_LABELS, SHEET, TRACK_KIND_LABELS, UI } from '../../utils/character/labels';
import { clampAttribute, clampStat, nextXpState, resetMomentum } from '../../utils/character/rules';
import { useCharacterStore } from './useCharacterStore';
import { useSheetLog } from './useSheetLog';
import { useIsNarrow } from './useIsNarrow';
import AttributeBoxes from './AttributeBoxes';
import MomentumTrack from './MomentumTrack';
import StatTracks from './StatTracks';
import DebilitiesBox from './DebilitiesBox';
import RollToasts, { MAX_TOASTS } from './RollToasts';
import RollLog from './RollLog';
import VowRow from './VowRow';
import BondsBox from './BondsBox';
import XpTrack from './XpTrack';
import CharacterBar from './CharacterBar';
import ExtraTracksSection from './ExtraTracksSection';
import ProfilesZone from './ProfilesZone';
import ProfilesFooter from './ProfilesFooter';
import ProfilePicker from './ProfilePicker';
import MovesDrawer, { type DrawerPreset } from '../moves/MovesDrawer';
import type { RollDraft } from '../moves/rollDraft';
import { WIDE_QUERY, useMediaQuery } from '../moves/useMediaQuery';
import type { Move } from '../../utils/moves';
import { getMove } from '../../utils/moves';
import { ATTR_KEYS } from '../../utils/character/types';
import './CharacterSheet.css';

/**
 * Скільки записів історії шторка відкрила поверх аркуша: «×» повертається
 * на стільки кроків, щоб закриття не лишало хвіст ходів у «Назад».
 */
interface DrawerNavState {
  depth?: number;
  backTo?: string;
}

/** Хід прогресу, що відкривається кнопкою «Кинути» на шкалі цього виду. */
const PROGRESS_MOVE: Record<'vow' | 'combat' | 'journey' | 'bond', string> = {
  vow: 'fulfill-your-vow',
  combat: 'end-the-fight',
  journey: 'reach-your-destination',
  bond: 'write-your-epilogue',
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

const vowLabel = (name: string, index: number) => name.trim() || `Присяга ${index + 1}`;

/** Зона аркуша. `area` — ім'я з grid-template-areas. */
const Zone = ({
  area,
  title,
  vertical = false,
  action,
  children,
}: {
  area: string;
  title?: string;
  vertical?: boolean;
  /** Кнопка праворуч від заголовка зони. */
  action?: ReactNode;
  children?: ReactNode;
}) => (
  <section
    className={`sheet-zone sheet-zone--${area}${vertical ? ' sheet-zone--rail' : ''}`}
    style={{ gridArea: area }}
    aria-label={title}
  >
    {title &&
      (action ? (
        <div className="sheet-zone__head">
          <h2 className="sheet-zone__title">{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className="sheet-zone__title">{title}</h2>
      ))}
    <div className="sheet-zone__body">{children ?? <span className="sheet-placeholder" />}</div>
  </section>
);

const CharacterSheetInner = () => {
  const {
    store,
    character,
    patchCharacter,
    updateCharacter,
    selectCharacter,
    addCharacter,
    duplicateActive,
    removeCharacter,
    importFromText,
  } = useCharacterStore();
  const { log, push, remove, clear } = useSheetLog();
  const narrow = useIsNarrow();
  const wide = useMediaQuery(WIDE_QUERY);

  // ── Шторка ходів ────────────────────────────────────────────────────
  // Що відкрито — у URL аркуша: `?moves` — список, `?move=<id>` — картка.
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = useMemo(() => (location.state ?? {}) as DrawerNavState, [location.state]);
  const depth = navState.depth ?? 0;
  const drawerMoveId = params.get('move');
  const drawerOpen = params.has('moves') || drawerMoveId !== null;
  const rawStat = params.get('stat');
  const drawerStat = (ATTR_KEYS as readonly string[]).includes(rawStat ?? '') ? (rawStat as AttrKey) : null;
  const [preset, setPreset] = useState<DrawerPreset | null>(null);

  const drawerLink = useCallback(
    (search: string): To => ({ pathname: location.pathname, search }),
    [location.pathname],
  );

  /** Відкрити список; уже відкрита шторка не множить записів історії. */
  const openDrawer = useCallback(
    (stat?: AttrKey) => {
      const search = stat ? `?moves&stat=${stat}` : '?moves';
      if (drawerOpen) navigate(drawerLink(search), { replace: true, state: navState });
      else navigate(drawerLink(search), { state: { depth: depth + 1 } satisfies DrawerNavState });
    },
    [drawerOpen, navigate, drawerLink, navState, depth],
  );

  /** Відкрити хід з аркуша, з наперед вибраною шкалою чи шкодою. */
  const openMoveFromSheet = (moveId: string, draft: Partial<RollDraft> = {}) => {
    setPreset(current => ({ moveId, draft, nonce: (current?.nonce ?? 0) + 1 }));
    const state: DrawerNavState = { depth: drawerOpen ? depth : depth + 1 };
    navigate(drawerLink(`?move=${moveId}`), { replace: drawerOpen, state: drawerOpen ? navState : state });
  };

  const closeDrawer = useCallback(() => {
    if (depth > 0) navigate(-depth);
    else navigate(drawerLink(''), { replace: true });
  }, [depth, navigate, drawerLink]);

  // Клавіша M відкриває шторку на десктопі.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyM' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || drawerOpen) return;
      event.preventDefault();
      openDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, openDrawer]);

  // На десктопі шторка — колонка праворуч: контент сайту звільняє їй місце,
  // а її верх рівняється по низу шапки сайту.
  const docked = drawerOpen && wide;
  useEffect(() => {
    if (!docked) return;
    const place = () => {
      const bottom = document.querySelector('.navigation')?.getBoundingClientRect().bottom ?? 0;
      document.body.style.setProperty('--moves-drawer-top', `${Math.max(0, bottom)}px`);
    };
    place();
    document.body.classList.add('has-moves-drawer');
    window.addEventListener('resize', place);
    return () => {
      document.body.classList.remove('has-moves-drawer');
      window.removeEventListener('resize', place);
    };
  }, [docked]);

  // Картки-сповіщення живуть лише в межах сесії. Якби вони бралися з журналу,
  // після перезавантаження гравцеві пропонували б спалити імпульс на кидку,
  // зробленому минулого разу. Найновіша — перша.
  const [toasts, setToasts] = useState<SheetRoll[]>([]);

  // Яка карта піднята й чи відкрите вікно вибору — стан екрана, не персонажа:
  // після перезавантаження рука лежить закритою.
  const [raisedProfileId, setRaisedProfileId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dismissToast = useCallback(
    (id: string) => setToasts(current => current.filter(roll => roll.id !== id)),
    [],
  );

  if (!character) return <p className="sheet-empty">{UI.noCharacter}</p>;

  const showRoll = (roll: SheetRoll) => {
    setToasts(current => [roll, ...current].slice(0, MAX_TOASTS));
    push(roll);
  };

  const handleRoll = (attribute: AttrKey, adds: number) =>
    showRoll(
      rollAction(
        ATTR_LABELS[attribute],
        character.attributes[attribute],
        adds,
        character.momentum,
      ),
    );

  const lastRoll = toasts[0];
  const burnPreview =
    lastRoll?.kind === 'action' ? previewBurn(lastRoll, character.momentum) : null;

  const handleBurn = () => {
    if (lastRoll?.kind !== 'action') return;
    const burned = commitBurn(lastRoll, character.momentum);
    if (!burned) return;
    // Спалення переписує саме ту картку, на якій його запропонували: два
    // сповіщення про один кидок нічого не додають. У журналі записи окремі.
    setToasts(current => [burned, ...current.slice(1)]);
    push(burned);
    patchCharacter({ momentum: resetMomentum(character) });
  };

  const handleProgressRoll = (label: string, ticks: number) =>
    showRoll(rollProgress(label, ticks));

  const drawer = drawerOpen && (
    <MovesDrawer
      character={character}
      wide={wide}
      moveId={drawerMoveId}
      initialStat={drawerStat}
      backTo={navState.backTo ? getMove(navState.backTo) : undefined}
      preset={preset}
      linkFor={(move: Move) => drawerLink(`?move=${move.id}`)}
      listLinkState={{ depth: depth + 1 } satisfies DrawerNavState}
      onOpenMove={(move: Move) =>
        navigate(drawerLink(`?move=${move.id}`), {
          state: { depth: depth + 1, backTo: drawerMoveId ?? undefined } satisfies DrawerNavState,
        })
      }
      onShowList={() => navigate(drawerLink('?moves'), { replace: true, state: { depth } })}
      onBack={() => navigate(-1)}
      onClose={closeDrawer}
      onLog={push}
      onCharacter={(update: (current: Character) => Character) => updateCharacter(update)}
    />
  );

  const movesButton = (
    <button
      type="button"
      className="moves-open-button"
      onClick={() => openDrawer()}
      aria-expanded={drawerOpen}
      title="Довідник ходів (M)"
    >
      ⚔ Ходи
    </button>
  );

  /** Присяга змінюється завжди від актуального стану, а не від пропса. */
  const updateVow = (index: number, updater: (vow: ProgressTrack) => ProgressTrack) =>
    updateCharacter(current => ({
      ...current,
      vows: current.vows.map((vow, i) => (i === index ? updater(vow) : vow)),
    }));

  const addVow = () =>
    updateCharacter(current => ({ ...current, vows: [...current.vows, emptyVow()] }));

  /** Прибрати можна будь-яку присягу, але один рядок лишається завжди:
      видалена остання присяга поступається місцем порожній. */
  const removeVow = (id: string) =>
    updateCharacter(current => {
      const vows = current.vows.filter(vow => vow.id !== id);
      return { ...current, vows: vows.length > 0 ? vows : [emptyVow()] };
    });

  /** Шкала стосунків одна на всіх — це просто число на персонажі. */
  const updateBondTicks = (updater: (ticks: number) => number) =>
    updateCharacter(current => ({ ...current, bondTicks: updater(current.bondTicks) }));

  /** Перелік імен додають і прибирають за тими самими правилами, що й присяги. */
  const renameBond = (id: string, name: string) =>
    updateCharacter(current => ({
      ...current,
      bonds: current.bonds.map(bond => (bond.id === id ? { ...bond, name } : bond)),
    }));

  const addBond = () =>
    updateCharacter(current => ({ ...current, bonds: [...current.bonds, emptyBond()] }));

  const removeBond = (id: string) =>
    updateCharacter(current => {
      const bonds = current.bonds.filter(bond => bond.id !== id);
      return { ...current, bonds: bonds.length > 0 ? bonds : [emptyBond()] };
    });

  const updateExtraTrack = (id: string, updater: (track: ExtraTrack) => ExtraTrack) =>
    updateCharacter(current => ({
      ...current,
      extraTracks: current.extraTracks.map(track => (track.id === id ? updater(track) : track)),
    }));

  const addExtraTrack = (kind: TrackKind) =>
    updateCharacter(current => ({
      ...current,
      extraTracks: [
        ...current.extraTracks,
        { id: newId(), name: '', rank: 'dangerous', ticks: 0, kind },
      ],
    }));

  // ── Профілі ─────────────────────────────────────────────────────────
  // Каталог у стан не копіюється: у персонажі лежить лише ключ картки
  // та робота гравця над нею (PROFILES_PLAN.md §4.2).
  const profiles = resolveProfiles(character.profiles);

  /** Доданий профіль стає останнім у руці й одразу піднятим (§6.1). */
  const addProfile = (profile: Profile) => {
    const entry = emptyCharacterProfile(profile);
    updateCharacter(current => ({ ...current, profiles: [...current.profiles, entry] }));
    setRaisedProfileId(entry.id);
    setPickerOpen(false);
  };

  const updateProfile = (
    id: string,
    updater: (entry: CharacterProfile) => CharacterProfile,
  ) =>
    updateCharacter(current => ({
      ...current,
      profiles: current.profiles.map(entry => (entry.id === id ? updater(entry) : entry)),
    }));

  const removeProfile = (id: string) => {
    updateCharacter(current => ({
      ...current,
      profiles: current.profiles.filter(entry => entry.id !== id),
    }));
    setRaisedProfileId(current => (current === id ? null : current));
  };

  const addProfileButton = (
    <button
      type="button"
      className="zone-add"
      onClick={() => setPickerOpen(true)}
      aria-label={UI.addProfile}
      title={UI.addProfile}
    >
      +
    </button>
  );

  return (
    <div className={`character-sheet-page${docked ? ' character-sheet-page--docked' : ''}`}>
      {/* Обгортка — контейнер для @container: коли шторка забирає місце,
          сітка аркуша перебудовується за власною шириною, а не за вікном. */}
      <div className="character-sheet-frame">
      <div className="character-sheet">
        <section className="sheet-zone sheet-zone--name" style={{ gridArea: 'name' }}>
          <div className="sheet-zone__head">
            <h2 className="sheet-zone__title">{SHEET.character}</h2>
            {movesButton}
            <CharacterBar
              store={store}
              character={character}
              onSelect={selectCharacter}
              onAdd={addCharacter}
              onDuplicate={duplicateActive}
              onRemove={removeCharacter}
              onImport={importFromText}
            />
          </div>
          <input
            className="sheet-name-input"
            value={character.name}
            onChange={event => patchCharacter({ name: event.target.value })}
            placeholder={UI.namePlaceholder}
            aria-label={UI.namePlaceholder}
          />
        </section>

        <Zone area="xp" title={SHEET.experience}>
          <XpTrack
            character={character}
            onToggle={index =>
              updateCharacter(current => ({
                ...current,
                xp: current.xp.map((cell, i) => (i === index ? nextXpState(cell) : cell)),
              }))
            }
          />
        </Zone>

        <Zone area="attrs">
          <AttributeBoxes
            character={character}
            onStep={(attribute, delta) =>
              updateCharacter(current => ({
                ...current,
                attributes: {
                  ...current.attributes,
                  [attribute]: clampAttribute(current.attributes[attribute] + delta),
                },
              }))
            }
            onRoll={handleRoll}
            onShowMoves={attribute => openDrawer(attribute)}
          />
        </Zone>

        <Zone area="momentum" title={SHEET.momentum} vertical>
          <MomentumTrack
            character={character}
            onChange={momentum => patchCharacter({ momentum })}
          />
        </Zone>

        <Zone area="stats" title={SHEET.stats} vertical>
          <StatTracks
            character={character}
            onChange={(stat, value) =>
              updateCharacter(current => ({
                ...current,
                stats: { ...current.stats, [stat]: clampStat(value) },
              }))
            }
          />
        </Zone>

        <Zone
          area="vows"
          title={SHEET.vows}
          action={
            <button
              type="button"
              className="zone-add"
              onClick={addVow}
              aria-label={UI.addVow}
              title={UI.addVow}
            >
              +
            </button>
          }
        >
          {character.vows.map((vow, index) => (
            <VowRow
              key={vow.id}
              vow={vow}
              label={vowLabel(vow.name, index)}
              isOnly={character.vows.length === 1}
              onUpdate={updater => updateVow(index, updater)}
              onRemove={() => removeVow(vow.id)}
              onRoll={() => openMoveFromSheet(PROGRESS_MOVE.vow, { trackId: vow.id })}
            />
          ))}
        </Zone>

        <Zone area="notes" title={SHEET.notes}>
          <textarea
            className="notes-input"
            value={character.notes}
            placeholder={UI.notesPlaceholder}
            aria-label={SHEET.notes}
            onChange={event => patchCharacter({ notes: event.target.value })}
          />
        </Zone>

        <Zone
          area="bonds"
          title={SHEET.bonds}
          action={
            <button
              type="button"
              className="zone-add"
              onClick={addBond}
              aria-label={UI.addBond}
              title={UI.addBond}
            >
              +
            </button>
          }
        >
          <BondsBox
            ticks={character.bondTicks}
            bonds={character.bonds}
            onTicks={updateBondTicks}
            onName={renameBond}
            onRemove={removeBond}
            onRoll={() => openMoveFromSheet(PROGRESS_MOVE.bond)}
          />
        </Zone>

        <Zone area="debil" title={SHEET.debilities}>
          <DebilitiesBox
            character={character}
            onToggle={(debility, marked) =>
              updateCharacter(current => ({
                ...current,
                debilities: { ...current.debilities, [debility]: marked },
              }))
            }
          />
        </Zone>

        {/* На телефоні зони немає — замість неї приклеєний футер (рішення №5). */}
        {!narrow && (
          <Zone area="profiles" title={SHEET.profiles} action={addProfileButton}>
            <ProfilesZone
              entries={profiles}
              raisedId={raisedProfileId}
              onRaise={setRaisedProfileId}
              onUpdate={updateProfile}
              onRemove={removeProfile}
            />
          </Zone>
        )}

        <Zone area="tracks" title={SHEET.tracks}>
          <ExtraTracksSection
            character={character}
            onAdd={addExtraTrack}
            onUpdate={updateExtraTrack}
            onRemove={id =>
              updateCharacter(current => ({
                ...current,
                extraTracks: current.extraTracks.filter(track => track.id !== id),
              }))
            }
            onRoll={track =>
              track.kind === 'other'
                ? handleProgressRoll(track.name.trim() || TRACK_KIND_LABELS[track.kind], track.ticks)
                : openMoveFromSheet(PROGRESS_MOVE[track.kind], { trackId: track.id })
            }
          />
        </Zone>

        <Zone area="log" title={SHEET.log}>
          <RollLog log={log} onRemove={remove} onClear={clear} />
        </Zone>
      </div>
      </div>

      {/* Поза сіткою: стос висить над сторінкою, а не займає в ній зону. */}
      <RollToasts
        rolls={toasts}
        burnPreview={burnPreview}
        onBurn={handleBurn}
        onDismiss={dismissToast}
      />

      {narrow && (
        <ProfilesFooter
          entries={profiles}
          onOpenMoves={() => openDrawer()}
          onAdd={() => setPickerOpen(true)}
          onUpdate={updateProfile}
          onRemove={removeProfile}
        />
      )}

      {drawer}

      {pickerOpen && (
        <ProfilePicker
          taken={character.profiles.map(entry => entry.profileId)}
          onAdd={addProfile}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Аркуш існує лише українською (CHARACTER_SHEET_PLAN.md §10),
 * тож будь-яка інша мова веде на /uk/character.
 */
const CharacterSheet = ({ currentLang }: { currentLang: string }) =>
  currentLang === 'uk' ? <CharacterSheetInner /> : <Navigate to="/uk/character" replace />;

export default CharacterSheet;
