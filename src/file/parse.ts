import { contentScheme } from '../content/content-scheme.js';
import { FileBuilder } from './file-builder.js';

/**
 * Used to parse and validate content as files by the `Immutable` and `Mutable` content identifier
 * schemes.
 *
 * @internal
 */
export const fileScheme = contentScheme(async (_cid, content, instanceID) => {
  const file = new FileBuilder(content);
  await file.getValue(instanceID); // validate
  return file;
});
