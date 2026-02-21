import type { FileBuilder } from '../file/file-builder.js';
import type { Instance } from '../instance/instance.js';
import type { MaybePromise } from '../internal/index.js';

export interface WrapFnContext<TMetadata> {
  /** The instance config. */
  instance: Instance;
  /** The metadata. */
  metadata: TMetadata;
  /** The input value. */
  payload: Uint8Array<ArrayBuffer>;
}

export interface WrapFnResult<TMetadata> {
  /** Metadata for the processed value. */
  metadata: TMetadata;
  /** The processed value. */
  payload: Uint8Array<ArrayBuffer>;
  /** If set, overrides the returned wrap type. Used only for migrating/upgrading legacy wrap types. */
  typeOverride?: string;
}

/** A Wrap function that either wraps or unwraps the input. */
export type WrapFn<TInputMetadata, TOutputMetadata> = (
  context: WrapFnContext<TInputMetadata>,
) => MaybePromise<WrapFnResult<TOutputMetadata>>;

/** A module provided to the Instance config that implements a strategy for a Wrap type. */
export interface WrapModule<TWrappedMetadata, TUnwrappedMetadata> {
  /** The strategy function for unwrapping the value. */
  unwrap: WrapFn<TWrappedMetadata, TUnwrappedMetadata>;
  /** The strategy function for wrapping the value. */
  wrap: WrapFn<TUnwrappedMetadata, TWrappedMetadata>;
}

interface WrapBase<T> {
  /** The Wrap type. */
  type: string;

  /**
   * The metadata for the Wrap implementation. A File is used here for control over the media type
   * used at serialization.
   */
  metadata: FileBuilder<T>;
}

/** An unwrapped value. */
export interface Unwrapped<TValue = unknown, TMetadata = unknown> extends WrapBase<TMetadata> {
  /** The unwrapped value. */
  value: FileBuilder<TValue>;
}

/** A deserialized wrapped value. */
export interface Wrapped<T = unknown> extends WrapBase<T> {
  /** The Wrap buffer. */
  payload: Uint8Array<ArrayBuffer>;
}
