import { describe, expect, it } from 'vitest';
import { escapeRegex } from './search.js';

describe('escapeRegex', () => {
  it('turns regex metacharacters into literal search text', () => {
    const pattern = new RegExp(escapeRegex('a+b?'));
    expect(pattern.test('a+b?')).toBe(true);
    expect(pattern.test('aaab')).toBe(false);
  });
});
