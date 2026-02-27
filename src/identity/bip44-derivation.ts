/* eslint-disable @typescript-eslint/no-deprecated */

/**
 * Legacy support for identity derivation via BIP44 hierarchy.
 *
 * @module Identity/BIP44
 * @deprecated In favour of simpler deterministic derivation.
 */

import ecc from '@bitcoinerlab/secp256k1';
import bip32 from 'bip32';
import { ContentIdentifier } from '../cid/cid.js';
import { getContent, putContent } from '../content/api.js';
import { FileBuilder } from '../file/file-builder.js';
import { SHA_256 } from '../hashing/algorithms/sha256.js';
import type { Instance } from '../instance/instance.js';
import { compareBytes } from '../internal/encoding.js';
import { activeSeeds } from '../keyrings/keyrings.js';
import type { UnwrappedSignature } from '../signatures/wrap.js';
import { wrap } from '../wraps/wraps.js';
import type { DeriveIdentityKeysOptions, PutIdentityOptions } from './derivation.js';
import type { GetPrivateKeyFn } from './get-private-key.js';
import { identityPrefix, type Identity } from './identity.js';

/** Derives the BIP44 account for the loaded keyring. */
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

/**
 * Tries to get the private key that corresponds to the given public key via the keyring.
 *
 * @deprecated
 * @throws If private key is unavailable.
 */
export const getPrivateKeyBIP44 = ((options) => {
  const account = getAccount(options.instance);

  for (let i = 0, lookahead = 0; lookahead < 20; i++, lookahead++) {
    const derivation = account.derive(i);

    if (compareBytes(derivation.publicKey, options.publicKey)) {
      if (derivation.privateKey) {
        return new Uint8Array(derivation.privateKey);
      }
      break;
    }
  }

  throw new Error('Private key unavailable');
}) satisfies GetPrivateKeyFn;

/** Identity lookup result. */
export interface IdentityResult {
  /** The content identifier of the identity */
  cid: ContentIdentifier;

  /** The index of the derivation. */
  index: number;
}

/**
 * Get details of the next available identity.
 *
 * @deprecated
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
    const cid = new ContentIdentifier(identityPrefix, publicKey);
    const identity = await getContent<Identity>(cid, instance);
    if (!identity) {
      return { cid, index: i };
    }
  }

  throw new RangeError('Iteration limit reached before next available identity');
}

/** {@link getIdentityBIP44} lookup result. */
export interface GetIdentityBIP44Result extends IdentityResult {
  /** The identity content. */
  identity: Identity;
}

/**
 * Retrieves an identity.
 *
 * @deprecated
 * @throws If identity not found.
 */
export async function getIdentityBIP44(
  options: DeriveIdentityKeysOptions,
): Promise<GetIdentityBIP44Result> {
  const account = getAccount(options.instance);

  for (let i = 0, lookahead = 0; lookahead < 20; i++) {
    const derivation = account.derive(i);
    const cid = new ContentIdentifier(identityPrefix, derivation.publicKey);
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

/**
 * Sets or replaces the content for an identity.
 *
 * @deprecated
 * @returns The content identifier of the identity.
 * @throws If unsuccessful.
 */
export async function putIdentityBIP44(options: PutIdentityOptions) {
  const { id, instance, ref } = options;
  const account = getAccount(instance);

  let publicKey!: Uint8Array<ArrayBuffer>;
  let targetCID: ContentIdentifier | undefined;

  for (let i = 0, lookahead = 0; lookahead < 20; i++) {
    const derivedPub = new Uint8Array(account.derive(i).publicKey);
    const derivedCID = new ContentIdentifier(identityPrefix, derivedPub);
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
