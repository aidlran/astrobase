import { expect, test } from 'vitest';
import { SHA_256 } from '../hashing/index.js';
import { identityPrefix } from '../identity/identity.js';
import { IMMUTABLE_PREFIX } from '../immutable/repository.js';
import { getOrThrow } from '../instance/instance.js';
import { Binary, JSON, Wrap } from '../media-types/media-types.js';
import { MUTABLE_PREFIX } from '../mutable/mutable.js';
import { Common } from './common.js';

test('Common config', () => {
  expect(() => getOrThrow(Common, 'codecs', Binary)).not.toThrow();
  expect(() => getOrThrow(Common, 'codecs', JSON)).not.toThrow();
  expect(() => getOrThrow(Common, 'codecs', Wrap)).not.toThrow();

  expect(() => getOrThrow(Common, 'hashAlgs', SHA_256)).not.toThrow();

  expect(() => getOrThrow(Common, 'procedures', 'content:delete')).not.toThrow();
  expect(() => getOrThrow(Common, 'procedures', 'content:get')).not.toThrow();
  expect(() => getOrThrow(Common, 'procedures', 'content:put')).not.toThrow();

  expect(() => getOrThrow(Common, 'schemes', IMMUTABLE_PREFIX)).not.toThrow();
  expect(() => getOrThrow(Common, 'schemes', MUTABLE_PREFIX)).not.toThrow();
  expect(() => getOrThrow(Common, 'schemes', identityPrefix)).not.toThrow();

  expect(() => getOrThrow(Common, 'wraps', 'crypt')).not.toThrow();
  expect(() => getOrThrow(Common, 'wraps', 'sig')).not.toThrow();
});
