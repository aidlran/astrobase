/**
 * @module Instance
 * @experimental
 */

import type { ContentIdentifierSchemeParser } from '../cid/cid.js';
import type { Codec } from '../codecs/codecs.js';
import type { CryptModule } from '../crypt/index.js';
import type { HashFn } from '../hashing/types.js';
import type { KeyDerivationFn } from '../kdf/kdf.js';
import type { Middleware } from '../middleware/types.js';
import type { ProcedureExecutor } from '../rpc/server/server.js';
import type { SignatureModule } from '../signatures/modules.js';
import type { WrapModule } from '../wraps/types.js';

/**
 * An instance configuration object that can be passed in to {@link createInstance} and merged to
 * create a full {@link Instance}.
 */
export interface InstanceConfig {
  /** A set of RPC clients. */
  clients?: any[];

  /** A dict of content type string keys & codec implementation values. */
  codecs?: Partial<Record<string, Codec>>;

  /** A dict of encryption algorithm identifiers & their implementations. */
  cryptAlgs?: Partial<Record<string, CryptModule>>;

  /** A dict of hashing algorithm identifiers & their implementations. */
  hashAlgs?: Partial<Record<number, HashFn>>;

  /** A dict of key derivation function identifiers & their implementations. */
  kdf?: Partial<Record<string, KeyDerivationFn>>;

  /** A set of middlewares. These instance level middlewares are ran for all codecs. */
  middlewares?: Middleware[];

  /** A dict of procedure name keys & procedure implementation values. */
  procedures?: Partial<Record<string, ProcedureExecutor<any, any>>>;

  /** A dict of content identifier scheme keys & scheme parser values. */
  schemes?: Partial<Record<string, ContentIdentifierSchemeParser<unknown>>>;

  /** A dict of cryptographic signature algorithm identifiers & their implementations. */
  sigAlgs?: Partial<Record<string, SignatureModule>>;

  /** A dict of wrap name keys & wrap implementation values. */
  wraps?: Partial<Record<string, WrapModule<any, any>>>;
}

/** A fully configured instance configuration. */
export type Instance = Required<InstanceConfig>;

/** An {@link InstanceConfig} category. */
export type InstanceFeature = keyof InstanceConfig;

/** Configuration items that are declared as a dicts/maps. */
export const dicts = [
  'codecs',
  'cryptAlgs',
  'hashAlgs',
  'kdf',
  'procedures',
  'schemes',
  'sigAlgs',
  'wraps',
] as const satisfies InstanceFeature[];

/** Configuration items that are declared as a arrays/sets. */
export const sets = ['clients', 'middlewares'] as const satisfies InstanceFeature[];

/** Takes one or more configuration objects and merges them to create a full instance config. */
export function createInstance(...configs: InstanceConfig[]): Instance {
  Object.fromEntries([...sets.map((k) => [k, []]), ...dicts.map((k) => [k, {}])]);

  const instance = Object.fromEntries([
    ...dicts.map((k) => [k, {}]),
    ...sets.map((k) => [k, []]),
  ]) as Instance;

  for (const config of configs) {
    for (const map of dicts) {
      if (config[map]) {
        instance[map] = Object.assign(instance[map], config[map]) as never;
      }
    }
    for (const set of sets) {
      if (config[set]) {
        instance[set].push(...(config[set] as never[]));
      }
    }
  }

  return instance;
}

/** An error thrown by {@link getOrThrow} if the target item is not available. */
export class InstanceReferenceError<T extends (typeof dicts)[number]> extends ReferenceError {
  constructor(type: T, key: keyof Instance[T]) {
    super(`Not found: instance['${type}']['${key.toString()}']`);
  }
}

/**
 * Retrieves an item from the instance configuration. If the target item is not available,
 * {@link InstanceReferenceError} is thrown.
 */
export function getOrThrow<T extends (typeof dicts)[number]>(
  instance: Instance,
  type: T,
  key: keyof Instance[T],
) {
  const value = instance[type][key];
  if (!value) {
    throw new InstanceReferenceError(type, key);
  }
  return value;
}
