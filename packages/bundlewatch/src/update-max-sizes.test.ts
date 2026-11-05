import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { FileDetails } from '@bundlewatch/core';

import { ArgumentError } from './args.ts';
import type { FileConfig } from './config.ts';
import type { Measurement } from './measure.ts';
import { parseHeadroom, planMaxSizeUpdates } from './update-max-sizes.ts';

const measured = (
  entry: number,
  filePath: string,
  size: number,
  maxSize: number,
  compression = 'gzip',
  key = filePath,
): Measurement => ({
  entry,
  filePath,
  key,
  details: { size, maxSize, compression } satisfies FileDetails,
});

const newMaxSizes = (
  files: FileConfig[],
  measurements: Measurement[],
  headroom = 0,
): Record<string, string | number> =>
  Object.fromEntries(
    planMaxSizeUpdates(files, measurements, headroom).updates.map((update) => [
      update.path,
      update.newMaxSize,
    ]),
  );

describe('planMaxSizeUpdates', () => {
  test('raises only exceeded limits, rounding up to the next KB', () => {
    const files = [
      { path: 'over-by-one.js', maxSize: '1kB' },
      { path: 'exactly-at-limit.js', maxSize: '1kB' },
      { path: 'under.js', maxSize: '10kB' },
      { path: 'unlimited.js' },
    ];
    const measurements = [
      measured(0, 'over-by-one.js', 1025, 1024),
      measured(1, 'exactly-at-limit.js', 1024, 1024),
      measured(2, 'under.js', 5000, 10_240),
      measured(3, 'unlimited.js', 1_000_000, Number.POSITIVE_INFINITY),
    ];
    assert.deepEqual(newMaxSizes(files, measurements), { 'over-by-one.js': '2kB' });
  });

  test('keeps a new limit that is already a whole number of KB', () => {
    assert.deepEqual(
      newMaxSizes([{ path: 'a.js', maxSize: '1kB' }], [measured(0, 'a.js', 2048, 1024)]),
      { 'a.js': '2kB' },
    );
  });

  test('adds headroom before rounding', () => {
    const files = [{ path: 'a.js', maxSize: '1kB' }];
    const measurements = [measured(0, 'a.js', 2000, 1024)];
    assert.deepEqual(newMaxSizes(files, measurements, 1024), { 'a.js': '3kB' });
    assert.deepEqual(newMaxSizes(files, measurements, 100), { 'a.js': '3kB' });
    assert.deepEqual(newMaxSizes(files, measurements, 48), { 'a.js': '2kB' });
  });

  test('fits the largest file of a glob, whatever order the files come in', () => {
    const files = [{ path: './dist/*.js', maxSize: '1kB' }];
    const measurements = [
      measured(0, './dist/a.js', 1500, 1024),
      measured(0, './dist/b.js', 5000, 1024),
      measured(0, './dist/c.js', 900, 1024),
    ];
    for (const order of [measurements, measurements.toReversed()]) {
      const [update] = planMaxSizeUpdates(files, order, 0).updates;
      assert.equal(update?.newMaxSize, '5kB');
      assert.equal(update?.largest.filePath, './dist/b.js');
    }
  });

  test('raises the last entry matching a file, whose limit the check applies', () => {
    const files = [
      { path: './dist/*.js', maxSize: '1kB' },
      { path: './dist/big.js', maxSize: '4kB' },
    ];
    const measurements = [
      measured(0, './dist/small.js', 1500, 1024),
      measured(0, './dist/big.js', 5000, 1024),
      measured(1, './dist/big.js', 5000, 4096),
    ];
    assert.deepEqual(newMaxSizes(files, measurements), {
      './dist/*.js': '2kB',
      './dist/big.js': '5kB',
    });
  });

  test('tells files apart by path when normalized names collide', () => {
    const files = [
      { path: './app.*.js', maxSize: '1kB' },
      { path: './app.bbb.js', maxSize: '2kB' },
    ];
    const measurements = [
      measured(0, './app.aaa.js', 5000, 1024, 'gzip', './app.js'),
      measured(0, './app.bbb.js', 1500, 1024, 'gzip', './app.js'),
      measured(1, './app.bbb.js', 1500, 2048, 'gzip', './app.js'),
    ];
    assert.deepEqual(newMaxSizes(files, measurements), { './app.*.js': '5kB' });
  });

  test('refuses a limit too large to read back exactly', () => {
    assert.throws(
      () =>
        planMaxSizeUpdates(
          [{ path: 'a.js', maxSize: '1kB' }],
          [measured(0, 'a.js', 2000, 1024)],
          Number.MAX_SAFE_INTEGER,
        ),
      (error: unknown) => error instanceof ArgumentError && /too large/.test(error.message),
    );
  });

  test('writes the new limit in the style of the current one', () => {
    const cases: [FileConfig['maxSize'], string | number][] = [
      ['1kB', '3kB'],
      ['1KB', '3KB'],
      ['1 kb', '3 kb'],
      ['1.5kB', '3kB'],
      [1024, 3072],
      ['0.001MB', '3kB'],
      ['1000', '3kB'],
    ];
    for (const [maxSize, expected] of cases) {
      const [update] = planMaxSizeUpdates(
        [{ path: 'a.js', maxSize }],
        [measured(0, 'a.js', 2100, 1)],
        0,
      ).updates;
      assert.equal(update?.newMaxSize, expected, String(maxSize));
    }
  });

  test('returns measurement errors separately', () => {
    const missing: Measurement = {
      entry: 1,
      filePath: './missing/*.js',
      key: './missing/*.js',
      details: { error: 'There is no matching file for ./missing/*.js' },
    };
    const { updates, errors } = planMaxSizeUpdates(
      [
        { path: 'a.js', maxSize: '1kB' },
        { path: './missing/*.js', maxSize: '1kB' },
      ],
      [measured(0, 'a.js', 2000, 1024), missing],
      0,
    );
    assert.equal(updates.length, 1);
    assert.deepEqual(errors, [missing]);
  });
});

describe('parseHeadroom', () => {
  test('reads sizes with the units of maxSize', () => {
    assert.equal(parseHeadroom(undefined), 0);
    assert.equal(parseHeadroom('0'), 0);
    assert.equal(parseHeadroom('512'), 512);
    assert.equal(parseHeadroom('512B'), 512);
    assert.equal(parseHeadroom('1KB'), 1024);
    assert.equal(parseHeadroom('1.5kb'), 1536);
    assert.equal(parseHeadroom('2 MB'), 2 * 1024 * 1024);
  });

  test('rejects sizes too large to add exactly', () => {
    for (const value of [`1${'0'.repeat(24)}KB`, `${'9'.repeat(309)}KB`]) {
      assert.throws(() => parseHeadroom(value), /too large/, value);
    }
  });

  test('rejects anything else, including spellings maxSize reads as bytes', () => {
    for (const value of ['', '-1KB', '+1KB', '1k', '1KiB', 'lots', '1KB extra', '.5KB']) {
      assert.throws(() => parseHeadroom(value), ArgumentError, value);
    }
  });
});
