// prettier-ignore
import { instance, maxLength, nonEmpty, pipe, regex, safeParse, strictObject, string } from 'valibot';
import { ContentIdentifier } from '../cid/cid.js';
import { contentScheme } from '../content/content-scheme.js';
import { compareBytes } from '../internal/encoding.js';
import type { UnwrappedSignature } from '../signatures/wrap.js';
import { unwrap } from '../wraps/wraps.js';

/** Parsed identity content. */
export interface Identity {
  /**
   * A string ID used to find an identity when iterating through addresses with non-deterministic
   * identity derivation.
   *
   * @deprecated
   */
  id?: string;

  /** The content this identity points to. */
  ref: ContentIdentifier;
}

/** The content identifier prefix for identity. */
export const identityPrefix = '$pub';

/** The Valibot schema for identity content. */
export const identitySchema = strictObject({
  id: pipe(string(), nonEmpty(), maxLength(100), regex(/^[a-z0-9-]+$/)),
  ref: instance(ContentIdentifier),
});

/** Handles the identity (`$pub`) content scheme. */
export const identityScheme = contentScheme<Identity>(async (cid, content, instance) => {
  const { metadata, type, value } = await unwrap(instance, content);
  if (type !== 'sig') return;
  const unwrappedSig = (await metadata.getValue(instance)) as UnwrappedSignature[];
  if (
    Array.isArray(unwrappedSig) &&
    unwrappedSig.some(({ publicKey }) => compareBytes(publicKey, new Uint8Array(cid.value)))
  ) {
    const parse = safeParse(identitySchema, await value.getValue(instance));
    return parse.success ? parse.output : undefined;
  }
});
