import type { Instance } from '../instance/instance.js';
import type { MaybePromise } from '../internal/maybe-promise.js';

/** Context supplied to {@link SignFn}. */
export interface SignFnContext {
  /** The cryptographic signature algorithm identifier. */
  sigAlg: string;
  /** The instance. */
  instance: Instance;
  /** The private key to sign with. */
  key: Uint8Array<ArrayBuffer>;
  /** The message hash. */
  messageHash: Uint8Array<ArrayBuffer>;
}

/** Context supplied to {@link SignatureVerifyFn}. */
export interface SignatureVerifyFnContext extends SignFnContext {
  /** The public key to check the signature against. */
  key: Uint8Array<ArrayBuffer>;
  /** The signature bytes. */
  signature: Uint8Array<ArrayBuffer>;
}

/** An implementation function to cryptographically sign a message hash. */
export type SignFn = (context: SignFnContext) => MaybePromise<Uint8Array<ArrayBuffer>>;

/** An implementation function to verify a cryptographic signature. */
export type SignatureVerifyFn = (context: SignatureVerifyFnContext) => MaybePromise<boolean>;

/** A module providing an implementation for a particular cryptographic signature algorithm. */
export interface SignatureModule {
  /** The implementation function to cryptographically sign a message hash. */
  sign: SignFn;
  /** The implementation function to verify a cryptographic signature. */
  verify: SignatureVerifyFn;
}
