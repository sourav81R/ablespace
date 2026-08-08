import { resolveCorsOrigins } from './configuration';

/**
 * CORS is the boundary that decides which websites may drive this API on a
 * signed-in user's behalf, so the production rules are worth pinning.
 */
describe('resolveCorsOrigins', () => {
  describe('production', () => {
    it('rejects a wildcard', () => {
      // "*" would let any site call the API as the signed-in user.
      expect(() => resolveCorsOrigins('*', 'production')).toThrow(/cannot be "\*"/);
    });

    it('rejects a wildcard hidden in a list', () => {
      expect(() => resolveCorsOrigins('https://app.example.com,*', 'production')).toThrow(
        /cannot be "\*"/,
      );
    });

    it('refuses to start with no origin configured', () => {
      // Failing the boot beats silently allowing nothing — or, worse, silently
      // allowing everything.
      expect(() => resolveCorsOrigins(undefined, 'production')).toThrow(/required in production/);
      expect(() => resolveCorsOrigins('', 'production')).toThrow(/required in production/);
    });

    it('accepts a single explicit origin', () => {
      expect(resolveCorsOrigins('https://app.example.com', 'production')).toEqual([
        'https://app.example.com',
      ]);
    });

    it('accepts several comma-separated origins', () => {
      expect(
        resolveCorsOrigins('https://app.example.com,https://preview.example.com', 'production'),
      ).toEqual(['https://app.example.com', 'https://preview.example.com']);
    });

    it('trims whitespace around entries', () => {
      expect(resolveCorsOrigins(' https://a.com , https://b.com ', 'production')).toEqual([
        'https://a.com',
        'https://b.com',
      ]);
    });

    it('ignores empty entries from a trailing comma', () => {
      expect(resolveCorsOrigins('https://a.com,,', 'production')).toEqual(['https://a.com']);
    });
  });

  describe('development', () => {
    it('falls back to localhost when unset', () => {
      expect(resolveCorsOrigins(undefined, 'development')).toEqual(['http://localhost:3000']);
    });

    it('honours an explicit value', () => {
      expect(resolveCorsOrigins('http://localhost:5173', 'development')).toEqual([
        'http://localhost:5173',
      ]);
    });

    it('permits a wildcard outside production', () => {
      // Convenient locally; the production guard is what matters.
      expect(resolveCorsOrigins('*', 'development')).toEqual(['*']);
    });
  });

  it('never returns an empty list, which would silently allow nothing', () => {
    expect(resolveCorsOrigins(undefined, 'development').length).toBeGreaterThan(0);
    expect(resolveCorsOrigins('https://a.com', 'production').length).toBeGreaterThan(0);
  });
});
