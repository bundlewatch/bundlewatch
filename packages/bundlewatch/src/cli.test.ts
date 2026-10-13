import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(source, 'cli.ts');

/** A project directory with the two fixture images and the given files. */
const project = (files: Record<string, string> = {}): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bundlewatch-cli-'));
  for (const name of ['test-file-1.jpg', 'test-file-2.jpg']) {
    copyFileSync(path.join(source, '__fixtures__', name), path.join(directory, name));
  }
  for (const [name, contents] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    writeFileSync(path.join(directory, name), contents);
  }
  return directory;
};

const run = (cwd: string, args: string[] = []): { status: number | null; output: string } => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    env: { PATH: process.env.PATH ?? '', NO_COLOR: '1' },
    encoding: 'utf8',
  });
  return { status: result.status, output: result.stdout + result.stderr };
};

const offline = { bundlewatchServiceHost: null };

describe('bundlewatch CLI', () => {
  test('prints help', () => {
    const { status, output } = run(project(), ['--help']);
    assert.equal(status, 0);
    assert.match(output, /Usage: bundlewatch \[options\] <filePathGlobs \.\.\.>/);
  });

  test('fails without configuration, even outside a package', () => {
    const { status, output } = run(project());
    assert.equal(status, 1);
    assert.match(output, /Configuration missing/);
    assert.doesNotMatch(output, /Uncaught exception/);
  });

  test('reads an array of files from package.json and exits 1 on failure', () => {
    const directory = project({
      'package.json': JSON.stringify({
        bundlewatch: [{ path: './*.jpg', maxSize: '100kB', compression: 'none' }],
      }),
    });
    const { status, output } = run(directory);
    assert.equal(status, 1);
    assert.match(output, /PASS \.\/test-file-1\.jpg: 38\.05KB < 100KB \(no compression\)/);
    assert.match(output, /FAIL \.\/test-file-2\.jpg: 248\.79KB > 100KB \(no compression\)/);
    assert.match(output, /bundlewatch FAIL\nmaxSize check failed/);
  });

  test('finds package.json in a parent directory', () => {
    const directory = project({
      'package.json': JSON.stringify({
        bundlewatch: { ...offline, files: [{ path: '../*.jpg' }] },
      }),
      'nested/.keep': '',
    });
    const { status, output } = run(path.join(directory, 'nested'));
    assert.equal(status, 0, output);
    assert.match(output, /bundlewatch PASS/);
  });

  test('lets CLI globs override package.json', () => {
    const directory = project({
      'package.json': JSON.stringify({
        bundlewatch: { files: [{ path: './nothing' }] },
      }),
    });
    const { status, output } = run(directory, [
      '--max-size',
      '1MB',
      '--compression',
      'brotli',
      './*.jpg',
    ]);
    assert.equal(status, 0, output);
    assert.match(output, /CLI files supplied, config in package.json will be ignored/);
    assert.match(output, /PASS \.\/test-file-1\.jpg: 38\.05KB < 1MB \(brotli\)/);
  });

  for (const [name, contents] of [
    [
      'config.json',
      JSON.stringify({
        ...offline,
        files: [{ path: './*.jpg', maxSize: '1MB' }],
      }),
    ],
    [
      'config.cjs',
      `module.exports = ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    ],
    [
      'config.mjs',
      `export default ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    ],
    [
      'config.js',
      `module.exports = ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    ],
  ] as const) {
    test(`loads --config ${name}`, () => {
      const directory = project({ [name]: contents });
      const { status, output } = run(directory, ['--config', name]);
      assert.equal(status, 0, output);
      assert.match(output, /bundlewatch PASS/);
    });
  }

  test('loads --config from an absolute path', () => {
    const directory = project({
      'config.json': JSON.stringify({
        ...offline,
        files: [{ path: './*.jpg' }],
      }),
    });
    const { status, output } = run(directory, ['--config', path.join(directory, 'config.json')]);
    assert.equal(status, 0, output);
  });

  test('reports invalid configuration without a stack trace', () => {
    const directory = project({ 'config.json': '{ not json' });
    const { status, output } = run(directory, ['--config', 'config.json']);
    assert.equal(status, 1);
    assert.match(output, /\[FATAL\] Could not parse JSON config file: config\.json/);
  });

  test('rejects unknown options', () => {
    const { status, output } = run(project(), ['--nope']);
    assert.equal(status, 1);
    assert.match(output, /unknown option '--nope'/);
  });
});
