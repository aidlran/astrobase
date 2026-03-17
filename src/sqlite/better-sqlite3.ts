/** @module SQLite/better-sqlite3 */

import Database from 'better-sqlite3';
import type { ContentProcedures } from '../content/procedures.js';
import type { ClientStrategy } from '../rpc/client/client-strategy.js';

/**
 * Configuration options for SQLite. Please refer to [`better-sqlite3` API
 * docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#new-databasepath-options).
 */
export interface SQLiteClientConfig extends Database.Options {
  /**
   * Database file name. You can create an in-memory database by passing ":memory:". You can create
   * a temporary database by passing an empty string or omitting.
   */
  filename?: string | Buffer;
}

/**
 * Creates a {@link ClientStrategy} for SQLite3.
 *
 * This is implemented using [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) - a peer
 * dependency. You'll need to install it for your app:
 *
 * ```sh
 * npm i better-sqlite3
 * ```
 *
 * @param config A {@link SQLiteClientConfig} object to configure the database, or a database
 *   instance you've manually created.
 */
export default function (config: SQLiteClientConfig | Database.Database = {}) {
  const SQL: Database.Database =
    config instanceof Database ? config : new Database(config.filename, config);

  process.on('exit', () => SQL.close());

  SQL.prepare(
    `CREATE TABLE IF NOT EXISTS astrobase (
        cid TEXT PRIMARY KEY,
        content BLOB NOT NULL
      ) WITHOUT ROWID`,
  ).run();

  return {
    'content:delete'(cid) {
      SQL.prepare<string>('DELETE FROM astrobase WHERE cid = ?').run(cid.toString());
    },

    'content:get'(cid) {
      const result = SQL.prepare<string, { content: Buffer }>(
        'SELECT content FROM astrobase WHERE cid = ?',
      ).get(cid.toString())?.content;
      return result ? new Uint8Array(result) : undefined;
    },

    'content:put'({ cid, content }) {
      SQL.prepare<[string, Uint8Array]>(
        'INSERT OR REPLACE INTO astrobase (cid, content) VALUES (?, ?)',
      ).run(cid.toString(), content);
    },
  } satisfies Required<Omit<ClientStrategy<ContentProcedures>, '*'>>;
}
