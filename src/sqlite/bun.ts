/** @module SQLite/Bun */

import { Database, type DatabaseOptions } from 'bun:sqlite';
import type { ContentProcedures } from '../content/procedures.js';
import type { ClientStrategy } from '../rpc/client/client-strategy.js';

/**
 * Configuration options for `bun:sqlite`. Please refer to [Bun
 * docs](https://bun.com/docs/runtime/sqlite#database).
 */
export interface SQLiteClientConfig extends DatabaseOptions {
  /**
   * The database file name. You can create an in-memory database by passing `':memory:'`, `''`, or
   * `undefined`.
   */
  filename?: string;
}

/**
 * Creates a {@link ClientStrategy} for `bun:sqlite`.
 *
 * @param config A {@link SQLiteClientConfig} object to configure the database, or a database
 *   instance you've manually created.
 */
export default function (config?: SQLiteClientConfig | Database) {
  let SQL: Database;

  if (!config) {
    SQL = new Database();
  } else if (config instanceof Database) {
    SQL = config;
  } else {
    const { filename, ...rest } = config;
    SQL = new Database(filename, Object.keys(rest).length ? rest : undefined);
  }

  process.on('exit', () => SQL.close());

  SQL.run(
    `CREATE TABLE IF NOT EXISTS astrobase (
        cid TEXT PRIMARY KEY,
        content BLOB NOT NULL
      ) WITHOUT ROWID`,
  );

  return {
    'content:delete'(cid) {
      SQL.run<[string]>('DELETE FROM astrobase WHERE cid = ?', [cid.toString()]);
    },

    'content:get'(cid) {
      const result = SQL.prepare<{ content: Buffer }, [string]>(
        'SELECT content FROM astrobase WHERE cid = ?',
      ).get(cid.toString())?.content;
      return result ? new Uint8Array(result) : undefined;
    },

    'content:put'({ cid, content }) {
      SQL.run<[string, Uint8Array]>(
        'INSERT OR REPLACE INTO astrobase (cid, content) VALUES (?, ?)',
        [cid.toString(), content],
      );
    },
  } satisfies Required<Omit<ClientStrategy<ContentProcedures>, '*'>>;
}
