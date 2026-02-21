/**
 * Provides ECDSA implementation using `@noble/secp256k1`.
 *
 * @module Signatures/ECDSA
 * @experimental
 */

import { signAsync, verifyAsync } from '@noble/secp256k1';
import type { InstanceConfig } from '../instance/instance.js';
import type {
  SignFnContext,
  SignFn,
  SignatureVerifyFnContext,
  SignatureModule,
  SignatureVerifyFn,
} from './modules.js';

/** Signs a prehashed message with ECDSA using `@noble/secp256k1`. */
export const ecdsaSign = (async ({
  key,
  messageHash,
}: Pick<SignFnContext, 'key' | 'messageHash'>) =>
  new Uint8Array(await signAsync(messageHash, key, { prehash: false }))) satisfies SignFn;

/** Verifies a prehashed message with ECDSA using `@noble/secp256k1`. */
export const ecdsaVerify = (({
  key,
  messageHash,
  signature,
}: Pick<SignatureVerifyFnContext, 'key' | 'messageHash' | 'signature'>) =>
  verifyAsync(signature, messageHash, key, { prehash: false })) satisfies SignatureVerifyFn;

/** Provides ECDSA implementation using `@noble/secp256k1`. */
export const ecdsaModule = {
  sign: ecdsaSign,
  verify: ecdsaVerify,
} satisfies SignatureModule;

export const WithECDSA = { sigAlgs: { ecdsa: ecdsaModule } } satisfies InstanceConfig;
