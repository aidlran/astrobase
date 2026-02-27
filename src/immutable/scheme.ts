import { contentScheme } from '../content/content-scheme.js';
import { fileScheme } from '../file/parse.js';
import { validateHash } from '../hashing/utils.js';

/**
 * Handles parsing for the immutable content identifier scheme. Wraps the parse handler provided by
 * the File module and additionally validates the hash within the content identifier.
 */
export const immutableScheme = contentScheme(async (cid, content, instance) => {
  if (await validateHash(instance, cid.value, content)) {
    return fileScheme.parse(cid, content, instance);
  }
});
