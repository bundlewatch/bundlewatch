import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ArgumentError, parseCliArgs, parseUpdateMaxSizesArgs } from './args.ts';

// Expected values are what commander@5 produced for 0.x's option
// declarations (`--config [configFilePath]` and so on).

describe('parseCliArgs', () => {
  test('reads values and positionals in any order', () => {
    assert.deepEqual(
      parseCliArgs([
        './a.js',
        '--max-size',
        '100kB',
        '--compression=brotli',
        './b.js',
        '--normalize',
        '^(x)$',
      ]),
      {
        values: {
          'max-size': '100kB',
          compression: 'brotli',
          normalize: '^(x)$',
        },
        positionals: ['./a.js', './b.js'],
      },
    );
  });

  test('takes the next argument as the value when it is not an option', () => {
    // As in 0.x, `--max-size ./a.js` reads the path as the size.
    assert.deepEqual(parseCliArgs(['--max-size', './a.js']), {
      values: { 'max-size': './a.js' },
      positionals: [],
    });
  });

  test('treats an option without a value as true, like commander', () => {
    assert.deepEqual(parseCliArgs(['./a.js', '--max-size']), {
      values: { 'max-size': true },
      positionals: ['./a.js'],
    });
    assert.deepEqual(parseCliArgs(['--max-size', '--compression', 'gzip', './a.js']), {
      values: { 'max-size': true, compression: 'gzip' },
      positionals: ['./a.js'],
    });
  });

  test('keeps an empty inline value and equals signs in values', () => {
    assert.deepEqual(parseCliArgs(['--normalize=a=b', '--config=']), {
      values: { normalize: 'a=b', config: '' },
      positionals: [],
    });
  });

  test('reads help and version flags', () => {
    assert.deepEqual(parseCliArgs(['-h', '-V']).values, {
      help: true,
      version: true,
    });
    assert.deepEqual(parseCliArgs(['--help', '--version']).values, {
      help: true,
      version: true,
    });
  });

  test('treats everything after -- as positionals', () => {
    assert.deepEqual(parseCliArgs(['--', '--max-size', '-x']), {
      values: {},
      positionals: ['--max-size', '-x'],
    });
  });

  test('rejects unknown options', () => {
    for (const arg of ['--nope', '-x', '--max-size-typo=1']) {
      assert.throws(() => parseCliArgs([arg]), ArgumentError, arg);
    }
  });
});

describe('parseUpdateMaxSizesArgs', () => {
  test('reads --write, --headroom and --config in any order', () => {
    assert.deepEqual(
      parseUpdateMaxSizesArgs(['--headroom', '1KB', '--write', '--config=custom.json']),
      { write: true, help: false, headroom: '1KB', config: 'custom.json' },
    );
    assert.deepEqual(parseUpdateMaxSizesArgs([]), { write: false, help: false });
  });

  test('never reads the argument after --write as its value', () => {
    assert.throws(() => parseUpdateMaxSizesArgs(['--write', 'custom.json']), /takes no file globs/);
    assert.throws(() => parseUpdateMaxSizesArgs(['--write=false']), /--write takes no value/);
  });

  test('requires values for --headroom and --config', () => {
    for (const args of [['--headroom'], ['--headroom', '--write'], ['--config='], ['--config']]) {
      assert.throws(() => parseUpdateMaxSizesArgs(args), /needs a value/, args.join(' '));
    }
  });

  test('ignores a -- passed on by a package manager', () => {
    assert.equal(parseUpdateMaxSizesArgs(['--', '--write']).write, true);
  });

  test('rejects globs, unknown options and the options of the check', () => {
    for (const arg of ['./dist/*.js', '--nope', '--max-size', '--compression=gzip', '-x']) {
      assert.throws(
        () => parseUpdateMaxSizesArgs([arg]),
        (error: unknown) =>
          error instanceof ArgumentError &&
          error.helpCommand === 'bundlewatch update-max-sizes --help',
        arg,
      );
    }
  });
});
