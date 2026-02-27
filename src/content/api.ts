import { ContentIdentifier, type ContentIdentifierLike } from '../cid/cid.js';
import { getOrThrow, type Instance } from '../instance/instance.js';
import { payloadToBytes } from '../internal/encoding.js';
// prettier-ignore
import { buildQueue, callProcedure, callProcedureAll, filterByProcedure } from '../rpc/client/index.js';
import type { ContentScheme } from './content-scheme.js';
import type { ContentProcedures } from './procedures.js';

/**
 * Invokes the `content:delete` procedure via all clients that support it.
 *
 * @param cid A valid {@link ContentIdentifierLike} value.
 * @param instance The {@link Instance} config to use.
 * @returns A promise that resolves once all requests are completed.
 */
export async function deleteContent(cid: ContentIdentifierLike, instance: Instance) {
  await Promise.allSettled(
    callProcedureAll(instance, 'content:delete', new ContentIdentifier(cid)),
  );
}

/**
 * Retrieves an item of content, querying available clients and parsing the content bytes according
 * to a {@link ContentScheme}. Depending on the content scheme implementation (whether it includes a
 * reducer function), this is handled in two different modes:
 *
 * - **First Mode:** If the content scheme implementation **does not** have a reducer, then a
 *   mechanism similar to `Promise.race` is used to query groups of clients asynchronously in
 *   priority order. However, rather than returning the first resolved promise, it additionally
 *   validates and parses the content, thereby returning the first resolved promise **with a valid
 *   result**. This works well for immutable content, where there is only 1 possible permutation of
 *   valid content. It can return early and avoid querying all clients, which means maintaining a
 *   high priority cache becomes very effective.
 * - **Reduce Mode:** If the content scheme implementation **does** have a reducer, then all clients
 *   are queried and parsed asynchronously, and all valid content values are collected and passed
 *   the the reducer, which returns the final content. This supports mutable content schemes where
 *   there can be more than one possible permutation of valid content - the reducer can choose the
 *   most authoritative one.
 *
 * @template T The type of the content after being parsed.
 * @param cid A valid {@link ContentIdentifierLike} value.
 * @param instance The instance to use for this request.
 * @param overrideContentScheme An optional {@link ContentScheme} override to use.
 * @returns A promise that resolves with the parsed content, or `undefined` if nothing acceptable
 *   was found.
 */
export async function getContent<T>(
  cid: ContentIdentifierLike,
  instance: Instance,
  overrideContentScheme?: ContentScheme<T>,
) {
  cid = new ContentIdentifier(cid);

  const scheme = (overrideContentScheme ??
    getOrThrow(instance, 'schemes', cid.prefix)) as ContentScheme<T>;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const filteredClients = filterByProcedure(instance.clients, 'content:get');

  if (!filteredClients.length) {
    return;
  }

  if (scheme.reduce) {
    const all = (
      await Promise.all(
        filteredClients.map(async (client) => {
          try {
            const content = await callProcedure<ContentProcedures, 'content:get'>(
              instance,
              client.strategy,
              'content:get',
              cid,
            );

            if (content) {
              return await scheme.parse(cid, new Uint8Array(content), instance);
            }
          } catch {
            /* empty */
          }
        }),
      )
    ).filter((result) => result !== undefined && result !== null);

    switch (all.length) {
      case 0:
        return;
      case 1:
        return all[0];
      default:
        return scheme.reduce(cid, all, instance);
    }
  }

  const queue = buildQueue<ContentProcedures>(filteredClients);

  let todo = queue.reduce((count, next) => count + next.length, 0);
  let resolved = false;

  // eslint-disable-next-line no-async-promise-executor
  return new Promise<T | undefined>(async (resolve) => {
    const handleNull = () => {
      if (--todo == 0 && !resolved) {
        resolve(undefined);
      }
    };

    for (const group of queue) {
      await Promise.allSettled(
        group.map(async (strategy) =>
          callProcedure(instance, strategy, 'content:get', cid)
            .then((content) => {
              if (content) {
                return scheme.parse(cid, new Uint8Array(content), instance);
              }
            })
            .then((content) => {
              if (!resolved) {
                if (content === undefined || content === null) {
                  handleNull();
                } else {
                  resolved = true;
                  resolve(content);
                }
              }
            })
            .catch(handleNull),
        ),
      );
    }
  });
}

/** Additional options for the {@link putContent} API. */
export interface PutOptions {
  /** The instance to use for this request. */
  instance: Instance;

  /**
   * Whether to validate the content and identifier using registered schemes.
   *
   * @default true
   */
  validate?: boolean;
}

/**
 * Saves an item of content. Invokes the `content:put` procedure via all clients that support it.
 *
 * @param cid A valid {@link ContentIdentifierLike} value for the content.
 * @param content The content to save in binary form.
 * @param options Additional {@link PutOptions}.
 * @returns A promise that resolves once all requests are completed.
 */
export async function putContent(
  cid: ContentIdentifierLike,
  content: ArrayLike<number> | ArrayBuffer | string,
  options: PutOptions,
) {
  cid = new ContentIdentifier(cid);
  const contentBuf = payloadToBytes(content);
  if (options.validate ?? true) {
    const scheme = getOrThrow(options.instance, 'schemes', cid.prefix);
    let parsed: unknown;
    try {
      parsed = await scheme.parse(cid, contentBuf, options.instance);
    } catch {
      // fallthrough
    }
    if (parsed === undefined || parsed === null) {
      throw new TypeError('Content failed validation');
    }
  }
  await Promise.allSettled(
    callProcedureAll(options.instance, 'content:put', { cid, content: contentBuf }),
  );
}
