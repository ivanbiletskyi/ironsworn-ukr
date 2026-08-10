// Dice rolls. Section references point at CHARACTER_SHEET_PLAN.md.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitBurn, isBetter, previewBurn, rollAction, rollProgress } from '../diceEngine';

/**
 * Queues Math.random values chosen so the requested dice come up.
 * Roll order is action die (d6) first, then the two challenge dice (d10).
 */
function stubDice(...values: Array<{ sides: 6 | 10; value: number }>) {
  const queue = values.map(({ sides, value }) => (value - 1) / sides + 0.001 / sides);
  let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const next = queue[index++];
    if (next === undefined) throw new Error('dice queue exhausted');
    return next;
  });
}
const d6 = (value: number) => ({ sides: 6 as const, value });
const d10 = (value: number) => ({ sides: 10 as const, value });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action roll (§3.1)', () => {
  it('rolls one action die and two challenge dice', () => {
    stubDice(d6(4), d10(5), d10(8));
    const roll = rollAction('Вістря', 0, 0, 0);
    expect(roll.actionDie).toBe(4);
    expect(roll.challengeDice).toEqual([5, 8]);
    expect(roll.actionScore).toBe(4);
    expect(roll.outcome).toBe('miss');
  });

  it('adds the stat and any adds', () => {
    stubDice(d6(3), d10(1), d10(2));
    const roll = rollAction('Серце', 2, 1, 0);
    expect(roll.actionScore).toBe(6);
    expect(roll.outcome).toBe('strong');
  });

  it('resolves ties in favour of the challenge die', () => {
    stubDice(d6(3), d10(5), d10(5));
    const roll = rollAction('Серце', 2, 0, 0);
    expect(roll.actionScore).toBe(5);
    expect(roll.outcome).toBe('miss');
  });

  it('beating one challenge die is a weak hit', () => {
    stubDice(d6(4), d10(2), d10(9));
    const roll = rollAction('Вістря', 1, 0, 0);
    expect(roll.actionScore).toBe(5);
    expect(roll.outcome).toBe('weak');
  });

  it('caps the action score at 10', () => {
    stubDice(d6(6), d10(1), d10(1));
    const roll = rollAction('Залізо', 5, 4, 0); // 6 + 5 + 4 = 15
    expect(roll.actionScore).toBe(10);
    expect(roll.capped).toBe(true);
  });

  it('flags matched challenge dice', () => {
    stubDice(d6(1), d10(7), d10(7));
    expect(rollAction('Тінь', 0, 0, 0).matched).toBe(true);
    vi.restoreAllMocks();
    stubDice(d6(1), d10(7), d10(8));
    expect(rollAction('Тінь', 0, 0, 0).matched).toBe(false);
  });
});

describe('negative momentum (§3.5)', () => {
  it('cancels the action die when its magnitude matches', () => {
    stubDice(d6(4), d10(2), d10(3));
    const roll = rollAction('Тінь', 3, 0, -4);
    expect(roll.actionDieCanceled).toBe(true);
    // Score without the die: 3 beats 2 but not 3.
    expect(roll.actionScore).toBe(3);
    expect(roll.outcome).toBe('weak');
  });

  it('leaves the action die alone when the magnitude differs', () => {
    stubDice(d6(4), d10(2), d10(3));
    const roll = rollAction('Тінь', 3, 0, -5);
    expect(roll.actionDieCanceled).toBe(false);
    expect(roll.actionScore).toBe(7);
  });

  it('never cancels on positive momentum', () => {
    stubDice(d6(4), d10(2), d10(3));
    expect(rollAction('Тінь', 3, 0, 4).actionDieCanceled).toBe(false);
  });
});

