/** @module Common */

import { BinaryCodec } from '../codecs/binary/binary.js';
import { JsonCodec } from '../codecs/json/json.js';
import { deleteContent, getContent, putContent } from '../content/api.js';
import type { PutRequestPayload } from '../content/procedures.js';
import { CryptWrapModule } from '../crypt/index.js';
import { parseAsFile } from '../file/parse.js';
import { SHA_256, sha256 } from '../hashing/algorithms/sha256.js';
import { prefix as identityPrefix, scheme as identityScheme } from '../identity/identity.js';
import { Immutable, IMMUTABLE_PREFIX } from '../immutable/index.js';
import { createInstance } from '../instance/instance.js';
import { Binary, JSON as JsonMediaType, Wrap } from '../media-types/media-types.js';
import { MUTABLE_PREFIX } from '../mutable/mutable.js';
import { WithSignatureWraps } from '../signatures/wrap.js';
import { WrapCodec } from '../wraps/codec.js';

/**
 * A base instance config that provides implementations for many built-ins.
 *
 * This design enables a "batteries included" experience with minimal configuration, while also
 * allowing unparalleled tree-shakability and customisation. Many applications can use this config
 * as a base, with additional configs extending or even overriding features. In special cases, the
 * config can not be imported into the application at all, instead allowing a custom configuration
 * to load only the functionality needed and leaving base functionality to be tree-shaken away.
 *
 * @example
 *
 *     import { Common } from '@astrobase/sdk/common';
 *     import { createInstance } from '@astrobase/sdk/instance';
 *
 *     const instance = createInstance(
 *       Common,
 *       // additional functionality
 *     );
 */
export const Common = createInstance(WithSignatureWraps, {
  codecs: {
    [JsonMediaType]: JsonCodec,
    [Binary]: BinaryCodec,
    [Wrap]: WrapCodec,
  },
  hashAlgs: {
    [SHA_256]: sha256,
  },
  procedures: {
    'content:delete': deleteContent,
    'content:get': getContent,
    'content:put': (req, instance) =>
      putContent((req as PutRequestPayload).cid, (req as PutRequestPayload).content, { instance }),
  },
  schemes: {
    [IMMUTABLE_PREFIX]: Immutable,
    [MUTABLE_PREFIX]: parseAsFile,
    [identityPrefix]: identityScheme,
  },
  wraps: {
    crypt: CryptWrapModule,
  },
});
