import { describe, expect, it } from 'vitest';
import { testRPCStrategyForContent } from '../../testing/rpc-strategy.js';

if (!process.versions.bun) {
  describe.skip('bun:sqlite');
} else {
  describe('bun:sqlite', async () => {
    const sqlite = (await import('./bun.js')).default;

    testRPCStrategyForContent('bun:sqlite', sqlite());

    it('Uses given Database instance', async () => {
      const db = new (await import('bun:sqlite')).Database('');

      db.close();

      expect(() => sqlite(db)).toThrow('Database has closed');
    });
  });
}
