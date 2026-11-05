import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { startFakeServer } from './test-helpers.ts';

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

const read = (directory: string, name: string): string =>
  readFileSync(path.join(directory, name), 'utf8');

/** Like `run`, without blocking the event loop, so an in-process fake server can answer. */
const runAsync = async (
  cwd: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ status: number | null; output: string }> => {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd,
    env: { PATH: process.env.PATH ?? '', NO_COLOR: '1', ...env },
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const [status] = await once(child, 'close');
  return { status, output };
};

describe('bundlewatch CLI', () => {
  test('prints help', () => {
    const { status, output } = run(project(), ['--help']);
    assert.equal(status, 0);
    assert.match(output, /Usage: bundlewatch \[options\] <filePathGlobs \.\.\.>/);
    assert.match(output, /--no-compare {2,}check size limits without comparing with a baseline/);
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

  // File formats in discovery order.
  const configFixtures = [
    [
      'config.mjs',
      `export default ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    ],
    [
      'config.js',
      `module.exports = ${JSON.stringify({ ...offline, files: [{ path: './*.jpg' }] })}`,
    ],
    [
      'config.cjs',
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
    [
      'config.json',
      JSON.stringify({
        ...offline,
        files: [{ path: './*.jpg', maxSize: '1MB' }],
      }),
    ],
  ] as const;

  for (const [name, contents] of configFixtures) {
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
    for (const [index, [name, contents]] of configFixtures.entries()) {
      const directory = project({
        ...Object.fromEntries(
          configFixtures.slice(index + 1).map(([other]) => [`bundlewatch.${other}`, 'invalid']),
        ),
        [`bundlewatch.${name}`]: contents,
      });
      const { status, output } = run(directory);
      assert.equal(status, 0, `${name}: ${output}`);
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
      'package.json': JSON.stringify({ bundlewatch: { files: [{ path: './missing.js' }] } }),
      'bundlewatch.config.mjs': 'throw new Error("Do not load parent config")',
      'nested/bundlewatch.config.json': JSON.stringify({
        ...offline,
        files: [{ path: '../*.jpg' }],
      }),
    });
    const { status, output } = run(path.join(directory, 'nested'));
    assert.equal(status, 0, output);
    assert.match(output, /Config file found, config in package.json will be ignored/);
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

  const COMPARISON_DISABLED = /\[INFO\] Baseline comparison disabled; checking size limits only/;

  test('--no-compare overrides every configuration source and keeps maxSize failures', () => {
    const config = {
      ...offline,
      compare: true,
      files: [{ path: './*.jpg', maxSize: '100kB', compression: 'none' }],
    };
    const directory = project({
      'package.json': JSON.stringify({ bundlewatch: config }),
      'custom.json': JSON.stringify(config),
    });
    for (const args of [
      ['--no-compare', '--max-size', '100kB', '--compression', 'none', './*.jpg'],
      ['--config', 'custom.json', '--no-compare'],
      ['--no-compare'],
    ]) {
      const { status, output } = run(directory, args);
      assert.equal(status, 1, output);
      assert.match(output, COMPARISON_DISABLED, args.join(' '));
      assert.match(output, /FAIL \.\/test-file-2\.jpg: 248\.79KB > 100KB \(no compression\)/);
      assert.match(output, /bundlewatch FAIL\nmaxSize check failed/);
    }
  });

  test('reads compare: false from a config file, and compares by default', () => {
    const files = [{ path: './*.jpg' }];
    const disabled = run(
      project({
        'bundlewatch.config.json': JSON.stringify({ ...offline, compare: false, files }),
      }),
    );
    assert.equal(disabled.status, 0, disabled.output);
    assert.match(disabled.output, COMPARISON_DISABLED);
    assert.match(disabled.output, /bundlewatch PASS\nEverything is in check \n/);

    const enabled = run(
      project({ 'bundlewatch.config.json': JSON.stringify({ ...offline, files }) }),
    );
    assert.equal(enabled.status, 0, enabled.output);
    assert.doesNotMatch(enabled.output, COMPARISON_DISABLED);
  });

  test('rejects a value for --no-compare and an invalid compare option', () => {
    const directory = project({
      'bundlewatch.config.json': JSON.stringify({ compare: 'false', files: [{ path: './*.jpg' }] }),
    });
    const flag = run(directory, ['--no-compare=true']);
    assert.equal(flag.status, 1);
    assert.match(flag.output, /option '--no-compare' does not take a value/);
    const config = run(directory);
    assert.equal(config.status, 1);
    assert.match(config.output, /\[FATAL\] config\.compare must be true or false/);
  });

  test('rejects unknown options', () => {
    const { status, output } = run(project(), ['--nope']);
    assert.equal(status, 1);
    assert.match(output, /unknown option '--nope'/);
  });
});

describe('bundlewatch update-max-sizes', () => {
  // test-file-1.jpg is 38962 bytes (38.05KB), test-file-2.jpg 254765 (248.79KB).
  const packageJson = `{
  "name": "fixture",
  "scripts": { "build": "true" },
  "bundlewatch": {
    "files": [
      { "path": "./*.jpg", "maxSize": "100kB", "compression": "none" },
      { "path": "./test-file-1.jpg", "maxSize": 1024, "compression": "none" }
    ],
    "bundlewatchServiceHost": null
  }
}
`;

  test('previews the changes without writing them', () => {
    const directory = project({ 'package.json': packageJson });
    const { status, output } = run(directory, ['update-max-sizes']);
    assert.equal(status, 0, output);
    assert.match(
      output,
      /^UPDATE \.\/\*\.jpg: 100kB -> 249kB, largest file \.\/test-file-2\.jpg is 248\.79KB \(no compression\)$/m,
    );
    assert.match(
      output,
      /^UPDATE \.\/test-file-1\.jpg: 1024 -> 39936, largest file \.\/test-file-1\.jpg is 38\.05KB \(no compression\)$/m,
    );
    assert.match(output, /Add --write to save 2 maxSize values to package\.json\./);
    assert.equal(read(directory, 'package.json'), packageJson);
  });

  test('--write changes only exceeded maxSize values, then the check passes', () => {
    const config = packageJson.replace('"maxSize": 1024', '"maxSize": "1MB"');
    const directory = project({ 'package.json': config });
    const { status, output } = run(directory, ['update-max-sizes', '--write', '--headroom', '1KB']);
    assert.equal(status, 0, output);
    assert.match(output, /Updated 1 maxSize value in package\.json\./);
    assert.equal(read(directory, 'package.json'), config.replace('"100kB"', '"250kB"'));

    const check = run(directory);
    assert.equal(check.status, 0, check.output);
    assert.match(check.output, /PASS \.\/test-file-2\.jpg: 248\.79KB < 250KB/);

    const again = run(directory, ['update-max-sizes', '--write']);
    assert.equal(again.status, 0, again.output);
    assert.match(again.output, /No file is over its maxSize, so package\.json was not changed\./);
  });

  test('updates a JSON config file, discovered or given with --config', () => {
    const config = `${JSON.stringify(
      { ...offline, files: [{ path: './*.jpg', maxSize: '100 KB', compression: 'none' }] },
      null,
      4,
    )}\n`;
    const expected = config.replace('"100 KB"', '"249 KB"');
    for (const [name, args] of [
      ['bundlewatch.config.json', []],
      ['configs/custom.json', ['--config', 'configs/custom.json']],
    ] as const) {
      const directory = project({ [name]: config });
      const { status, output } = run(directory, ['update-max-sizes', ...args, '--write']);
      assert.equal(status, 0, output);
      assert.match(output, new RegExp(`Updated 1 maxSize value in ${name}\\.`));
      assert.equal(read(directory, name), expected, name);
    }
  });

  test('updates an array of files in package.json', () => {
    const config = JSON.stringify({
      bundlewatch: [{ path: './test-file-2.jpg', maxSize: '2KB', compression: 'none' }],
    });
    const directory = project({ 'package.json': config });
    const { status, output } = run(directory, ['update-max-sizes', '--write']);
    assert.equal(status, 0, output);
    assert.equal(read(directory, 'package.json'), config.replace('"2KB"', '"249KB"'));
  });

  test('fits a config file that its own pattern measures, after the edit', () => {
    // 1024 bytes: writing 1kB instead of 1B makes it 1025, over 1kB.
    const config = {
      ...offline,
      files: [{ path: './*.json', maxSize: '1B', compression: 'none' }],
      padding: '',
    };
    const contents = JSON.stringify({
      ...config,
      padding: 'x'.repeat(1024 - JSON.stringify(config).length),
    });
    assert.equal(contents.length, 1024);
    const directory = project({ 'bundlewatch.config.json': contents });

    const { status, output } = run(directory, ['update-max-sizes', '--write']);
    assert.equal(status, 0, output);
    assert.match(
      output,
      /UPDATE \.\/\*\.json: 1B -> 2kB, largest file \.\/bundlewatch\.config\.json is 1KB/,
    );
    assert.equal(read(directory, 'bundlewatch.config.json'), contents.replace('"1B"', '"2kB"'));
    const check = run(directory);
    assert.equal(check.status, 0, check.output);
  });

  test('explains how to apply changes to a JavaScript config, which it cannot edit', () => {
    const config = `export default ${JSON.stringify({ ...offline, files: [{ path: './*.jpg', maxSize: '1kB' }] })};`;
    const directory = project({ 'bundlewatch.config.mjs': config });
    const message =
      /bundlewatch\.config\.mjs is not JSON, so update-max-sizes can't edit it: copy the new value above into it by hand/;

    const preview = run(directory, ['update-max-sizes']);
    assert.equal(preview.status, 0, preview.output);
    assert.match(preview.output, /^UPDATE \.\/\*\.jpg: 1kB -> \d+kB/m);
    assert.match(preview.output, message);

    const write = run(directory, ['update-max-sizes', '--write']);
    assert.equal(write.status, 1);
    assert.match(write.output, /\[ERROR\] /);
    assert.match(write.output, message);
    assert.equal(read(directory, 'bundlewatch.config.mjs'), config);
  });

  test('changes nothing when a file cannot be measured', () => {
    const config = JSON.stringify({
      ...offline,
      files: [
        { path: './*.jpg', maxSize: '1kB' },
        { path: './missing/*.js', maxSize: '1kB' },
      ],
    });
    const directory = project({ 'bundlewatch.config.json': config });
    const { status, output } = run(directory, ['update-max-sizes', '--write']);
    assert.equal(status, 1);
    assert.match(output, /There is no matching file for \.\/missing\/\*\.js/);
    assert.match(
      output,
      /Some files could not be measured, so bundlewatch\.config\.json was not changed/,
    );
    assert.equal(read(directory, 'bundlewatch.config.json'), config);
  });

  test('never contacts the service or GitHub, even in CI', async () => {
    const server = await startFakeServer({});
    try {
      const directory = project({
        'package.json': JSON.stringify({
          bundlewatch: {
            bundlewatchServiceHost: server.url,
            files: [{ path: './*.jpg', maxSize: '1kB' }],
          },
        }),
      });
      const { status, output } = await runAsync(directory, ['update-max-sizes', '--write'], {
        CI: 'true',
        CI_REPO_OWNER: 'owner',
        CI_REPO_NAME: 'repo',
        CI_COMMIT_SHA: 'abc123',
        CI_BRANCH: 'main',
        BUNDLEWATCH_GITHUB_TOKEN: 'token',
        GITHUB_API_URL: server.url,
      });
      assert.equal(status, 0, output);
      assert.deepEqual(server.requests, []);
      assert.doesNotMatch(output, /\[WARNING\]/);
    } finally {
      await server.close();
    }
  });

  test('rejects file globs and the headroom of an unknown unit', () => {
    const directory = project({ 'package.json': packageJson });
    for (const args of [['./*.jpg'], ['--headroom', '1k']]) {
      const { status, output } = run(directory, ['update-max-sizes', ...args]);
      assert.equal(status, 1);
      assert.match(output, /Run bundlewatch update-max-sizes --help for usage/);
    }
    assert.equal(read(directory, 'package.json'), packageJson);
  });

  test('is only a command as the first argument', () => {
    const directory = project({ 'update-max-sizes': '0123456789' });
    for (const [args, filePath] of [
      [['--', 'update-max-sizes'], 'update-max-sizes'],
      [['./update-max-sizes'], './update-max-sizes'],
    ] as const) {
      const { status, output } = run(directory, [...args]);
      assert.equal(status, 0, output);
      assert.ok(output.includes(`PASS ${filePath}: 30B < Infinity (gzip)`), output);
    }
  });
});
