import assert from 'node:assert/strict';
import { test } from 'node:test';

import bytes from 'bytes';

import { formatBytes, parseBytes } from './bytes.ts';

test('formatBytes matches bytes@3.1.2', () => {
  const values = [
    0,
    1,
    -1,
    1023,
    1024,
    1025,
    1536,
    38962,
    38995,
    254427,
    1048576,
    1073741824,
    1024 ** 4,
    1024 ** 5 * 3.3,
    0.5,
    Number.POSITIVE_INFINITY,
    Number.NaN,
  ];
  for (let i = 0; i < 2000; i++) {
    values.push(Math.floor(Math.random() * 1024 ** (1 + (i % 5))));
  }
  for (const value of values) {
    assert.equal(formatBytes(value), bytes.format(value), `format(${value})`);
  }
});

test('parseBytes matches bytes@3.1.2', () => {
  const inputs = [
    '100kb',
    '100kB',
    '100KB',
    '2kB',
    '1MB',
    '1.5mb',
    '500kB',
    '15kB',
    '1 KB',
    '100B',
    '100b',
    '100',
    '0',
    '-1kb',
    '+1kb',
    '1.2.3kb',
    'kb',
    '',
    'abc',
    '10 gb',
    '3TB',
    '1pb',
    1024,
    0,
    Number.POSITIVE_INFINITY,
    Number.NaN,
  ];
  for (const input of inputs) {
    assert.equal(parseBytes(input), bytes.parse(input), `parse(${String(input)})`);
  }
});
