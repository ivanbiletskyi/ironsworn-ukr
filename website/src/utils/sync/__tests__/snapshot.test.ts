// Merging character sheets across devices.

import { describe, expect, it } from 'vitest';
import type { Character } from '../../character/types';
import { createCharacter } from '../../character/storage';
import type { SyncSnapshot } from '../snapshot';
import {
  SYNC_FORMAT_VERSION,
  emptySnapshot,
  isBlankCharacter,
  mergeSnapshots,
  parseSyncDocument,
  sameSnapshot,
  serializeSnapshot,
} from '../snapshot';
import type { Tombstones } from '../tombstones';
import { TOMBSTONE_TTL } from '../tombstones';

const NOW = 1_700_000_000_000;

/** Ids are pinned so two calls produce byte-identical characters. */
function character(name: string, updatedAt = NOW): Character {
  const base = createCharacter(name);
  return {
    ...base,
    id: `id-${name}`,
    updatedAt,
    vows: base.vows.map((vow, i) => ({ ...vow, id: `vow-${name}-${i}` })),
    bonds: base.bonds.map((bond, i) => ({ ...bond, id: `bond-${name}-${i}` })),
  };
}

function blank(name: string, updatedAt = NOW): Character {
  return { ...character(name, updatedAt), name: '' };
}

/** A snapshot carrying only characters; the logs have their own tests. */
function snap(characters: Character[], tombstones: Tombstones = {}): SyncSnapshot {
  return { ...emptySnapshot(), characters, tombstones };
}

describe('a blank character', () => {
  it('is one the player has not touched', () => {
    expect(isBlankCharacter(createCharacter())).toBe(true);
  });

  it('stops being blank as soon as anything is filled in', () => {
    expect(isBlankCharacter(createCharacter('Ульріка'))).toBe(false);
    expect(isBlankCharacter({ ...createCharacter(), momentum: 3 })).toBe(false);
    expect(isBlankCharacter({ ...createCharacter(), notes: 'меч' })).toBe(false);

    const withVow = createCharacter();
    withVow.vows[0] = { ...withVow.vows[0], name: 'Знайти брата' };
    expect(isBlankCharacter(withVow)).toBe(false);

    const withProgress = createCharacter();
    withProgress.bonds[0] = { ...withProgress.bonds[0], ticks: 1 };
    expect(isBlankCharacter(withProgress)).toBe(false);
  });

  /** Інакше перше злиття після входу зжувало б персонажа з рукою профілів. */
  it('stops being blank once a profile is in the hand', () => {
    const withProfile = createCharacter();
    withProfile.profiles = [
      { id: 'p1', profileId: 'companion-pes', marked: [], fields: {}, trackIndex: null },
    ];
    expect(isBlankCharacter(withProfile)).toBe(false);
  });

  it('does not prune a character that has only a profile', () => {
    const withProfile: Character = {
      ...character('withProfile'),
      name: '',
      profiles: [
        { id: 'p1', profileId: 'path-maska', marked: ['1'], fields: {}, trackIndex: null },
      ],
    };
    const merged = mergeSnapshots(snap([withProfile]), snap([blank('empty')]), {
      pruneBlanks: true,
      now: NOW,
    });
    expect(merged.characters.map(c => c.id)).toEqual(['id-withProfile']);
  });
});

describe('merging two devices', () => {
  it('keeps characters that exist only on one side', () => {
    const merged = mergeSnapshots(snap([character('a')]), snap([character('b')]), { now: NOW });
    expect(merged.characters.map(c => c.id)).toEqual(['id-a', 'id-b']);
  });

  it('resolves a conflict in favour of the newer edit', () => {
    const older = { ...character('a', NOW - 1000), notes: 'старе' };
    const newer = { ...character('a', NOW), notes: 'нове' };

    expect(mergeSnapshots(snap([older]), snap([newer]), { now: NOW }).characters[0].notes)
      .toBe('нове');

    // Той самий висновок незалежно від того, який бік локальний.
    expect(mergeSnapshots(snap([newer]), snap([older]), { now: NOW }).characters[0].notes)
      .toBe('нове');
  });

  it('keeps the local order so the picker does not jump around', () => {
    const merged = mergeSnapshots(
      snap([character('b'), character('a')]),
      snap([character('a'), character('b')]),
      { now: NOW },
    );
    expect(merged.characters.map(c => c.id)).toEqual(['id-b', 'id-a']);
  });
});

