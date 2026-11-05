---
title: Command line
description: BundleWatch's command-line options, where it reads configuration from, its exit codes, and the update-max-sizes command.
---

# Command line

```
Usage: bundlewatch [options] <filePathGlobs ...>
       bundlewatch update-max-sizes [--write] [--headroom <size>] [--config <path>]
```

Run it with `npx bundlewatch` (or your package manager's equivalent) after [installing](../guide/getting-started.md#installation) it.

## Options

| Option                        | Description                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--config [configFilePath]`   | File to read configuration from: `.json`, `.js`, `.cjs` or `.mjs`, or `.ts`, `.mts` or `.cts` on Node.js 22.18 and later. Any other extension is read as JSON. Relative paths are resolved from the current directory. See [Using a config file](../guide/using-a-config-file.md). |
| `--max-size [maxSize]`        | Limit for each file given on the command line, such as `3kb`. See [`maxSize`](./configuration.md#files) for the units. Without a value, there is no limit.                                                                                                                         |
| `--compression [compression]` | Compression for the files given on the command line: `gzip` (default), `brotli` or `none`.                                                                                                                                                                                         |
| `--normalize [regex]`         | Sets [`normalizeFilenames`](./configuration.md#normalizefilenames) for the files given on the command line.                                                                                                                                                                        |
| `-V, --version`               | Output the version number                                                                                                                                                                                                                                                          |
| `-h, --help`                  | Output usage information                                                                                                                                                                                                                                                           |

- `--max-size`, `--compression` and `--normalize` only apply to file globs given on the command line. With a discovered config file, `--config`, or the `bundlewatch` key in package.json, they're ignored without a warning.
- An option takes the next argument as its value, unless that argument starts with `-`. Put the value right after the option, or write `--max-size=3kb`: in `bundlewatch --max-size ./dist/*.js`, the first file becomes the size.
- Without a value: with file globs, `--max-size` means no limit, and `--compression` or `--normalize` stops the run with an error. Without file globs, `--config` stops the run with an error.
- `--` ends the options: every argument after it is a glob.
- An unknown option prints `unknown option '…'` and exits with code 1.

## Examples

Discover a config file (recommended):

```bash
npx bundlewatch
```

If no config file is discovered, the same command reads the `bundlewatch` key in `package.json`. To use a specific file instead:

```bash
npx bundlewatch --config internals/bundlewatch.config.mjs
```

Use the command line:

```bash
npx bundlewatch --max-size 100kB "./src/*.js" "./lib/*.js"
```

Quote globs so that BundleWatch expands them, not your shell: `**` then works in every shell.

## Raising exceeded limits {#update-max-sizes}

When a size increase is intentional, `update-max-sizes` raises each exceeded `maxSize` so the check passes again. **It accepts larger budgets; it does not make bundles smaller.** Review the new limits like any other change.

```bash
# Preview the changes
npx bundlewatch update-max-sizes

# Save them
npx bundlewatch update-max-sizes --write

# Save them with 1 KB of extra room
npx bundlewatch update-max-sizes --write --headroom 1KB
```

Run it after your build: it measures the files already built, with the configuration, compression and `normalizeFilenames` of the check. For each limit it raises, it prints the pattern, the current and new `maxSize`, and the largest file with its size:

```
UPDATE ./dist/*.js: 100kB -> 249kB, largest file ./dist/app.js is 248.79KB (gzip)
```

- Only entries with a file over their `maxSize` change. Limits are never lowered, and entries without a `maxSize` stay without one.
- The new limit is the size of the largest file the entry applies to, plus `--headroom`, rounded up to the next KB (1024 bytes). When two entries match the same file, the check applies the last one, so only that one is raised for it.
- A number of bytes stays a number. A string becomes a whole number of KB, written as before if it was already in KB: `'100kB'` becomes `'249kB'` and `'100 KB'` becomes `'249 KB'`, but `'1MB'` becomes `'1075kB'`.
- Without `--write`, the configuration isn't changed.
- `--write` edits a JSON config file, discovered or given with `--config`, or the `bundlewatch` key in `package.json`. Only the `maxSize` values change: formatting and every other value stay as they are.
- JavaScript and TypeScript config files can't be edited. When limits need raising, the command prints the new values for you to copy into the file, and with `--write` it exits with code 1.
- If a path matches no files, or a file can't be read, nothing is written and the command exits with code 1.
- It never contacts the BundleWatch service or GitHub: it saves no baseline, prints no results link and posts no status.

| Option              | Description                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--write`           | Save the new values.                                                                                                                                                |
| `--headroom <size>` | Room to add to the largest file before rounding, such as `1KB` or `512B`. `0` by default. Uses the units of `maxSize`; other spellings, such as `1k`, are rejected. |
| `--config <path>`   | File to read instead of [discovering one](#where-configuration-comes-from).                                                                                         |
| `-h, --help`        | Output usage information                                                                                                                                            |

Only the first argument is read as the command: to check a file named `update-max-sizes`, write `./update-max-sizes`.

## Where configuration comes from

BundleWatch uses the first of these it finds:

1. File globs on the command line, with `--max-size`, `--compression` and `--normalize`.
2. The file given with `--config`.
3. A discovered `bundlewatch.config.*` file. Search starts in the current directory and includes parents up to the nearest `package.json`; see [config discovery](../guide/using-a-config-file.md#config-discovery) for filenames and search boundaries.
4. The `bundlewatch` key in the nearest `package.json`. It can be a config object, or an array that is used as `files`.

An unused `--config` option or `package.json` configuration triggers a warning. Discovery is skipped when globs or `--config` are supplied. If a selected config file cannot be loaded or is invalid, the run fails without falling back. If none is found, it prints `[ERROR] Configuration missing` and exits with code 1.

## Exit codes

| Code | When                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `0`  | Every file passes (`bundlewatch PASS`), or `--help` or `--version` was given.                                                              |
| `1`  | A file fails its check (`bundlewatch FAIL`), the configuration is invalid or missing, an option is unknown, or an unexpected error occurs. |

A file fails when it is over its `maxSize`, when a path matches no files, or when a matched path can't be read, such as a directory. Errors from the BundleWatch service, and error responses from GitHub, are logged without changing the exit code. If statuses are enabled (a token, the repository and the commit are known) and GitHub can't be reached or doesn't answer within 5 seconds, the run fails with code 1.

For `update-max-sizes`, see [Raising exceeded limits](#update-max-sizes).

[Troubleshooting](../guide/troubleshooting.md) explains each message.

## Output

Results and `[INFO]` and `[WARNING]` lines go to stdout; `[ERROR]` and `[FATAL]` lines go to stderr. The details printed before an `[ERROR]` or `[FATAL]` line, such as `Error: ECONNABORTED`, and `[DEBUG]` lines, go to stdout. To turn colors on or off, see [environment variables](./configuration.md#environment-variables).
