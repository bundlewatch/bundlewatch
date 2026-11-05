import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { replaceJsonValues } from './json-edit.ts';

describe('replaceJsonValues', () => {
  test('changes only the replaced values, keeping the rest byte for byte', () => {
    const text = [
      '{',
      '\t"name": "caf\\u00e9",',
      '\t"version": 1.0,',
      '\t"bundlewatch": {',
      '\t\t"files": [ { "path": "./a.js", "maxSize": "1kB" },',
      '\t\t\t{"maxSize":1024,"path":"./b.js"} ],',
      '\t\t"ci": { "trackBranches": [] }',
      '\t}',
      '}',
      '',
    ].join('\r\n');
    const result = replaceJsonValues(text, [
      { path: ['bundlewatch', 'files', 0, 'maxSize'], from: '1kB', to: '12kB' },
      { path: ['bundlewatch', 'files', 1, 'maxSize'], from: 1024, to: 13312 },
    ]);
    assert.equal(
      result,
      text.replace('"maxSize": "1kB"', '"maxSize": "12kB"').replace('1024', '13312'),
    );
  });

  test('edits the last of duplicate keys, the one JSON.parse reads', () => {
    const text = '{"files":[{"maxSize":"1kB","maxSize":"2kB"}]}';
    assert.equal(
      replaceJsonValues(text, [{ path: ['files', 0, 'maxSize'], from: '2kB', to: '3kB' }]),
      '{"files":[{"maxSize":"1kB","maxSize":"3kB"}]}',
    );
  });

  test('handles escaped quotes and brackets inside strings', () => {
    const text = '{"files":[{"path":"./[\\"}]\\\\.js","maxSize":"1kB"}]}';
    const result = replaceJsonValues(text, [
      { path: ['files', 0, 'maxSize'], from: '1kB', to: '2kB' },
    ]);
    assert.deepEqual(JSON.parse(result), {
      files: [{ path: './["}]\\.js', maxSize: '2kB' }],
    });
  });

  test('refuses a value that has changed or does not exist', () => {
    const text = '{"files":[{"path":"a.js","maxSize":"1kB"}]}';
    assert.throws(
      () => replaceJsonValues(text, [{ path: ['files', 0, 'maxSize'], from: '2kB', to: '3kB' }]),
      /files\.0\.maxSize is no longer "2kB"/,
    );
    assert.throws(
      () => replaceJsonValues(text, [{ path: ['files', 1, 'maxSize'], from: '1kB', to: '3kB' }]),
      /no longer/,
    );
  });

  test('rejects invalid JSON', () => {
    assert.throws(() => replaceJsonValues('{ files: [] }', []), SyntaxError);
  });
});
