import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { testRPCStrategyForContent } from '../../testing/rpc-strategy.js';
import sqlite from './better-sqlite3.js';

if (process.versions.bun) {
  describe.skip('better-sqlite3');
} else {
  describe('better-sqlite3', () => {
    testRPCStrategyForContent('better-sqlite3', sqlite());

    it('Uses given Database instance', () => {
      const fn = () => sqlite(new Database('').close());
      expect(fn).toThrow('The database connection is not open');
    });
  });
}
