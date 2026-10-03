import { describe, expect, it } from 'vitest';
import { resolveMarkdownLink } from '../markdownLinks';

describe('resolveMarkdownLink', () => {
  it('keeps core-book links inside the current language', () => {
    expect(resolveMarkdownLink('3-Moves_2-Adventure-Moves.md#face-danger', 'en'))
      .toBe('/en/3-Moves_2-Adventure-Moves#face-danger');
    expect(resolveMarkdownLink('./1-Basics_4-Momentum.md', 'uk')).toBe('/uk/1-Basics_4-Momentum');
  });

  it('sends links between extension files to the extension base path', () => {
    expect(resolveMarkdownLink('2-chapter.md#розділ', 'uk', '/uk/x/demo/'))
      .toBe('/uk/x/demo/2-chapter#розділ');
  });

  it('resolves extension links back into the core book', () => {
    expect(resolveMarkdownLink('../Ironsworn-md-ukr/3-Moves_2-Adventure-Moves.md#стріти-небезпеку', 'uk', '/uk/x/demo/'))
      .toBe('/uk/3-Moves_2-Adventure-Moves#стріти-небезпеку');
    expect(resolveMarkdownLink('../Ironsworn-md-en/1-Basics_4-Momentum.md', 'en', '/en/x/demo/'))
      .toBe('/en/1-Basics_4-Momentum');
  });
});
