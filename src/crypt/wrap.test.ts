import { randomBytes } from 'crypto';
import { describe, expect, it, test } from 'vitest';
import { ContentIdentifier } from '../cid/cid.js';
import { putIdentity } from '../identity/identity.js';
import { createInstance } from '../instance/instance.js';
import { WithWebCryptoKDF } from '../kdf/web-crypto.js';
import { createInstanceWithLoadedKeyring } from '../keyrings/testing/utils.js';
import { WithECDSA } from '../signatures/ecdsa.js';
import * as Crypt from './index.js';
import { WithWebCryptoCrypt } from './web-crypto.js';

describe('Encrypt Wrap', () => {
  const { wrap, unwrap } = Crypt.CryptWrapModule;

  const randomPayload = new Uint8Array(randomBytes(32));

  it('Throws if no key derivation input provided', async () => {
    await expect(
      wrap({
        instance: createInstance(WithWebCryptoCrypt),
        metadata: Crypt.cryptOptions({}),
        payload: randomPayload,
      }),
    ).rejects.toThrow('Missing key derivation input');
  });

  it('Throws if ambiguous key derivation input provided', async () => {
    await expect(
      wrap({
        instance: createInstance(WithWebCryptoCrypt),
        metadata: Crypt.cryptOptions({
          passphrase: '1234',
          publicKey: new Uint8Array(randomBytes(32)),
        }),
        payload: randomPayload,
      }),
    ).rejects.toThrow('Ambiguous key derivation input');
  });

  test('Passphrase encrypt/decrypt', async () => {
    const passphrase = new TextDecoder().decode(crypto.getRandomValues(new Uint8Array(8)));
    const instance = createInstance(WithWebCryptoCrypt, WithWebCryptoKDF);

    const { metadata: encryptOutputMetadata, payload: encryptOutputPayload } = await wrap({
      instance,
      metadata: Crypt.cryptOptions({ passphrase }),
      payload: randomPayload,
    });

    expect(encryptOutputPayload).toBeInstanceOf(Uint8Array);
    expect(encryptOutputPayload).not.toEqual(randomPayload);
    expect(encryptOutputMetadata.encAlg).toBe(Crypt.CRYPT_DEFAULTS.encAlg);
    expect(encryptOutputMetadata.hashAlg).toBe(Crypt.CRYPT_DEFAULTS.hashAlg);
    expect(encryptOutputMetadata.iterations).toBe(Crypt.CRYPT_DEFAULTS.iterations);
    expect(encryptOutputMetadata.kdf).toBe(Crypt.CRYPT_DEFAULTS.kdf);
    expect(encryptOutputMetadata.nonce).toBeInstanceOf(Uint8Array);
    expect(encryptOutputMetadata.nonce).toHaveLength(12);
    expect(encryptOutputMetadata.salt).toBeInstanceOf(Uint8Array);
    expect(encryptOutputMetadata.salt).toHaveLength(16);
    expect(encryptOutputMetadata).not.toHaveProperty('passphrase');
    expect(encryptOutputMetadata.publicKey).toBeUndefined();

    const decryptInputMetadata: Crypt.CryptOptions = { ...encryptOutputMetadata };

    // Throws because passphrase was sanitized from metadata output
    await expect(
      unwrap({
        instance,
        metadata: decryptInputMetadata,
        payload: encryptOutputPayload,
      }),
    ).rejects.toThrow('Missing key derivation input');

    decryptInputMetadata.passphrase = passphrase;

    const { metadata: decryptOutputMetadata, payload: decryptOutputPayload } = await unwrap({
      instance,
      metadata: decryptInputMetadata,
      payload: encryptOutputPayload,
    });

    expect(decryptOutputPayload).toEqual(randomPayload);
    expect(decryptOutputMetadata).toEqual(encryptOutputMetadata);
    expect(decryptOutputMetadata).not.toHaveProperty('passphrase');
  });

  describe('Public key encrypt/decrypt', () => {
    const randomPubKeyMetadata = Crypt.cryptOptions({ publicKey: new Uint8Array(randomBytes(33)) });

    it('Throws if no keyring loaded', () =>
      expect(
        wrap({
          instance: createInstance(WithWebCryptoCrypt),
          metadata: randomPubKeyMetadata,
          payload: randomPayload,
        }),
      ).rejects.toThrow(ReferenceError('No keyring loaded for instance')));

    it('Throws if unknown public key provided', async () => {
      const instance = await createInstanceWithLoadedKeyring();

      await expect(
        wrap({
          instance,
          metadata: randomPubKeyMetadata,
          payload: randomPayload,
        }),
      ).rejects.toThrow('Private key unavailable');
    });

    it('Works if known public key provided', async () => {
      const instance = await createInstanceWithLoadedKeyring(WithECDSA);

      const identityCID = await putIdentity({
        id: 'test',
        instance,
        ref: new ContentIdentifier('test', [1, 2, 3]),
      });

      const publicKey = new Uint8Array(identityCID!.value);
      const metadata = Crypt.cryptOptions({ publicKey });

      const { metadata: wrappedMetadata, payload: wrappedPayload } = await wrap({
        instance,
        metadata,
        payload: randomPayload,
      });

      expect(wrappedMetadata).toEqual(metadata);

      expect(wrappedPayload).toBeInstanceOf(Uint8Array);
      expect(wrappedPayload).not.toEqual(randomPayload);

      const { metadata: unwrappedMetadata, payload: unwrappedPayload } = await unwrap({
        instance,
        metadata: wrappedMetadata,
        payload: wrappedPayload,
      });

      expect(unwrappedMetadata).toEqual(metadata);

      expect(new Uint8Array(unwrappedPayload)).toEqual(randomPayload);
    });
  });
});
