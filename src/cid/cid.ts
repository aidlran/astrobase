/**
 * @module CID
 * @experimental
 */

import { bech32m } from 'bech32';

/** A valid content identifier value. */
export type ContentIdentifierLike = string | ContentIdentifier;

/** Represents a bech32 content identifier and implements methods for parsing it. */
export class ContentIdentifier {
  private _identifier: string;
  private _prefix: string;
  private _value: Uint8Array<ArrayBuffer>;

  constructor(identifierOrPrefix: ContentIdentifierLike, value?: ArrayLike<number>) {
    if (identifierOrPrefix instanceof ContentIdentifier) {
      this._identifier = identifierOrPrefix._identifier;
      this._prefix = identifierOrPrefix._prefix;
      this._value = identifierOrPrefix._value;
    } else if (value) {
      this._identifier = bech32m.encode(identifierOrPrefix, bech32m.toWords(value));
      this._prefix = identifierOrPrefix.toLowerCase();
      this._value = new Uint8Array(value);
    } else {
      const { prefix, words } = bech32m.decode(identifierOrPrefix);
      this._identifier = identifierOrPrefix.toLowerCase();
      this._prefix = prefix;
      this._value = new Uint8Array(bech32m.fromWords(words));
    }
  }

  /** The content identifier prefix - indicating the type of the content identifier. */
  get prefix() {
    return this._prefix;
  }

  /** The content identifier value bytes - if any. */
  get value() {
    return this._value;
  }

  /** @returns The full content identifier in string format. */
  toString() {
    return this._identifier;
  }
}
