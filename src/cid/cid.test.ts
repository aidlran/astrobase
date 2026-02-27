import { bech32m } from 'bech32';
import { describe, expect, test } from 'vitest';
import { ContentIdentifier } from './cid.js';
import FIXTURES from './test/fixtures.json' with { type: 'json' };

// Fixtures copied from bech32 lib source: https://github.com/bitcoinjs/bech32/blob/master/src/test/fixtures.json

describe('ContentIdentifier class', () => {
  // TODO: decide what to do about limit
  // TODO: investigate the "Non-zero padding" error
  describe('valid', () =>
    FIXTURES.bech32m.valid.forEach(
      ({ limit, prefix, string, words }) =>
        !limit &&
        (string.startsWith('11l') ? test.skip : test)(string, () => {
          const cid = new ContentIdentifier(string);
          expect(cid.toString()).toBe(string.toLowerCase());
          expect(cid.prefix).toBe(prefix.toLowerCase());
          expect(cid.value).toEqual(new Uint8Array(bech32m.fromWords(words)));

          const cid2 = new ContentIdentifier(cid);
          expect(cid2.toString()).toBe(string.toLowerCase());
          expect(cid2.prefix).toBe(prefix.toLowerCase());
          expect(cid2.value).toEqual(new Uint8Array(bech32m.fromWords(words)));

          const cid3 = new ContentIdentifier(prefix, bech32m.fromWords(words));
          expect(cid3.toString()).toBe(string.toLowerCase());
          expect(cid3.prefix).toBe(prefix.toLowerCase());
          expect(cid3.value).toEqual(new Uint8Array(bech32m.fromWords(words)));
        }),
    ));

  describe('invalid', () =>
    FIXTURES.bech32m.invalid.forEach((invalid) =>
      test(invalid.exception, () => {
        if (invalid.string) {
          expect(() => new ContentIdentifier(invalid.string)).toThrow(
            new RegExp(invalid.exception),
          );
        }
        if (invalid.prefix) {
          expect(
            () => new ContentIdentifier(invalid.prefix, bech32m.fromWords(invalid.words)),
          ).toThrow();
        }
      }),
    ));
});
