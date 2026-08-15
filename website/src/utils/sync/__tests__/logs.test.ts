// Merging the roll and oracle logs across devices.

import { describe, expect, it } from 'vitest';
import type { LogShape, LogSnapshot } from '../logs';
import { emptyLog, mergeLogs, parseLog, sameLog } from '../logs';

const NOW = 1_700_000_000_000;

interface Entry {
  id: string;
  timestamp: number;
  updatedAt?: number;
  text: string;
}

const SHAPE: LogShape<Entry> = {
  id: entry => entry.id,
  clock: entry => entry.updatedAt ?? entry.timestamp,
  order: entry => entry.timestamp,
  max: 5,
};

function entry(id: string, timestamp: number, text = id): Entry {
  return { id, timestamp, text };
}

function log(entries: Entry[], extra: Partial<LogSnapshot<Entry>> = {}): LogSnapshot<Entry> {
  return { ...emptyLog<Entry>(), entries, ...extra };
}

describe('merging logs', () => {
  it('unions both sides, newest first', () => {
    const merged = mergeLogs(
      log([entry('a', NOW - 100)]),
      log([entry('b', NOW)]),
      SHAPE,
      NOW,
    );
    // Кидок із телефона має стати згори, а не в хвості списку.
    expect(merged.entries.map(e => e.id)).toEqual(['b', 'a']);
  });

  it('does not duplicate the same entry', () => {
    const merged = mergeLogs(log([entry('a', NOW)]), log([entry('a', NOW)]), SHAPE, NOW);
    expect(merged.entries).toHaveLength(1);
  });

  it('prefers the more recently edited version of an entry', () => {
    const edited = { ...entry('a', NOW), updatedAt: NOW + 50, text: 'перекинуто' };
    expect(mergeLogs(log([entry('a', NOW)]), log([edited]), SHAPE, NOW).entries[0].text)
      .toBe('перекинуто');
    expect(mergeLogs(log([edited]), log([entry('a', NOW)]), SHAPE, NOW).entries[0].text)
      .toBe('перекинуто');
  });

  it('keeps only as many entries as the log holds', () => {
    const merged = mergeLogs(
      log([1, 2, 3].map(i => entry(`a${i}`, NOW - i))),
      log([1, 2, 3].map(i => entry(`b${i}`, NOW - i * 10))),
      SHAPE,
      NOW,
    );
    expect(merged.entries).toHaveLength(SHAPE.max);
    expect(merged.entries.map(e => e.id)).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
  });

  it('agrees on the outcome regardless of which side is local', () => {
    const a = log([entry('a', NOW), entry('c', NOW - 200)]);
    const b = log([entry('b', NOW - 100)]);
    expect(mergeLogs(a, b, SHAPE, NOW).entries.map(e => e.id)).toEqual(
      mergeLogs(b, a, SHAPE, NOW).entries.map(e => e.id),
    );
  });
});

describe('deleting a single entry', () => {
  it('does not come back from the other device', () => {
    const merged = mergeLogs(
      log([], { tombstones: { a: NOW } }),
      log([entry('a', NOW - 100)]),
      SHAPE,
      NOW,
    );
    expect(merged.entries).toHaveLength(0);
    expect(merged.tombstones.a).toBe(NOW);
  });

  it('is undone by an edit made after it', () => {
    const edited = { ...entry('a', NOW - 100), updatedAt: NOW + 10 };
    const merged = mergeLogs(log([], { tombstones: { a: NOW } }), log([edited]), SHAPE, NOW);
    expect(merged.entries.map(e => e.id)).toEqual(['a']);
  });
});

describe('clearing the log', () => {
  it('wipes everything older on the other device too', () => {
    const merged = mergeLogs(
      log([], { clearedAt: NOW }),
      log([entry('a', NOW - 100), entry('b', NOW - 50)]),
      SHAPE,
      NOW,
    );
    expect(merged.entries).toHaveLength(0);
    expect(merged.clearedAt).toBe(NOW);
  });

  it('spares rolls made after it', () => {
    const merged = mergeLogs(
      log([], { clearedAt: NOW }),
      log([entry('old', NOW - 100), entry('new', NOW + 100)]),
      SHAPE,
      NOW,
    );
    expect(merged.entries.map(e => e.id)).toEqual(['new']);
  });

  it('drops tombstones it has made redundant', () => {
    const merged = mergeLogs(
      log([], { clearedAt: NOW, tombstones: { a: NOW - 500 } }),
      log([]),
      SHAPE,
      NOW,
    );
    expect(merged.tombstones).toEqual({});
  });
});

describe('comparing logs', () => {
  it('ignores order', () => {
    const a = log([entry('a', NOW), entry('b', NOW - 1)]);
    const b = log([entry('b', NOW - 1), entry('a', NOW)]);
    expect(sameLog(a, b, SHAPE)).toBe(true);
  });

  it('notices content, membership, tombstones and clearing', () => {
    const base = log([entry('a', NOW)]);
    expect(sameLog(base, log([entry('a', NOW, 'інше')]), SHAPE)).toBe(false);
    expect(sameLog(base, log([]), SHAPE)).toBe(false);
    expect(sameLog(base, log([entry('a', NOW)], { tombstones: { x: NOW } }), SHAPE)).toBe(false);
    expect(sameLog(base, log([entry('a', NOW)], { clearedAt: NOW }), SHAPE)).toBe(false);
  });
});

describe('reading a log from the cloud', () => {
  const accept = (raw: unknown): Entry | null =>
    typeof raw === 'object' && raw !== null && typeof (raw as Entry).id === 'string'
      ? (raw as Entry)
      : null;

  it('drops entries it cannot read instead of losing the log', () => {
    const parsed = parseLog(
      { entries: [entry('a', NOW), 'сміття'], tombstones: { b: NOW }, clearedAt: NOW },
      accept,
    );
    expect(parsed.entries.map(e => e.id)).toEqual(['a']);
    expect(parsed.tombstones).toEqual({ b: NOW });
    expect(parsed.clearedAt).toBe(NOW);
  });

  it('treats anything else as an empty log', () => {
    expect(parseLog(null, accept)).toEqual(emptyLog());
    expect(parseLog([], accept)).toEqual(emptyLog());
    expect(parseLog({ entries: 'ні' }, accept)).toEqual(emptyLog());
  });
});
