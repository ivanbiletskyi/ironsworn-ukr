// Character rules. Section references point at CHARACTER_SHEET_PLAN.md.

import { describe, expect, it } from 'vitest';
import {
  availableXp,
  blockingDebility,
  boxesFilled,
  canRaiseStat,
  clampAttribute,
  clampMomentum,
  clampStat,
  clampTicks,
  countDebilities,
  earnedXp,
  markBondProgress,
  markProgress,
  maxMomentum,
  nextXpState,
  partialTicks,
  resetMomentum,
  spentXp,
  ticksInBox,
  toggleBoxTick,
} from '../rules';
import { createCharacter } from '../storage';

describe('momentum and debilities (§3.3, §3.4)', () => {
  it('starts at max +10 and reset +2 with no debilities', () => {
    const character = createCharacter();
    expect(countDebilities(character)).toBe(0);
    expect(maxMomentum(character)).toBe(10);
    expect(resetMomentum(character)).toBe(2);
  });

  it('lowers max momentum by 1 per debility', () => {
    const character = createCharacter();
    character.debilities.wounded = true;
    expect(maxMomentum(character)).toBe(9);
    character.debilities.cursed = true;
    expect(maxMomentum(character)).toBe(8);
    character.debilities.shaken = true;
    expect(maxMomentum(character)).toBe(7);
  });

  it('uses a threshold, not a linear scale, for momentum reset', () => {
    const character = createCharacter();
    expect(resetMomentum(character)).toBe(2);
    character.debilities.wounded = true;
    expect(resetMomentum(character)).toBe(1);
    // Two or more debilities all mean 0 — it never goes negative.
    character.debilities.cursed = true;
    expect(resetMomentum(character)).toBe(0);
    character.debilities.shaken = true;
    expect(resetMomentum(character)).toBe(0);
    character.debilities.maimed = true;
    expect(resetMomentum(character)).toBe(0);
  });

  it('clamps momentum between −6 and the current max', () => {
    const character = createCharacter();
    character.debilities.wounded = true;
    character.debilities.cursed = true;
    character.debilities.shaken = true;
    expect(clampMomentum(10, character)).toBe(7);
    expect(clampMomentum(-99, character)).toBe(-6);
    expect(clampMomentum(3, character)).toBe(3);
  });
});

describe('stat locks (§3.9)', () => {
  it('locks the stat tied to each condition', () => {
    const character = createCharacter();
    expect(canRaiseStat(character, 'health')).toBe(true);

    character.debilities.wounded = true;
    expect(canRaiseStat(character, 'health')).toBe(false);
    expect(canRaiseStat(character, 'spirit')).toBe(true);
    expect(blockingDebility(character, 'health')).toBe('wounded');

    character.debilities.shaken = true;
    expect(canRaiseStat(character, 'spirit')).toBe(false);

    character.debilities.unprepared = true;
    expect(canRaiseStat(character, 'supply')).toBe(false);
  });

  it('ignores debilities that are not tied to a stat', () => {
    const character = createCharacter();
    character.debilities.cursed = true;
    character.debilities.encumbered = true;
    expect(canRaiseStat(character, 'health')).toBe(true);
    expect(blockingDebility(character, 'health')).toBeNull();
  });
});

describe('progress tracks (§3.7)', () => {
  it('counts four ticks to a box', () => {
    expect(boxesFilled(0)).toBe(0);
    expect(boxesFilled(3)).toBe(0);
    expect(boxesFilled(4)).toBe(1);
    expect(boxesFilled(13)).toBe(3);
    expect(boxesFilled(40)).toBe(10);
    expect(partialTicks(13)).toBe(1);
    expect(partialTicks(12)).toBe(0);
  });

  it('marks progress by challenge rank', () => {
    expect(markProgress(0, 'troublesome')).toBe(12); // 3 boxes
    expect(markProgress(0, 'dangerous')).toBe(8); // 2 boxes
    expect(markProgress(0, 'formidable')).toBe(4); // 1 box
    expect(markProgress(0, 'extreme')).toBe(2); // 2 ticks
    expect(markProgress(0, 'epic')).toBe(1); // 1 tick
  });

  it('never exceeds 40 ticks', () => {
    expect(markProgress(36, 'troublesome')).toBe(40);
    expect(clampTicks(999)).toBe(40);
    expect(clampTicks(-5)).toBe(0);
  });

  it('gives the bond track a single tick, since it has no rank', () => {
    expect(markBondProgress(0)).toBe(1);
    expect(markBondProgress(39)).toBe(40);
    expect(markBondProgress(40)).toBe(40);
  });

  it('reports ticks within a single box', () => {
    expect(ticksInBox(13, 0)).toBe(4);
    expect(ticksInBox(13, 3)).toBe(1);
    expect(ticksInBox(13, 4)).toBe(0);
  });

  it('adds a tick on click and clears a full box', () => {
    expect(toggleBoxTick(0, 0)).toBe(1);
    expect(toggleBoxTick(1, 0)).toBe(2);
    expect(toggleBoxTick(3, 0)).toBe(4);
    // A full box is erased instead of overfilled.
    expect(toggleBoxTick(4, 0)).toBe(0);
    // Clicking far ahead jumps the progress there.
    expect(toggleBoxTick(1, 4)).toBe(17);
    // Erasing a box necessarily erases every box after it: progress is one number.
    expect(toggleBoxTick(17, 1)).toBe(4);
  });
});

describe('experience', () => {
  it('counts earned, spent and available separately', () => {
    const character = createCharacter();
    character.xp[0] = 1;
    character.xp[1] = 1;
    character.xp[2] = 2;
    expect(earnedXp(character)).toBe(3);
    expect(spentXp(character)).toBe(1);
    expect(availableXp(character)).toBe(2);
  });

  it('cycles a circle through empty, earned and spent', () => {
    expect(nextXpState(0)).toBe(1);
    expect(nextXpState(1)).toBe(2);
    expect(nextXpState(2)).toBe(0);
  });
});

describe('value bounds', () => {
  it('keeps attributes and stats within 0…5', () => {
    expect(clampAttribute(-3)).toBe(0);
    expect(clampAttribute(99)).toBe(5);
    expect(clampAttribute(3)).toBe(3);
    expect(clampStat(-1)).toBe(0);
    expect(clampStat(9)).toBe(5);
  });
});
