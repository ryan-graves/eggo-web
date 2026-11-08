/**
 * @jest-environment node
 */
import {
  SecretBoxError,
  generateSecretKey,
  openSecret,
  parseSecretKey,
  sealSecret,
} from './secretBox';

describe('secretBox', () => {
  const key = parseSecretKey(generateSecretKey());

  it('round-trips a secret', () => {
    const sealed = sealSecret('brickset-hash-123', key);
    expect(sealed).not.toContain('brickset-hash-123');
    expect(openSecret(sealed, key)).toBe('brickset-hash-123');
  });

  it('uses a fresh nonce per message', () => {
    expect(sealSecret('same', key)).not.toBe(sealSecret('same', key));
  });

  it('refuses to open with the wrong key', () => {
    const sealed = sealSecret('secret', key);
    const other = parseSecretKey(generateSecretKey());
    expect(() => openSecret(sealed, other)).toThrow(SecretBoxError);
  });

  it('detects tampering', () => {
    const sealed = sealSecret('secret', key);
    const parts = sealed.split('.');
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('AA') ? 'BB' : 'AA');
    expect(() => openSecret(parts.join('.'), key)).toThrow(SecretBoxError);
  });

  it('rejects values that are not in its format', () => {
    expect(() => openSecret('garbage', key)).toThrow(SecretBoxError);
    expect(() => openSecret('v9.a.b.c', key)).toThrow(SecretBoxError);
  });

  it('accepts base64, base64url, and hex keys of exactly 32 bytes', () => {
    const raw = Buffer.alloc(32, 7);
    expect(parseSecretKey(raw.toString('base64'))).toEqual(raw);
    expect(parseSecretKey(raw.toString('base64url'))).toEqual(raw);
    expect(parseSecretKey(raw.toString('hex'))).toEqual(raw);
  });

  it('rejects keys of the wrong length', () => {
    expect(() => parseSecretKey(Buffer.alloc(16, 1).toString('base64'))).toThrow(SecretBoxError);
    expect(() => parseSecretKey('')).toThrow(SecretBoxError);
  });
});
