/**
 * Provides support for using the WebCrypto API with the KDF module.
 *
 * @module KDF/WebCrypto
 * @experimental
 */

import type { InstanceConfig } from '../instance/instance.js';
import type { KeyDerivationFn } from '../kdf/kdf.js';

export const WebCryptoKDFs = [
  'PBKDF2',
  // 'scrypt', // TODO(feat): add support
  // 'HKDF' // TODO(feat): add support
] as const;

export type WebCryptoKDF = (typeof WebCryptoKDFs)[number];

/** A {@link KeyDerivationFn} using the WebCrypto API for supported algorithms. */
export const WebCryptoKdfFn: KeyDerivationFn = async ({ kdf, ...options }) =>
  new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: kdf,
        hash: options.hashAlg,
        iterations: options.iterations,
        salt: options.salt,
      },
      await crypto.subtle.importKey('raw', options.input, kdf, false, ['deriveBits']),
      options.keyLen * 8,
    ),
  );

export const WebCryptoKDF: Record<WebCryptoKDF, KeyDerivationFn> = {
  PBKDF2: WebCryptoKdfFn,
};

export const WithWebCryptoKDF = { kdf: WebCryptoKDF } satisfies InstanceConfig;
