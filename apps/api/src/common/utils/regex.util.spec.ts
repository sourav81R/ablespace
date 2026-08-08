import { escapeRegex } from './regex.util';

/**
 * Search terms become MongoDB `$regex` patterns, so escaping is a security
 * control, not a formatting nicety — an unescaped pattern is both a
 * match-everything bug and a ReDoS vector.
 */
describe('escapeRegex', () => {
  it('leaves ordinary text untouched', () => {
    expect(escapeRegex('landing page')).toBe('landing page');
  });

  it('escapes wildcards so they match literally', () => {
    // Unescaped, `.*` would match every task in the workspace.
    expect(escapeRegex('.*')).toBe('\\.\\*');
  });

  it('escapes grouping and repetition characters', () => {
    // `(a+)+` is the classic catastrophic-backtracking pattern.
    expect(escapeRegex('(a+)+')).toBe('\\(a\\+\\)\\+');
  });

  it('escapes anchors', () => {
    expect(escapeRegex('^start$')).toBe('\\^start\\$');
  });

  it('escapes character classes and backslashes', () => {
    expect(escapeRegex('[a-z]\\d')).toBe('\\[a-z\\]\\\\d');
  });

  it('produces a pattern that matches the original text literally', () => {
    const input = 'v1.0 (beta) [draft]';
    const pattern = new RegExp(escapeRegex(input));

    expect(pattern.test(input)).toBe(true);
    expect(pattern.test('v1X0 beta draft')).toBe(false);
  });
});
