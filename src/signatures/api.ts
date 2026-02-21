import { hash } from '../hashing/utils.js';
import { getPrivateKey } from '../identity/identity.js';
import { getOrThrow, type Instance } from '../instance/instance.js';

/** Options for {@link sign}. */
export interface SignOptions {
  /** The hashing algoithm to use on the message. */
  hashAlg: number;
  /** The Instance. */
  instance: Instance;
  /** The message bytes. */
  message: Uint8Array<ArrayBuffer>;
  /** The public key. */
  publicKey: Uint8Array<ArrayBuffer>;
  /** The signature algorithm to use. */
  sigAlg: string;
}

/** Options for {@link verifySignature}. */
export interface VerifySignatureOptions extends SignOptions {
  signature: Uint8Array<ArrayBuffer>;
}

/** Generates a cryptographic signature for a message. */
export const sign = async ({
  instance,
  hashAlg,
  message,
  publicKey,
  sigAlg,
}: SignOptions): Promise<Uint8Array<ArrayBuffer>> =>
  await getOrThrow(instance, 'sigAlgs', sigAlg).sign({
    instance,
    key: getPrivateKey({ instance, publicKey }),
    messageHash: new Uint8Array((await hash(instance, hashAlg, message)).value),
    sigAlg,
  });

/** Verifies a cryptographic signature. */
export const verifySignature = async ({
  instance,
  hashAlg,
  message,
  publicKey,
  sigAlg,
  signature,
}: VerifySignatureOptions): Promise<boolean> =>
  getOrThrow(instance, 'sigAlgs', sigAlg).verify({
    instance,
    key: publicKey,
    messageHash: new Uint8Array((await hash(instance, hashAlg, message)).value),
    sigAlg,
    signature,
  });
