/**
 * Provides support for using `@noble/ciphers` with the Crypt module.
 *
 * Usage requires installing `@noble/ciphers` as a dependency:
 *
 *     npm i @noble/ciphers@^2
 *
 * @module Crypt/Noble
 * @experimental
 */

import { chacha20poly1305, xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import type { ARXCipher } from '@noble/ciphers/utils.js';
import type { InstanceConfig } from '../instance/instance.js';
import type { CryptFnContext, CryptModule } from './types.js';

export const NobleCryptAlgs = ['ChaCha20-Poly1305', 'XChaCha20-Poly1305'] as const;

export type NobleCryptAlg = (typeof NobleCryptAlgs)[number];

function crypt(this: [ARXCipher, 'decrypt' | 'encrypt'], { key, nonce, payload }: CryptFnContext) {
  return new Uint8Array(this[0](key, nonce)[this[1]](payload));
}

/** Creates a {@link CryptModule} that implements encryption using `@noble/ciphers`. */
export const NobleCrypt = (cipher: ARXCipher) => ({
  decrypt: crypt.bind([cipher, 'decrypt']),
  encrypt: crypt.bind([cipher, 'encrypt']),
});

/** An {@link InstanceConfig} that provides `cryptAlgs` for algorithms supported by `@noble/ciphers`. */
export const WithNobleCrypt: InstanceConfig = {
  cryptAlgs: {
    'ChaCha20-Poly1305': NobleCrypt(chacha20poly1305),
    'XChaCha20-Poly1305': NobleCrypt(xchacha20poly1305),
  } satisfies Record<NobleCryptAlg, CryptModule>,
};
