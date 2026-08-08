import { normalisePrivateKey } from './configuration';

/**
 * Newline handling for the service-account private key.
 *
 * This is the single most common Firebase Admin misconfiguration: the key is a
 * multi-line PEM block, but environment variables generally cannot hold real
 * newlines, so it arrives with `\n` as two literal characters. Missing the
 * conversion produces "Invalid PEM formatted message" at startup.
 */
describe('normalisePrivateKey', () => {
  const body = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ';

  it('converts escaped \\n sequences into real newlines', () => {
    const escaped = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n`;

    const result = normalisePrivateKey(escaped);

    expect(result).toContain('\n');
    expect(result).not.toContain('\\n');
    expect(result.split('\n')[0]).toBe('-----BEGIN PRIVATE KEY-----');
  });

  it('leaves a key that already has real newlines unchanged', () => {
    // Some platforms do support multi-line values; that key must survive as-is.
    const real = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;

    expect(normalisePrivateKey(real)).toBe(real);
  });

  it('strips surrounding double quotes added by dashboard paste', () => {
    const quoted = `"-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n"`;

    const result = normalisePrivateKey(quoted);

    expect(result.startsWith('"')).toBe(false);
    expect(result.startsWith('-----BEGIN')).toBe(true);
  });

  it('strips surrounding single quotes', () => {
    const quoted = `'-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n'`;

    expect(normalisePrivateKey(quoted).startsWith('-----BEGIN')).toBe(true);
  });

  it('normalises CRLF to LF', () => {
    // Editors on Windows can rewrite the file; the PEM parser expects LF only.
    const crlf = `-----BEGIN PRIVATE KEY-----\r\n${body}\r\n-----END PRIVATE KEY-----\r\n`;

    expect(normalisePrivateKey(crlf)).not.toContain('\r');
  });

  it('appends the trailing newline OpenSSL requires', () => {
    const noTrailing = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`;

    expect(normalisePrivateKey(noTrailing).endsWith('\n')).toBe(true);
  });

  it('does not add a second trailing newline when one is present', () => {
    const withTrailing = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n`;

    expect(normalisePrivateKey(withTrailing).endsWith('\n\n')).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    const padded = `  -----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n  `;

    expect(normalisePrivateKey(padded).startsWith('-----BEGIN')).toBe(true);
  });

  it('produces a key whose PEM structure the SDK can parse', () => {
    const escaped = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----\\n`;

    const lines = normalisePrivateKey(escaped).trim().split('\n');

    expect(lines[0]).toBe('-----BEGIN PRIVATE KEY-----');
    expect(lines[lines.length - 1]).toBe('-----END PRIVATE KEY-----');
    expect(lines.length).toBeGreaterThan(2);
  });
});
