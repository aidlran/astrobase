import type { ContentIdentifier } from '../cid/cid.js';
import type { Instance } from '../instance/instance.js';
import type { MaybePromise } from '../internal/maybe-promise.js';

/**
 * Performs validation and parses content from a content identifier and content buffer pair.
 *
 * @template T The type returned after a successful parse.
 * @param identifier The {@link ContentIdentifier}.
 * @param content The content buffer.
 * @param instance The instance.
 * @returns The parsed value, or undefined if invalid. Can be a promise.
 */
export type ContentSchemeParser<T> = (
  identifier: ContentIdentifier,
  content: Uint8Array<ArrayBuffer>,
  instance: Instance,
) => MaybePromise<T | undefined>;

/**
 * When included on a {@link ContentScheme}, this changes the way content is resolved - all clients
 * are queried and all valid items are passed to this reducer, which must return the best option.
 *
 * @template T The type of the parsed content.
 * @param identifier The {@link ContentIdentifier}.
 * @param contents The array of potential parsed content.
 * @param instance The instance.
 * @returns The reduced, chosen value to settle on.
 */
export type ContentSchemeReducer<T> = (
  identifier: ContentIdentifier,
  contents: T[],
  instance: Instance,
) => MaybePromise<T | undefined>;

/**
 * Describes how to handle content for a particular content scheme, including validation and
 * parsing.
 *
 * @template T The type returned after a successful parse.
 */
export interface ContentScheme<T> {
  /**
   * Performs validation and parses content from a content identifier and content buffer pair.
   *
   * @template T The type returned after a successful parse.
   * @param identifier The {@link ContentIdentifier}.
   * @param content The content buffer.
   * @param instance The instance.
   * @returns The parsed value, or undefined if invalid. Can be a promise.
   */
  parse: ContentSchemeParser<T>;

  /**
   * When included on a {@link ContentScheme}, this changes the way content is resolved - all clients
   * are queried and all valid items are passed to this reducer, which must return the best option.
   *
   * @template T The type of the parsed content.
   * @param identifier The {@link ContentIdentifier}.
   * @param contents The array of potential parsed content.
   * @param instance The instance.
   * @returns The reduced, chosen value to settle on.
   */
  reduce?: ContentSchemeReducer<T>;
}

export const contentScheme = <T>(
  /**
   * Performs validation and parses content from a content identifier and content buffer pair.
   *
   * @template T The type returned after a successful parse.
   * @param identifier The {@link ContentIdentifier}.
   * @param content The content buffer.
   * @param instance The instance.
   * @returns The parsed value, or undefined if invalid. Can be a promise.
   */
  parse: ContentSchemeParser<T>,

  /**
   * When included on a {@link ContentScheme}, this changes the way content is resolved - all clients
   * are queried and all valid items are passed to this reducer, which must return the best option.
   *
   * @template T The type of the parsed content.
   * @param identifier The {@link ContentIdentifier}.
   * @param contents The array of potential parsed content.
   * @param instance The instance.
   * @returns The reduced, chosen value to settle on.
   */
  reduce?: ContentSchemeReducer<T>,
): ContentScheme<T> => ({ parse, reduce });
