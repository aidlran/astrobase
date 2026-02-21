/**
 * @module Identity
 * @experimental
 */

import ecc from '@bitcoinerlab/secp256k1';
import bip32 from 'bip32';
// prettier-ignore
import { instance, maxLength, nonEmpty, pipe, regex, safeParse, strictObject, string } from 'valibot';
// prettier-ignore
import { ContentIdentifier, type ContentIdentifierLike, type ContentIdentifierSchemeParser } from '../cid/cid.js';
import { getContent, putContent } from '../content/api.js';
import { FileBuilder } from '../file/file-builder.js';
import { SHA_256 } from '../hashing/algorithms/sha256.js';
import type { Instance } from '../instance/instance.js';
import { compareBytes } from '../internal/encoding.js';
import { activeSeeds } from '../keyrings/keyrings.js';
import type { UnwrappedSignature } from '../signatures/wrap.js';
import { unwrap, wrap } from '../wraps/wraps.js';

/** Parsed identity content. */
export interface Identity {
  /** A string ID used to find an identity when iterating through addresses. */
  id: string;
  /** The content this identity points to. */
  ref: ContentIdentifier;
}

/** The content identifier prefix for identity. */
export const prefix = '$pub';

/** The Valibot schema for identity content. */
export const schema = strictObject({
  /** @ignore */
  id: pipe(string(), nonEmpty(), maxLength(100), regex(/^[a-z0-9-]+$/)),
  /** @ignore */
  ref: instance(ContentIdentifier),
});

/** Derives the BIP32 account for the loaded keyring. */
function getAccount(instance: Instance) {
  const seed = activeSeeds.get(instance);

  if (!seed) {
    throw new ReferenceError('No keyring loaded for instance');
  }

  // Purpose             44 | BIP44
  // Coin type         1238 | Astrobase
  // Account              0 | Could potentially be used for alt accounts, organisations?
  // Internal/external    0 | AKA change, not applicable
  return bip32(ecc).fromSeed(Buffer.from(seed)).derivePath(`m/44'/1238'/0'/0`);
}

interface BaseIdentityOptions {
  /** Instance used for keyring and content retrieval. */
  instance: Instance;

  /** Limit of unused BIP32 derivation indexes before giving up. */
  lookaheadLimit?: number;
}

/** Options for {@link getPrivateKey}. */
export interface GetPrivateKeyOptions extends BaseIdentityOptions {
  /** The target public key. */
  publicKey: Uint8Array;
}

/**
 * Tries to get the private key that corresponds to the given public key via the keyring.
 *
 * @throws If private key is unavailable.
 */
export function getPrivateKey(options: GetPrivateKeyOptions) {
  const account = getAccount(options.instance);

  // TODO: lookahead does not reset if an identity root exists!

  for (let i = 0, lookahead = 0; lookahead < (options.lookaheadLimit ?? 20); i++, lookahead++) {
    const derivation = account.derive(i);

    if (compareBytes(derivation.publicKey, options.publicKey)) {
      if (derivation.privateKey) {
        return derivation.privateKey as Uint8Array<ArrayBuffer>;
      }
      break;
    }
  }

  throw new Error('Private key unavailable');
}
/** Options for {@link getIdentity}. */
export interface GetIdentityOptions extends BaseIdentityOptions {
  /** The string ID of the identity. */
  id: string;
}

/** Identity lookup result. */
export interface IdentityResult {
  /** The content identifier of the identity */
  cid: ContentIdentifier;

  /** The index of the identity BIP32 derivation. */
  index: number;
}

/**
 * Get details of the next available identity.
 *
 * @param instance Instance used for keyring and content retrieval.
 * @param limit Iteration limit before giving up.
 * @throws If limit reached.
 */
export async function getNextIdentity(
  instance: Instance,
  limit = Infinity,
): Promise<IdentityResult> {
  const account = getAccount(instance);

  for (let i = 0; i < limit; i++) {
    const { publicKey } = account.derive(i);
    const cid = new ContentIdentifier(prefix, publicKey);
    const identity = await getContent<Identity>(cid, instance);
    if (!identity) {
      return { cid, index: i };
    }
  }

  throw new RangeError('Iteration limit reached before next available identity');
}

/** {@link getIdentity} lookup result. */
export interface GetIdentityResult extends IdentityResult {
  /** The identity content. */
  identity: Identity;
}

/**
 * Retrieves an identity.
 *
 * @throws If identity not found.
 */
export async function getIdentity(options: GetIdentityOptions): Promise<GetIdentityResult> {
  const account = getAccount(options.instance);

  for (let i = 0, lookahead = 0; lookahead < (options.lookaheadLimit ?? 20); i++) {
    const derivation = account.derive(i);
    const cid = new ContentIdentifier(prefix, derivation.publicKey);
    const identity = await getContent<Identity>(cid, options.instance);
    if (identity) {
      if (identity.id === options.id) {
        return {
          cid,
          identity,
          index: i,
        };
      }
      lookahead = 0;
    } else {
      lookahead++;
    }
  }

  throw new RangeError('Identity not found');
}

/** Options for {@link putIdentity}. */
export interface PutIdentityOptions extends GetIdentityOptions {
  /** The Content Identifier for the identity to point to. */
  ref: ContentIdentifierLike;
}

/**
 * Sets or replaces the content for an identity.
 *
 * @returns The content identifier of the identity.
 * @throws If unsuccessful.
 */
export async function putIdentity(options: PutIdentityOptions) {
  const { id, instance, ref } = options;
  const account = getAccount(instance);

  let publicKey!: Uint8Array<ArrayBuffer>;
  let targetCID: ContentIdentifier | undefined;

  for (let i = 0, lookahead = 0; lookahead < (options.lookaheadLimit ?? 20); i++) {
    const derivedPub = new Uint8Array(account.derive(i).publicKey);
    const derivedCID = new ContentIdentifier(prefix, derivedPub);
    const derivedID = await getContent<Identity>(derivedCID, instance);
    if (derivedID) {
      if (derivedID.id === id) {
        publicKey = derivedPub;
        targetCID = derivedCID;
        break;
      }
      lookahead = 0;
    } else if (++lookahead == 1) {
      // If the lookahead limit is reached without a match, we'll use the first available
      publicKey = derivedPub;
      targetCID = derivedCID;
    }
  }

  if (targetCID) {
    await putContent(
      targetCID,
      await wrap(instance, {
        metadata: await new FileBuilder<UnwrappedSignature[]>()
          .setMediaType('application/json')
          .setValue([{ hashAlg: SHA_256, publicKey, sigAlg: 'ecdsa' }], instance),
        type: 'sig',
        value: await new FileBuilder<Identity>()
          .setMediaType('application/json')
          .setValue({ id, ref: new ContentIdentifier(ref) }, instance),
      }),
      { instance },
    );

    return targetCID;
  }
}

/** The identity {@link ContentIdentifierSchemeParser}. */
export const scheme: ContentIdentifierSchemeParser<Identity> = async (cid, content, instance) => {
  const { metadata, type, value } = await unwrap(instance, content);
  if (type !== 'sig') return;
  const unwrappedSig = (await metadata.getValue(instance)) as UnwrappedSignature[];
  if (
    Array.isArray(unwrappedSig) &&
    unwrappedSig.some(({ publicKey }) => compareBytes(publicKey, new Uint8Array(cid.value)))
  ) {
    const parse = safeParse(schema, await value.getValue(instance));
    return parse.success ? parse.output : undefined;
  }
};
