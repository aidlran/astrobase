/* eslint-disable @typescript-eslint/no-deprecated */

import { SHA_256 } from '../hashing/index.js';
import type { InstanceConfig } from '../instance/instance.js';
import { unwrapSignatures, type UnwrappedSignature } from '../signatures/wrap.js';
import type { WrapFn, WrapModule } from '../wraps/types.js';

/** The metadata of an `ECDSA` type wrap. */
export interface ECDSAWrappedMetadata {
  /** The public key bytes of the identity that created the signature. */
  pub: Uint8Array<ArrayBuffer>;
  /** The signature bytes. */
  sig: Uint8Array<ArrayBuffer>;
}

/**
 * @deprecated Provided for back-compat to unwrap and migrate `ECDSA` type wraps. New & existing
 *   projects should create `sig` type wraps with `@astrobase/sdk/signatures`.
 */
export const unwrapECDSA: WrapFn<ECDSAWrappedMetadata, UnwrappedSignature[]> = async ({
  instance,
  metadata: { pub, sig },
  payload,
}) => ({
  ...(await unwrapSignatures({
    instance,
    metadata: [{ a: 'ecdsa', h: SHA_256, p: pub, s: sig }],
    payload,
  })),
  typeOverride: 'sig',
});

/**
 * A Wrap implementation for ECDSA signatures.
 *
 * @deprecated Provided for back-compat to unwrap and migrate `ECDSA` type wraps. New & existing
 *   projects should create `sig` type wraps with `@astrobase/sdk/signatures`.
 */
export const ECDSA = {
  unwrap: unwrapECDSA,
  wrap() {
    throw Error('ECDSA type wrap creation no longer supported');
  },
} satisfies WrapModule<ECDSAWrappedMetadata, UnwrappedSignature[]>;

/**
 * Provides a Wrap implementation for ECDSA signatures.
 *
 * @deprecated Provided for back-compat to unwrap and migrate `ECDSA` type wraps. New & existing
 *   projects should create `sig` type wraps with `@astrobase/sdk/signatures`.
 */
export const WithEcdsaWrap = { wraps: { ECDSA } } satisfies InstanceConfig;
