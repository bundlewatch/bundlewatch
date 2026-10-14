import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isValidPrefix, validatePrefix } from './prefix.ts';

test('prefix identifiers have exact boundaries and are never normalized', () => {
  for (const prefix of ['storefront', 'admin', '0', 'a-b_2', 'a'.repeat(64)]) {
    assert.equal(isValidPrefix(prefix), true);
    assert.doesNotThrow(() => validatePrefix(prefix));
  }
  assert.doesNotThrow(() => validatePrefix(undefined));
  for (const prefix of [
    '',
    null,
    0,
    false,
    {},
    [],
    'Storefront',
    'a/b',
    '-a',
    '_a',
    'a b',
    ' a',
    'a ',
    'a\n',
    'a\r',
    'a\u2028',
    'é',
    'a'.repeat(65),
  ]) {
    assert.equal(isValidPrefix(prefix), false, JSON.stringify(prefix));
    assert.throws(() => validatePrefix(prefix), /prefix must be/);
  }
});
