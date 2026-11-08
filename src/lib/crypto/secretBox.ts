import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Small authenticated-encryption helper for secrets Eggo must keep at rest
 * (today: a user's Brickset session hash). AES-256-GCM with a random
 * 96-bit nonce per message; the output is a self-describing string so the
 * format can be versioned later without a data migration.
 *
 * Server-only: it needs `node:crypto` and the raw key.
 */

const FORMAT_VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class SecretBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretBoxError';
  }
}

/**
 * Decode a key from an env var. Accepts base64, base64url, or hex, and
 * insists on exactly 32 bytes so a mistyped key fails loudly at startup
 * rather than silently weakening the cipher.
 */
export function parseSecretKey(encoded: string): Buffer {
  const trimmed = encoded.trim();
  const candidates = [
    /^[0-9a-fA-F]{64}$/.test(trimmed) ? Buffer.from(trimmed, 'hex') : null,
    Buffer.from(trimmed, 'base64'),
    Buffer.from(trimmed, 'base64url'),
  ];
  const key = candidates.find((buf) => buf !== null && buf.length === KEY_BYTES);
  if (!key) {
    throw new SecretBoxError('Secret key must decode to exactly 32 bytes (base64 or hex).');
  }
  return key;
}

/** Generate a fresh key in the base64 form the env var expects. */
export function generateSecretKey(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}

export function sealSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function openSecret(sealed: string, key: Buffer): string {
  const [version, ivPart, tagPart, ctPart, ...rest] = sealed.split('.');
  if (version !== FORMAT_VERSION || !ivPart || !tagPart || ctPart === undefined || rest.length) {
    throw new SecretBoxError('Sealed value is not in a recognized format.');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctPart, 'base64url')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    throw new SecretBoxError('Sealed value could not be opened with this key.');
  }
}
