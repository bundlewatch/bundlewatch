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
    ...(['mts', 'ts', 'cts'] as const).map(
      (extension) =>
        [
          `config.${extension}`,
          `const config: { files: { path: string }[]; bundlewatchServiceHost: null } = ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })};
          ${extension === 'cts' ? 'module.exports = config' : 'export default config'}`,
        ] as const,
    ),
  ] as const) {
    test(`loads --config ${name}`, () => {
      const directory = project({ [name]: contents });
      const { status, output } = run(directory, ['--config', name]);
      assert.equal(status, 0, output);
      assert.match(output, /bundlewatch PASS/);
    });

    test(`discovers bundlewatch.${name} without --config or package.json`, () => {
      const directory = project({ [`bundlewatch.${name}`]: contents });
      const { status, output } = run(directory);
      assert.equal(status, 0, output);
      assert.match(output, /bundlewatch PASS/);
    });
  }

  test('prefers a discovered config file to package.json and warns', () => {
    const directory = project({
      'package.json': JSON.stringify({ bundlewatch: { files: [{ path: './missing.js' }] } }),
      'bundlewatch.config.mjs': `export default ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    });
    const { status, output } = run(directory);
    assert.equal(status, 0, output);
    assert.match(output, /Config file found, config in package.json will be ignored/);
  });

  test('chooses config extensions in a deterministic order', () => {
    const extensions = ['mjs', 'js', 'cjs', 'mts', 'ts', 'cts', 'json'];
    for (const [index, extension] of extensions.entries()) {
      const config = JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] });
      const contents =
        extension === 'json'
          ? config
          : `${['js', 'cjs', 'cts'].includes(extension) ? 'module.exports =' : 'export default'} ${config}`;
      const directory = project({
        ...Object.fromEntries(
          extensions.slice(index + 1).map((other) => [`bundlewatch.config.${other}`, 'invalid']),
        ),
        [`bundlewatch.config.${extension}`]: contents,
      });
      const { status, output } = run(directory);
      assert.equal(status, 0, `${extension}: ${output}`);
    }
  });

  test('discovers parent configuration without changing the base for file globs', () => {
    const directory = project({
      'package.json': '{}',
      'bundlewatch.config.mjs': `export default ${JSON.stringify({ ...offline, files: [{ path: '../*.jpg' }] })}`,
      'nested/.keep': '',
    });
    const { status, output } = run(path.join(directory, 'nested'));
    assert.equal(status, 0, output);
    assert.match(output, /PASS \.\.\/test-file-1\.jpg/);
  });

  test('prefers a nearer config file over a parent file with a higher-priority extension', () => {
    const directory = project({
      'bundlewatch.config.mjs': 'throw new Error("Do not load parent config")',
      'nested/bundlewatch.config.json': JSON.stringify({
        ...offline,
        files: [{ path: '../*.jpg' }],
      }),
    });
    const { status, output } = run(path.join(directory, 'nested'));
    assert.equal(status, 0, output);
  });

  test('stops discovery at the nearest package even when it has no configuration', () => {
    const directory = project({
      'bundlewatch.config.mjs': 'throw new Error("Do not load parent config")',
      'nested/package.json': '{}',
      'nested/deeper/.keep': '',
    });
    const { status, output } = run(path.join(directory, 'nested', 'deeper'));
    assert.equal(status, 1);
    assert.match(output, /Configuration missing/);
    assert.doesNotMatch(output, /Exception while loading/);
  });

  test('falls back to the nearest package configuration before a parent config file', () => {
    const directory = project({
      'bundlewatch.config.mjs': 'throw new Error("Do not load parent config")',
      'nested/package.json': JSON.stringify({
        bundlewatch: { ...offline, files: [{ path: '../*.jpg' }] },
      }),
    });
    const { status, output } = run(path.join(directory, 'nested'));
    assert.equal(status, 0, output);
  });

  test('CLI globs and explicit configs do not load discovered config files', () => {
    const directory = project({
      'bundlewatch.config.mjs': 'throw new Error("Do not load discovered config")',
      'custom.json': JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] }),
    });
    for (const args of [['./*.jpg'], ['--config', 'custom.json']]) {
      const { status, output } = run(directory, args);
      assert.equal(status, 0, output);
      assert.doesNotMatch(output, /Do not load discovered config/);
    }
  });

  test('does not fall back when an explicit config is missing or has no path', () => {
    const directory = project({
      'bundlewatch.config.json': JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] }),
    });
    for (const args of [['--config', 'missing.json'], ['--config']]) {
      const { status, output } = run(directory, args);
      assert.equal(status, 1);
      assert.match(output, /\[FATAL\]/);
    }
  });

  test('does not fall back from a broken discovered file to another file or package.json', () => {
    for (const contents of [
      'export default {',
      'throw new Error("Broken config")',
      'export default {}',
    ]) {
      const config = { ...offline, files: [{ path: './*.jpg' }] };
      const directory = project({
        'package.json': JSON.stringify({ bundlewatch: config }),
        'bundlewatch.config.mjs': contents,
        'bundlewatch.config.json': JSON.stringify(config),
      });
      const { status, output } = run(directory);
      assert.equal(status, 1, output);
      assert.doesNotMatch(output, /bundlewatch PASS/);
    }
  });

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
