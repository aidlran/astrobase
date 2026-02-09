import type { KeyDerivationOptions } from '../kdf/kdf.js';
import { CRYPT_DEFAULTS } from './defaults.js';

/** Options for the crypt API. */
export interface CryptOptions extends Omit<KeyDerivationOptions, 'instance'> {
  /** The cipher algorithm. */
  encAlg: string;

  /** The nonce A.K.A. initialization vector (IV). */
  nonce: Uint8Array<ArrayBuffer>;
}

/**
 * Builds a full options object from the given options partial. Populates omitted properties with
 * defaults.
 *
 * If any of `encAlg`, `hashAlg`, `iterations`, `keyLen`, or `kdf` are not provided, its value from
 * {@link CRYPT_DEFAULTS} will be used.
 *
 * If `nonce` is not provided, 12 random bytes will be generated.
 *
 * If `salt` is not provided, 16 random bytes will be generated.
 *
 * `crypto.getRandomValues` is used to generate random bytes.
 *
 * @param partialOptions An options partial.
 * @returns A full {@link CryptOptions} object.
 */
export const cryptOptions = (partialOptions: Partial<CryptOptions>): CryptOptions => ({
  ...CRYPT_DEFAULTS,
  ...partialOptions,
  nonce: partialOptions.nonce ?? crypto.getRandomValues(new Uint8Array(12)),
  salt: partialOptions.salt ?? crypto.getRandomValues(new Uint8Array(16)),
});

export type CryptOptionsSanitized = Omit<CryptOptions, 'key' | 'passphrase'>;

/**
 * @param options The {@link CryptOptions} object to sanitize.
 * @returns A sanitized version of the given {@link CryptOptions} with sensitive data removed. The
 *   original object remains unmodified.
 */
export function sanitizeCryptOptions(options: CryptOptions): CryptOptionsSanitized {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, passphrase, ...sanitized } = options;
  return sanitized;
}
