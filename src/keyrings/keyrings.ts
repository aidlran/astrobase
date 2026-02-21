/**
 * @module Keyrings
 * @experimental
 */

import { entropyToMnemonic, mnemonicToEntropy, mnemonicToSeed } from '../bip39/bip39.js';
import { ContentIdentifier, type ContentIdentifierLike } from '../cid/cid.js';
import { deleteContent, getContent } from '../content/api.js';
import { cryptOptions, type CryptOptions, type CryptOptionsSanitized } from '../crypt/options.js';
import { FileBuilder } from '../file/file-builder.js';
import { putImmutable } from '../immutable/repository.js';
import type { Instance } from '../instance/instance.js';
import { getMutable, putMutable } from '../mutable/mutable.js';
import { fromWrapBuffer, toWrapBuffer, unwrap, wrap } from '../wraps/index.js';
import type * as T from './procedure-types.js';

export * from './procedure-types.js';

/** A serialized keyring for storage. */
export interface PersistedKeyring<T = unknown> {
  /** Optional arbitrary metadata for the keyring stored unencrypted. */
  metadata?: T;

  /** Encrypted payload of the keyring secret. */
  payload: Uint8Array;
}

const keyringIndexKey = '_keyrings';

/**
 * The map of unlocked keyring seeds by instance. Only one keyring may be unlocked at a time per
 * instance.
 *
 * @private
 */
export const activeSeeds = new Map<Instance, Uint8Array>();

/** Clears the active keyring of the given instance. */
export function clearKeyring(instance: Instance) {
  // First zero-fill the seed's buffer in memory for security
  activeSeeds.get(instance)?.fill(0);
  activeSeeds.delete(instance);
}

/** Creates a new keyring using random entropy from the Web Crypto API. */
export async function createKeyring(
  instance: Instance,
  request: T.CreateKeyringRequest,
): Promise<T.CreateKeyringResult> {
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  const [mnemonic, cid] = await Promise.all([
    entropyToMnemonic(instance, entropy, request.wordlist).then((m) => m.join(' ')),
    saveKeyring(instance, entropy, request.passphrase, request.metadata),
  ]);
  return { mnemonic, cid };
}

/** Retrieves the index of available keyring content identifiers. */
export const getAvailableKeyringCIDs = (instance: Instance) =>
  getMutable(keyringIndexKey, instance)
    .then((f) => f?.getValue(instance))
    .then((cids) => (cids ?? []) as ContentIdentifier[]);

/** Imports a keyring using the recovery mnemonic phrase. */
export const importKeyring = (instance: Instance, request: T.ImportKeyringRequest) =>
  mnemonicToEntropy(instance, request.mnemonic.split(' '), request.wordlist).then((entropy) =>
    saveKeyring(instance, entropy, request.passphrase, request.metadata),
  );

/**
 * Loads a keyring from content identifier.
 *
 * @returns The keyring metadata.
 * @throws If the keyring fails to be loaded or unlocked.
 */
export async function loadKeyring<T>(instance: Instance, request: T.LoadKeyringRequest) {
  const keyringFile = await getContent<FileBuilder<PersistedKeyring<T>>>(request.cid, instance);

  if (!keyringFile) {
    throw new Error('Keyring not found');
  }

  const keyring = (await keyringFile.getValue(instance)) as PersistedKeyring<T>;

  // Splice in metadata passphrase
  const wrap = fromWrapBuffer(keyring.payload);
  const cryptOptions: CryptOptions = {
    ...((await wrap.metadata.getValue(instance)) as CryptOptionsSanitized),
    passphrase: request.passphrase,
  };
  await wrap.metadata.setValue(cryptOptions, instance);
  const wrapBuffer = toWrapBuffer(wrap);

  // Unwrap, grab entropy payload
  const entropy = (await (
    await unwrap(instance, wrapBuffer)
  ).value.getValue(instance)) as Uint8Array<ArrayBuffer>;

  // Load seed from entropy
  const mnemonic = await entropyToMnemonic(instance, entropy, request.wordlist);
  const seed = await mnemonicToSeed(mnemonic.join(' '));
  activeSeeds.set(instance, new Uint8Array(seed));
  return keyring.metadata as T;
}

/**
 * Saves the keyring to an immutable file and adds it to the mutable keyring index file.
 *
 * @returns The content identifier of the created immutable keyring file.
 */
async function saveKeyring(
  instance: Instance,
  entropy: Uint8Array,
  passphrase: string,
  metadata: unknown,
  replaceCID?: ContentIdentifierLike,
): Promise<ContentIdentifier> {
  const newCID = await putImmutable(
    await new FileBuilder().setMediaType('application/json').setValue(
      {
        metadata,
        payload: await wrap(instance, {
          metadata: await new FileBuilder()
            .setMediaType('application/json')
            .setValue(cryptOptions({ passphrase }), instance),
          type: 'crypt',
          value: new FileBuilder().setPayload(entropy),
        }),
      },
      instance,
    ),
    { instance },
  );
  const newCidStr = newCID.toString();
  const index = await getAvailableKeyringCIDs(instance);
  if (!index.find((existingCID) => existingCID.toString() === newCidStr)) {
    index.push(newCID);
  }
  const promises = [
    putMutable(
      keyringIndexKey,
      await new FileBuilder().setMediaType('application/json').setValue(index, instance),
      { instance },
    ),
  ];
  if (replaceCID && new ContentIdentifier(replaceCID).toString() !== newCidStr) {
    promises.push(deleteContent(replaceCID, instance));
  }
  await Promise.all(promises);
  return newCID;
}
