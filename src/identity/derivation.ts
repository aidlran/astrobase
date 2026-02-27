import { keygen } from '@noble/secp256k1';
import { ContentIdentifier, type ContentIdentifierLike } from '../cid/cid.js';
import { getContent, putContent } from '../content/api.js';
import { FileBuilder } from '../file/file-builder.js';
import { SHA_256 } from '../hashing/algorithms/sha256.js';
import { getOrThrow, type Instance } from '../instance/instance.js';
import { compareBytes } from '../internal/encoding.js';
import { activeSeeds } from '../keyrings/keyrings.js';
import type { UnwrappedSignature } from '../signatures/wrap.js';
import { wrap } from '../wraps/wraps.js';
import type { GetPrivateKeyFn } from './get-private-key.js';
import { identityPrefix, type Identity } from './identity.js';

/** Known public keys mapped to their identity ID. */
const lookup: { [K in string]?: string } = {};

export interface DeriveIdentityKeysOptions {
  /** The string ID of the identity. */
  id: string;

  /** The instance for implementation and keyring retrieval. */
  instance: Instance;
}

function assertKeyringLoaded(instance: Instance) {
  const seed = activeSeeds.get(instance);
  if (!seed) {
    throw new ReferenceError('No keyring loaded for instance');
  }
  return seed;
}

export async function deriveIdentityKeys({ id, instance }: DeriveIdentityKeysOptions) {
  const seed = assertKeyringLoaded(instance);

  const secret = await getOrThrow(
    instance,
    'kdf',
    'HKDF',
  )({
    hashAlg: 'SHA-256',
    info: new TextEncoder().encode(id),
    input: new Uint8Array(seed),
    instance,
    kdf: 'HKDF',
    keyLen: 48,
  });

  const keys = keygen(secret);

  lookup[new TextDecoder().decode(keys.publicKey)] = id;

  return keys;
}

export interface GetPrivateKeyOptions extends Pick<DeriveIdentityKeysOptions, 'instance'> {
  /** The public key. */
  publicKey: Uint8Array<ArrayBuffer>;
}

export const getPrivateKey = (async ({ instance, publicKey }: GetPrivateKeyOptions) => {
  assertKeyringLoaded(instance);

  const id = lookup[new TextDecoder().decode(publicKey)];

  if (!id) {
    throw Error('Identity ID unavailable for public key');
  }

  const keys = await deriveIdentityKeys({ id, instance });

  if (!compareBytes(publicKey, keys.publicKey)) {
    throw Error('Private key unavailable in current keyring');
  }

  return new Uint8Array(keys.secretKey);
}) satisfies GetPrivateKeyFn;

/** {@link getIdentity} lookup result. */
export interface GetIdentityResult {
  /** The content identifier of the identity */
  cid: ContentIdentifier;

  /** The identity content. */
  identity?: Identity;
}

/** Retrieves an identity. */
export async function getIdentity(options: DeriveIdentityKeysOptions): Promise<GetIdentityResult> {
  const { publicKey } = await deriveIdentityKeys(options);
  const cid = new ContentIdentifier(identityPrefix, publicKey);
  const identity = await getContent<Identity>(cid, options.instance);
  return { cid, identity };
}

/** Options for {@link putIdentity}. */
export interface PutIdentityOptions extends DeriveIdentityKeysOptions {
  /** The Content Identifier for the identity to point to. */
  ref: ContentIdentifierLike;
}

/**
 * Sets or replaces the content for an identity.
 *
 * @returns The content identifier of the identity.
 */
export async function putIdentity(options: PutIdentityOptions) {
  const { publicKey } = await deriveIdentityKeys(options);

  const cid = new ContentIdentifier(identityPrefix, publicKey);

  const { id, instance, ref } = options;

  await putContent(
    cid,
    await wrap(instance, {
      metadata: await new FileBuilder<UnwrappedSignature[]>()
        .setMediaType('application/json')
        .setValue(
          [{ hashAlg: SHA_256, publicKey: new Uint8Array(publicKey), sigAlg: 'ecdsa' }],
          instance,
        ),
      type: 'sig',
      value: await new FileBuilder<Identity>()
        .setMediaType('application/json')
        .setValue({ id, ref: new ContentIdentifier(ref) }, instance),
    }),
    { instance },
  );

  return cid;
}
