import { randomBytes } from 'node:crypto';
import { assert, beforeAll, describe, expect, it } from 'vitest';
import { ContentIdentifier } from '../cid/cid.js';
import { FileBuilder } from '../file/file-builder.js';
import { SHA_256 } from '../hashing/index.js';
import { putIdentity } from '../identity/identity.js';
import type { Instance } from '../instance/instance.js';
import { createInstanceWithLoadedKeyring } from '../keyrings/testing/utils.js';
import { sign } from '../signatures/api.js';
import { WithECDSA } from '../signatures/ecdsa.js';
import { WithSignatureWraps, type UnwrappedSignature } from '../signatures/wrap.js';
import { toWrapBuffer } from '../wraps/wrap-buffer.js';
import { unwrap } from '../wraps/wraps.js';
import { ECDSA, WithEcdsaWrap, type ECDSAWrappedMetadata } from './wrap.js';

describe('ECDSA Wrap', () => {
  const payload = new Uint8Array(randomBytes(32));
  let instance: Instance;
  let publicKey: Uint8Array<ArrayBuffer>;
  let signature: Uint8Array<ArrayBuffer>;

  beforeAll(async () => {
    instance = await createInstanceWithLoadedKeyring(WithECDSA, WithEcdsaWrap, WithSignatureWraps);

    const identityCID = await putIdentity({
      id: 'test',
      instance,
      ref: new ContentIdentifier('test', [1, 2, 3]),
    });

    assert(identityCID);

    publicKey = new Uint8Array(identityCID.value);

    signature = await sign({
      instance,
      hashAlg: SHA_256,
      message: payload,
      publicKey,
      sigAlg: 'ecdsa',
    });
  });

  it('Unwraps to a `sig` type wrap', async () => {
    expect(signature.byteLength).toBe(64);

    const wrapBuffer = toWrapBuffer({
      metadata: await new FileBuilder<ECDSAWrappedMetadata>()
        .setMediaType('application/json')
        .setValue({ pub: publicKey, sig: signature }, instance),
      payload,
      type: 'ECDSA',
    });

    const unwrapped = await unwrap(instance, wrapBuffer);

    expect(unwrapped.value.buffer).toEqual(payload);
    expect(unwrapped.type).toBe('sig');

    const unwrappedMetadata = (await unwrapped.metadata.getValue(instance)) as UnwrappedSignature[];
    expect(Array.isArray(unwrappedMetadata)).toBe(true);
    expect(unwrappedMetadata).length(1);
    expect(unwrappedMetadata[0].hashAlg).toBe(SHA_256);
    expect(unwrappedMetadata[0].publicKey).toEqual(publicKey);
    expect(unwrappedMetadata[0].sigAlg).toBe('ecdsa');
    expect(unwrappedMetadata[0].signature).toEqual(signature);
  });

  it('Throws if signature fails to verify', async () => {
    for (const metadata of [
      { pub: publicKey, sig: new Uint8Array(randomBytes(64)) },
      { pub: new Uint8Array(randomBytes(33)), sig: signature },
    ]) {
      await expect(ECDSA.unwrap({ instance, metadata, payload })).rejects.toThrow(
        'Signature failed to verify',
      );
    }
  });
});
