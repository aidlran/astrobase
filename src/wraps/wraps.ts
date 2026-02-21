import { FileBuilder } from '../file/file-builder.js';
import { getOrThrow, type Instance } from '../instance/instance.js';
import type { Unwrapped } from './types.js';
import { fromWrapBuffer, toWrapBuffer } from './wrap-buffer.js';

/**
 * Creates a serialized Wrap buffer.
 *
 * @param instance The Instance config.
 * @param unwrapped The Wrap type, value to wrap, and metadata;
 * @returns The serialized Wrap buffer as a Promise.
 */
export async function wrap(
  instance: Instance,
  unwrapped: Unwrapped,
): Promise<Uint8Array<ArrayBuffer>> {
  const { type, value } = unwrapped;

  const { metadata, payload, typeOverride } = await getOrThrow(instance, 'wraps', type).wrap({
    instance,
    metadata: await unwrapped.metadata.getValue(instance),
    payload: value.buffer,
  });

  return toWrapBuffer({
    metadata: await new FileBuilder()
      .setMediaType(unwrapped.metadata.mediaType.value)
      .setValue(metadata, instance),
    payload,
    type: typeOverride ?? type,
  });
}

/**
 * Parses and unwraps a serialized Wrap buffer.
 *
 * @param instance The Instance config.
 * @param wrapBuffer The serialized Wrap buffer to unwrap.
 * @returns The {@link Unwrapped} value as a Promise.
 */
export async function unwrap(
  instance: Instance,
  wrapBuffer: Uint8Array<ArrayBuffer>,
): Promise<Unwrapped> {
  const wrap = fromWrapBuffer(wrapBuffer);

  const { metadata, payload, typeOverride } = await getOrThrow(instance, 'wraps', wrap.type).unwrap(
    {
      instance,
      metadata: await wrap.metadata.getValue(instance),
      payload: wrap.payload,
    },
  );

  return {
    metadata: await new FileBuilder()
      .setMediaType(wrap.metadata.mediaType.value)
      .setValue(metadata, instance),
    type: typeOverride ?? wrap.type,
    value: new FileBuilder(payload),
  };
}
