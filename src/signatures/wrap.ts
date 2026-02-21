import type { InstanceConfig } from '../instance/instance.js';
import type { WrapFn, WrapModule } from '../wraps/types.js';
import { sign, verifySignature } from './api.js';

/**
 * An unwrapped signature. Either an existing unwrapped signature, which will have all properties,
 * or a new signature which will not yet have a `signature`.
 */
export interface UnwrappedSignature {
  /** The message hashing algorithm. */
  hashAlg: number;

  /** The public key of the signature. */
  publicKey: Uint8Array<ArrayBuffer>;

  /** The signature algorithm. */
  sigAlg: string;

  /** For existing signatures, the signature bytes. */
  signature?: Uint8Array<ArrayBuffer>;
}

/** Metadata required to validate a signature. */
export interface WrappedSignature {
  /** The signature algorithm. */
  a: string;
  /** The message hashing algorithm. */
  h: number;
  /** The public key. */
  p: Uint8Array<ArrayBuffer>;
  /** The signature. */
  s: Uint8Array<ArrayBuffer>;
}

export const wrapSignatures: WrapFn<UnwrappedSignature[], WrappedSignature[]> = async ({
  instance,
  metadata,
  payload,
}) => ({
  metadata: await Promise.all(
    metadata.map(async ({ hashAlg, publicKey, sigAlg, signature }) => ({
      a: sigAlg,
      h: hashAlg,
      p: publicKey,
      s: signature ?? (await sign({ instance, hashAlg, message: payload, publicKey, sigAlg })),
    })),
  ),
  payload,
});

export const unwrapSignatures: WrapFn<WrappedSignature[], UnwrappedSignature[]> = async ({
  instance,
  metadata,
  payload,
}) => ({
  metadata: await Promise.all(
    metadata.map(async ({ a, h, p, s }) => {
      const unwrapped = { hashAlg: h, publicKey: p, sigAlg: a, signature: s };
      if (!(await verifySignature({ instance, message: payload, ...unwrapped }))) {
        throw new Error('Signature failed to verify');
      }
      return unwrapped;
    }),
  ),
  payload,
});

/** A Wrap implementation for cryptographic signatures. */
export const SignatureWraps: WrapModule<WrappedSignature[], UnwrappedSignature[]> = {
  unwrap: unwrapSignatures,
  wrap: wrapSignatures,
};

export const WithSignatureWraps = { wraps: { sig: SignatureWraps } } satisfies InstanceConfig;