describe('deletion', () => {
  it('does not come back from the other device', () => {
    const merged = mergeSnapshots(
      snap([], { 'id-a': NOW }),
      snap([character('a', NOW - 5000)]),
      { now: NOW },
    );
    expect(merged.characters).toHaveLength(0);
    expect(merged.tombstones['id-a']).toBe(NOW);
  });

  it('is undone by an edit made after it', () => {
    const merged = mergeSnapshots(
      snap([], { 'id-a': NOW - 5000 }),
      snap([character('a', NOW)]),
      { now: NOW },
    );
    expect(merged.characters.map(c => c.id)).toEqual(['id-a']);
    expect(merged.tombstones['id-a']).toBeUndefined();
  });

  it('forgets tombstones once they are older than the retention window', () => {
    const merged = mergeSnapshots(
      snap([], { 'id-a': NOW - TOMBSTONE_TTL - 1 }),
      snap([]),
      { now: NOW },
    );
    expect(merged.tombstones).toEqual({});
  });
});

describe('blank characters on first sync', () => {
  it('are dropped when the account already has real ones', () => {
    const merged = mergeSnapshots(snap([createCharacter()]), snap([character('a')]), {
      pruneBlanks: true,
      now: NOW,
    });
    expect(merged.characters.map(c => c.id)).toEqual(['id-a']);
  });

  it('collapse to a single one when everything is blank', () => {
    const merged = mergeSnapshots(snap([blank('a', NOW)]), snap([blank('b', NOW - 1000)]), {
      pruneBlanks: true,
      now: NOW,
    });
    // Порожні всі, тож лишається найстарший — і обидва пристрої мають
    // дійти того самого висновку, інакше вони перезаписували б один одного.
    expect(merged.characters.map(c => c.id)).toEqual(['id-b']);
  });

  it('survive an ordinary merge, because a just-created sheet is blank too', () => {
    const merged = mergeSnapshots(snap([createCharacter()]), snap([character('a')]), { now: NOW });
    expect(merged.characters).toHaveLength(2);
  });
});

describe('comparing snapshots', () => {
  it('ignores order', () => {
    expect(
      sameSnapshot(snap([character('a'), character('b')]), snap([character('b'), character('a')])),
    ).toBe(true);
  });

  it('notices content, membership and tombstone changes', () => {
    const base = snap([character('a')]);
    expect(sameSnapshot(base, snap([{ ...character('a'), notes: 'x' }]))).toBe(false);
    expect(sameSnapshot(base, snap([]))).toBe(false);
    expect(sameSnapshot(base, snap([character('a')], { x: NOW }))).toBe(false);
  });
});

describe('the Firestore document', () => {
  it('round-trips a snapshot', () => {
    const snapshot = snap([character('a')], { 'id-b': NOW });
    const parsed = parseSyncDocument({
      version: SYNC_FORMAT_VERSION,
      payload: serializeSnapshot(snapshot),
      updatedAt: NOW,
    });
    expect(parsed).toEqual(snapshot);
  });

  it('treats missing or broken data as an empty snapshot', () => {
    expect(parseSyncDocument(null)).toEqual(emptySnapshot());
    expect(parseSyncDocument({})).toEqual(emptySnapshot());
    expect(parseSyncDocument({ payload: 'not json' })).toEqual(emptySnapshot());
  });

  it('refuses a document written by a newer version of the site', () => {
    expect(() =>
      parseSyncDocument({ version: SYNC_FORMAT_VERSION + 1, payload: '{}', updatedAt: NOW }),
    ).toThrow(/новішою версією/);
  });

  it('drops characters it cannot read instead of losing the rest', () => {
    const parsed = parseSyncDocument({
      version: SYNC_FORMAT_VERSION,
      payload: JSON.stringify({ characters: [character('a'), 'сміття'], tombstones: {} }),
      updatedAt: NOW,
    });
    expect(parsed.characters.map(c => c.id)).toEqual(['id-a']);
  });
});
