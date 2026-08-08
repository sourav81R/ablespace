import { createPrivateKey, generateKeyPairSync } from 'node:crypto';
import { normalisePrivateKey } from './configuration';

/**
 * End-to-end check of the private-key handling against a real RSA key.
 *
 * The unit tests in `configuration.spec.ts` assert the string transformation.
 * This file goes one step further and confirms that what comes out is a key
 * OpenSSL will actually load — which is what the Firebase Admin SDK does
 * internally when it calls `cert()`.
 */
describe('private key round-trip', () => {
  /** A genuine PKCS#8 PEM key, structurally identical to a service-account one. */
  const { privateKey: originalPem } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  /**
   * How the key actually appears in an environment variable: every real
   * newline replaced by the two characters backslash and 'n'.
   */
  const escapedForEnv = originalPem.split('\n').join(String.raw`\n`);

  it('stores as a single line with no real newlines', () => {
    // This is the constraint that forces the escaping in the first place.
    expect(escapedForEnv.includes('\n')).toBe(false);
    expect(escapedForEnv.includes(String.raw`\n`)).toBe(true);
  });

  it('restores the original PEM exactly', () => {
    expect(normalisePrivateKey(escapedForEnv)).toBe(originalPem);
  });

  it('restores correctly when the value is wrapped in quotes', () => {
    // .env files and hosting dashboards commonly add surrounding quotes.
    expect(normalisePrivateKey(`"${escapedForEnv}"`)).toBe(originalPem);
  });

  it('produces a key OpenSSL can load', () => {
    const restored = normalisePrivateKey(escapedForEnv);

    expect(() => createPrivateKey(restored)).not.toThrow();
  });

  it('yields a key equivalent to the original', () => {
    const fromRestored = createPrivateKey(normalisePrivateKey(escapedForEnv));
    const fromOriginal = createPrivateKey(originalPem);

    expect(fromRestored.export({ type: 'pkcs8', format: 'pem' })).toEqual(
      fromOriginal.export({ type: 'pkcs8', format: 'pem' }),
    );
  });

  it('rejects a key whose PEM markers are missing', () => {
    // normalisePrivateKey is not a validator, so the guard lives in
    // FirebaseService; this documents that a bare body is not a usable key.
    const bodyOnly = originalPem
      .split('\n')
      .filter((line) => !line.startsWith('-----'))
      .join('\n');

    expect(() => createPrivateKey(normalisePrivateKey(bodyOnly))).toThrow();
  });
});
