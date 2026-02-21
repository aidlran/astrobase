import { randomBytes } from 'crypto';
import { describe, expect, it, test } from 'vitest';
import { ContentIdentifier } from '../cid/cid.js';
import { createInstance } from '../instance/instance.js';
import { activeSeeds } from '../keyrings/keyrings.js';
import { createInstanceWithLoadedKeyring } from '../keyrings/testing/utils.js';
import { WithECDSA } from '../signatures/ecdsa.js';
import { getIdentity, getPrivateKey, putIdentity } from './identity.js';

describe('Identity', () => {
  test('No keyring loaded', async () => {
    const id = 'identityNoKeyring';
    const instance = createInstance();
    const err = new ReferenceError(`No keyring loaded for instance`);
    expect(() => getPrivateKey({ instance, publicKey: new Uint8Array() })).toThrow(err);
    await expect(getIdentity({ id, instance })).rejects.toThrow(err);
    await expect(putIdentity({ id, ref: '', instance })).rejects.toThrow(err);
  });

  describe('getPrivateKey', () => {
    const instance = createInstance();

    it('Throws if unavailable', () => {
      activeSeeds.set(instance, randomBytes(32));
      const publicKey = randomBytes(33);
      expect(() => getPrivateKey({ instance, publicKey })).toThrow('Private key unavailable');
    });

    it.todo('Successfully retrieves the private key');

    it.todo('Respects lookahead preference');
  });

  test('putIdentity & getIdentity full test', async () => {
    const id = 'identity-test';
    const instance = await createInstanceWithLoadedKeyring(WithECDSA);

    await expect(getIdentity({ id, instance })).rejects.toThrow('Identity not found');

    let ref = new ContentIdentifier('test', Array.from(randomBytes(8)));

    const cid = await putIdentity({ id, instance, ref });
    expect(cid).toBeInstanceOf(ContentIdentifier);

    await expect(getIdentity({ id, instance })).resolves.toEqual({
      cid,
      identity: { id, ref },
      index: 0,
    });

    ref = new ContentIdentifier('test', Array.from(randomBytes(8)));

    await expect(putIdentity({ id, instance, ref })).resolves.toEqual(cid);

    await expect(getIdentity({ id, instance })).resolves.toEqual({
      cid,
      identity: { id, ref },
      index: 0,
    });
  });

  it.todo('Fails when signature does not match');

  it.todo('Respects lookahead preference');
});
