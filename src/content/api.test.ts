import { describe, expect, it, test, vi } from 'vitest';
import { ContentIdentifier } from '../cid/cid.js';
import { inMemory } from '../in-memory/in-memory-client.js';
import { createInstance } from '../instance/instance.js';
import type { ClientConfig } from '../rpc/client/client-set.js';
import { deleteContent, getContent, putContent } from './api.js';
import {
  contentScheme,
  type ContentSchemeParser,
  type ContentSchemeReducer,
} from './content-scheme.js';
import type { ContentProcedures } from './procedures.js';

test('deleteContent', async () => {
  const clientA = inMemory();
  const clientB = inMemory();

  const fnA = (clientA['content:delete'] = vi.fn(clientA['content:delete']));
  const fnB = (clientB['content:delete'] = vi.fn(clientB['content:delete']));

  const cid = new ContentIdentifier('test', []);

  const instance = createInstance({
    clients: [{ strategy: clientA }, { strategy: clientB }],
  });

  await expect(deleteContent(cid, instance)).resolves.toBeUndefined();

  expect(fnA).toHaveBeenCalledExactlyOnceWith(cid, instance);
  expect(fnB).toHaveBeenCalledExactlyOnceWith(cid, instance);
});

describe('getContent', () => {
  describe('First mode', () => {
    it('Returns first valid resolved item', async () => {
      const instance = createInstance({
        clients: [1, 2, 3, 4].map((value) => ({
          strategy: { 'content:get': () => [value] },
        })) satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
        schemes: { test: { parse: (_cid, content) => (content[0] == 3 ? content : undefined) } },
      });

      await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        new Uint8Array([3]),
      );
    });

    it('Skips parser if no clients return a value', async () => {
      const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>((_cid, content) => content);

      const instance = createInstance({
        clients: [{ strategy: { 'content:get': () => undefined } }] satisfies ClientConfig<
          Pick<ContentProcedures, 'content:get'>
        >[],
        schemes: { test: contentScheme(parse) },
      });

      await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        undefined,
      );

      expect(parse).not.toHaveBeenCalled();
    });

    it('Returns undefined if no valid items', () => {
      const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>(() => undefined);

      const instance = createInstance({
        clients: [{ strategy: { 'content:get': () => [1] } }] satisfies ClientConfig<
          Pick<ContentProcedures, 'content:get'>
        >[],
        schemes: { test: contentScheme(parse) },
      });

      return expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        undefined,
      );
    });

    it('Processes groups sequentially', async () => {
      const priority1Parse = vi.fn(() => {
        expect(priority0Parse).toHaveBeenCalledTimes(2);
        new Uint8Array([1]);
      });

      const priority0Parse = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              expect(priority1Parse).not.toHaveBeenCalled();
              resolve([1]);
            }, 100),
          ),
      );

      const instance = createInstance({
        clients: [
          { strategy: { 'content:get': priority1Parse as never }, priority: 1 },
          { strategy: { 'content:get': priority0Parse as never }, priority: 0 },
          { strategy: { 'content:get': priority0Parse as never }, priority: 0 },
        ] satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
        schemes: { test: contentScheme(() => undefined) },
      });

      await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        undefined,
      );

      expect(priority1Parse).toHaveBeenCalled();
    });
  });

  describe('Reduce mode', () => {
    it('Returns value chosen by reducer', async () => {
      const values = [1, 2, 3, 4];

      const instance = createInstance({
        clients: values.map((value) => ({
          strategy: { 'content:get': () => [value] },
        })) satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
        schemes: {
          test: contentScheme(
            (_cid, content) => content,
            (_cid, contents) => {
              expect(contents).toEqual(values.map((value) => new Uint8Array([value])));
              return contents[2];
            },
          ),
        },
      });

      await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        new Uint8Array([3]),
      );
    });

    it('Returns undefined if no valid items', async () => {
      const values = [1, 2, 3, 4];

      const instance = createInstance({
        clients: values.map((value) => ({
          strategy: { 'content:get': () => [value] },
        })) satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
        schemes: {
          test: contentScheme(
            (_cid, content) => content,
            (_cid, contents) => {
              expect(contents).toEqual(values.map((value) => new Uint8Array([value])));
              return undefined;
            },
          ),
        },
      });

      await expect(
        getContent(new ContentIdentifier('test', []), instance),
      ).resolves.toBeUndefined();
    });

    test('Skips parser and reducer if no clients return a value', async () => {
      const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>((_cid, content) => content);

      const reduce = vi.fn<ContentSchemeReducer<Uint8Array<ArrayBuffer>>>(
        (_cid, contents) => contents[0],
      );

      const instance = createInstance({
        clients: [{ strategy: { 'content:get': () => undefined } }] satisfies ClientConfig<
          Pick<ContentProcedures, 'content:get'>
        >[],
        schemes: { test: contentScheme(parse, reduce) },
      });

      await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
        undefined,
      );

      expect(parse).not.toHaveBeenCalled();
      expect(reduce).not.toHaveBeenCalled();
    });

    describe('Skips reducer if only 0 or 1 valid parsed items', () => {
      test('1 client; returns valid', async () => {
        const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>(
          (_cid, content) => content,
        );

        const reduce = vi.fn<ContentSchemeReducer<Uint8Array<ArrayBuffer>>>(
          (_cid, contents) => contents[0],
        );

        const instance = createInstance({
          clients: [{ strategy: { 'content:get': () => [0] } }] satisfies ClientConfig<
            Pick<ContentProcedures, 'content:get'>
          >[],
          schemes: { test: contentScheme(parse, reduce) },
        });

        await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
          new Uint8Array([0]),
        );

        expect(parse).toHaveBeenCalledOnce();
        expect(reduce).not.toHaveBeenCalled();
      });

      test('Many clients; none return valid', async () => {
        const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>(() => undefined);

        const reduce = vi.fn<ContentSchemeReducer<Uint8Array<ArrayBuffer>>>(
          (_cid, contents) => contents[0],
        );

        const instance = createInstance({
          clients: [0, 1, undefined].map((n) => ({
            strategy: { 'content:get': () => (typeof n === 'number' ? [n] : undefined) },
          })) satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
          schemes: { test: contentScheme(parse, reduce) },
        });

        await expect(
          getContent(new ContentIdentifier('test', []), instance),
        ).resolves.toBeUndefined();

        expect(parse).toHaveBeenCalledTimes(2);
        expect(reduce).not.toHaveBeenCalled();
      });

      test('Many clients; only 1 returns valid', async () => {
        const parse = vi.fn<ContentSchemeParser<Uint8Array<ArrayBuffer>>>((_cid, content) =>
          content[0] == 0 ? content : undefined,
        );

        const reduce = vi.fn<ContentSchemeReducer<Uint8Array<ArrayBuffer>>>(
          (_cid, contents) => contents[0],
        );

        const instance = createInstance({
          clients: [0, 1, undefined].map((n) => ({
            strategy: { 'content:get': () => (typeof n === 'number' ? [n] : undefined) },
          })) satisfies ClientConfig<Pick<ContentProcedures, 'content:get'>>[],
          schemes: { test: contentScheme(parse, reduce) },
        });

        await expect(getContent(new ContentIdentifier('test', []), instance)).resolves.toEqual(
          new Uint8Array([0]),
        );

        expect(parse).toHaveBeenCalledTimes(2);
        expect(reduce).not.toHaveBeenCalled();
      });
    });
  });
});

describe('putContent', () => {
  test('With validate disabled', async () => {
    const clientA = inMemory();
    const clientB = inMemory();

    const fnA = (clientA['content:put'] = vi.fn(clientA['content:put']));
    const fnB = (clientB['content:put'] = vi.fn(clientB['content:put']));

    const cid = new ContentIdentifier('test', []);

    const instance = createInstance({
      clients: [{ strategy: clientA }, { strategy: clientB }],
    });

    await expect(putContent(cid, '', { instance, validate: false })).resolves.toBeUndefined();

    expect(fnA).toHaveBeenCalledExactlyOnceWith({ cid, content: new Uint8Array([]) }, instance);
    expect(fnB).toHaveBeenCalledExactlyOnceWith({ cid, content: new Uint8Array([]) }, instance);
  });

  test.todo('With validate enabled');
});
