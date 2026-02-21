import { randomBytes } from 'node:crypto';
import { assert, beforeAll, describe, expect, it } from 'vitest';
import { ContentIdentifier } from '../cid/cid.js';
import { SHA_256 } from '../hashing/index.js';
import { putIdentity } from '../identity/identity.js';
import { createInstance, type Instance } from '../instance/instance.js';
import { createInstanceWithLoadedKeyring } from '../keyrings/testing/utils.js';
import { WithECDSA } from './ecdsa.js';
import { SignatureWraps, wrapSignatures } from './wrap.js';

describe('`sig` type wraps', () => {
  const payload = new Uint8Array(randomBytes(32));

  it('`wrapSignatures` throws if no keyring loaded', () =>
    expect(
      wrapSignatures({
        instance: createInstance(WithECDSA),
        metadata: [
          { hashAlg: SHA_256, publicKey: new Uint8Array(randomBytes(32)), sigAlg: 'ecdsa' },
        ],
        payload,
      }),
    ).rejects.toThrow(ReferenceError('No keyring loaded for instance')));

  describe('Keyring loaded', () => {
    let instance: Instance;

    beforeAll(async () => {
      instance = await createInstanceWithLoadedKeyring(WithECDSA);
    });

    it('`wrapSignatures` throws if private key unavailable', () =>
      expect(
        SignatureWraps.wrap({
          instance,
          metadata: [
            { hashAlg: SHA_256, publicKey: new Uint8Array(randomBytes(32)), sigAlg: 'ecdsa' },
          ],
          payload,
        }),
      ).rejects.toThrow('Private key unavailable'));

    it('Wraps & unwraps', async () => {
      const identityCID = await putIdentity({
        id: 'test',
        instance,
        ref: new ContentIdentifier('test', [1, 2, 3]),
      });

      assert(identityCID);

      const publicKey = new Uint8Array(identityCID.value);

      const hashAlg = SHA_256;
      const sigAlg = 'ecdsa';

      const wrapped = await SignatureWraps.wrap({
        instance,
        metadata: [{ hashAlg, publicKey, sigAlg }],
        payload,
      });

      expect(Array.isArray(wrapped.metadata)).toBe(true);
      expect(wrapped.metadata).length(1);
      expect(wrapped.metadata[0].a).toBe(sigAlg);
      expect(wrapped.metadata[0].h).toBe(hashAlg);
      expect(wrapped.metadata[0].p).toEqual(publicKey);
      expect(wrapped.metadata[0].s.byteLength).toBe(64);
      expect(wrapped.payload).toEqual(payload);
      expect(wrapped.typeOverride).toBeUndefined();

      const unwrapped = await SignatureWraps.unwrap({ instance, ...wrapped });

      expect(Array.isArray(unwrapped.metadata)).toBe(true);
      expect(unwrapped.metadata).length(1);
      expect(unwrapped.metadata[0].hashAlg).toEqual(hashAlg);
      expect(unwrapped.metadata[0].publicKey).toEqual(publicKey);
      expect(unwrapped.metadata[0].sigAlg).toBe(sigAlg);
      expect(unwrapped.metadata[0].signature).toEqual(wrapped.metadata[0].s);
      expect(unwrapped.payload).toEqual(payload);
      expect(unwrapped.typeOverride).toBeUndefined();

      // Ensure it throws if pub & sig don't match up
      for (const metadata of [
        {
          p: wrapped.metadata[0].p,
          s: new Uint8Array(randomBytes(64)),
        },
        {
          p: new Uint8Array(randomBytes(33)),
          s: wrapped.metadata[0].s,
        },
      ]) {
        await expect(
          SignatureWraps.unwrap({
            instance,
            metadata: [{ a: sigAlg, h: hashAlg, ...metadata }],
            payload,
          }),
        ).rejects.toThrow('Signature failed to verify');
      }
    });
  });
});