describe('burning momentum (§3.2)', () => {
  it('matches the worked example from the rules', () => {
    // Momentum +6, action score 4, challenge dice 5 and 8.
    stubDice(d6(4), d10(5), d10(8));
    const roll = rollAction('Вістря', 0, 0, 6);
    expect(roll.outcome).toBe('miss');

    const burned = previewBurn(roll, 6);
    // Only the 5 is cancelled — 8 is not below the momentum value.
    expect(burned?.canceledChallenge).toEqual([true, false]);
    expect(burned?.outcome).toBe('weak');
    expect(burned?.momentumBurned).toBe(true);
  });

  it('cancels both dice when both are below momentum', () => {
    stubDice(d6(1), d10(2), d10(3));
    const roll = rollAction('Вістря', 0, 0, 8);
    expect(roll.outcome).toBe('miss');
    const burned = previewBurn(roll, 8);
    expect(burned?.canceledChallenge).toEqual([true, true]);
    expect(burned?.outcome).toBe('strong');
  });

  it('is not offered when no die is below momentum', () => {
    stubDice(d6(4), d10(9), d10(10));
    const roll = rollAction('Вістря', 0, 0, 6);
    expect(previewBurn(roll, 6)).toBeNull();
  });

  it('is not offered on a strong hit', () => {
    stubDice(d6(6), d10(1), d10(2));
    const roll = rollAction('Вістря', 3, 0, 5);
    expect(roll.outcome).toBe('strong');
    expect(previewBurn(roll, 5)).toBeNull();
  });

  it('is impossible at zero or negative momentum', () => {
    stubDice(d6(3), d10(4), d10(6));
    const roll = rollAction('Вістря', 0, 0, -2);
    expect(previewBurn(roll, -2)).toBeNull();
    expect(previewBurn(roll, 0)).toBeNull();
  });

  it('cannot be applied twice to the same roll', () => {
    stubDice(d6(4), d10(5), d10(8));
    const roll = rollAction('Вістря', 0, 0, 6);
    const burned = previewBurn(roll, 6);
    expect(burned).not.toBeNull();
    expect(previewBurn(burned!, 6)).toBeNull();
  });

  it('gives the committed burn its own id, for a separate log entry', () => {
    stubDice(d6(4), d10(5), d10(8));
    const roll = rollAction('Вістря', 0, 0, 6);
    const burned = commitBurn(roll, 6);
    expect(burned).not.toBeNull();
    expect(burned!.id).not.toBe(roll.id);
    expect(burned!.outcome).toBe('weak');
  });

  it('commits nothing when burning would not help', () => {
    stubDice(d6(6), d10(1), d10(2));
    const roll = rollAction('Вістря', 3, 0, 5);
    expect(commitBurn(roll, 5)).toBeNull();
  });
});

describe('progress roll (§3.8)', () => {
  it('counts filled boxes rather than ticks', () => {
    stubDice(d10(2), d10(4));
    const roll = rollProgress('Знайти сестру', 13); // 3 boxes + 1 tick
    expect(roll.boxes).toBe(3);
    expect(roll.outcome).toBe('weak');
  });

  it('rolls no action die', () => {
    stubDice(d10(1), d10(1));
    const roll = rollProgress('Знайти сестру', 8);
    expect(roll.kind).toBe('progress');
    expect(roll).not.toHaveProperty('actionDie');
    expect(roll.outcome).toBe('strong');
  });

  it('always misses on an empty track', () => {
    stubDice(d10(1), d10(1));
    expect(rollProgress('Нова присяга', 0).outcome).toBe('miss');
  });

  it('flags matched dice', () => {
    stubDice(d10(7), d10(7));
    expect(rollProgress('Знайти сестру', 40).matched).toBe(true);
  });
});

describe('outcome ordering', () => {
  it('ranks strong above weak above miss', () => {
    expect(isBetter('strong', 'weak')).toBe(true);
    expect(isBetter('weak', 'miss')).toBe(true);
    expect(isBetter('miss', 'weak')).toBe(false);
    expect(isBetter('weak', 'weak')).toBe(false);
  });
});
