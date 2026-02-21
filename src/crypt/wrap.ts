/* eslint-disable @typescript-eslint/no-deprecated */

import type { InstanceConfig } from '../instance/instance.js';
import type { WrapFn, WrapFnContext, WrapFnResult, WrapModule } from '../wraps/types.js';
import { decrypt, encrypt } from './crypt.js';
import { sanitizeCryptOptions, type CryptOptions, type CryptOptionsSanitized } from './options.js';

export type CryptWrappedMetadata = Omit<CryptOptionsSanitized, 'keyLen'> &
  Partial<Pick<CryptOptionsSanitized, 'keyLen'>> & {
    /** @deprecated */
    pubKey?: Uint8Array<ArrayBuffer>;
  };

async function cryptWrapFn(
  this: typeof decrypt,
  { instance, metadata, payload }: WrapFnContext<CryptWrappedMetadata>,
): Promise<WrapFnResult<CryptOptionsSanitized>> {
  /**
   * For compatibility:
   *
   * - Previously the public key was stored as `pubKey`.
   * - Previously `keyLen` was not stored and was always 32.
   *
   * @deprecated
   */
  const options: CryptOptions = {
    ...metadata,
    keyLen: metadata.keyLen ?? 32,
    publicKey: metadata.publicKey ?? metadata.pubKey,
  };

  return {
    metadata: sanitizeCryptOptions(options),
    payload: await this(payload, options, instance),
    typeOverride: 'crypt',
  };
}

export const wrapCrypt: WrapFn<CryptOptions, CryptOptionsSanitized> = cryptWrapFn.bind(encrypt);

export const unwrapCrypt: WrapFn<CryptWrappedMetadata, CryptOptionsSanitized> =
  cryptWrapFn.bind(decrypt);

/** A Wrap implementation for encrypted payloads. */
export const CryptWrapModule = {
  unwrap: unwrapCrypt,
  wrap: wrapCrypt,
} satisfies WrapModule<CryptOptions, CryptOptionsSanitized>;

export const WithCryptWrap = {
  wraps: { crypt: CryptWrapModule, encrypt: CryptWrapModule },
} satisfies InstanceConfig;
