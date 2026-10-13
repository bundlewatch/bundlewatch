---
title: Command line
description: Bundlewatch's command-line options, where it reads configuration from, and its exit codes.
---

# Command line

```
Usage: bundlewatch [options] <filePathGlobs ...>
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

- `--max-size`, `--compression` and `--normalize` only apply to file globs given on the command line. With `--config` or the `bundlewatch` key in package.json, they're ignored without a warning.
- An option takes the next argument as its value, unless that argument starts with `-`. Put the value right after the option, or write `--max-size=3kb`: in `bundlewatch --max-size ./dist/*.js`, the first file becomes the size.
- Without a value: with file globs, `--max-size` means no limit, and `--compression` or `--normalize` stops the run with an error. Without file globs, `--config` stops the run with an error.
- `--` ends the options: every argument after it is a glob.
- An unknown option prints `unknown option '…'` and exits with code 1.

## Examples

Read configuration from `package.json`:

```bash
npx bundlewatch
```

Read configuration from a file:

```bash
npx bundlewatch --config internals/bundlewatch.config.js
```

Use the command line:

```bash
npx bundlewatch --max-size 100kB "./src/*.js" "./lib/*.js"
```

Quote globs so that Bundlewatch expands them, not your shell: `**` then works in every shell.

## Where configuration comes from

Bundlewatch uses the first of these it finds:

1. File globs on the command line, with `--max-size`, `--compression` and `--normalize`.
2. The file given with `--config`.
3. The `bundlewatch` key in the nearest `package.json`. It can be a config object, or an array that is used as `files`.

If more than one is present, Bundlewatch logs a warning and ignores the others. If none is found, it prints `[ERROR] Configuration missing` and exits with code 1.

## Exit codes

| Code | When                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `0`  | Every file passes (`bundlewatch PASS`), or `--help` or `--version` was given.                                                              |
| `1`  | A file fails its check (`bundlewatch FAIL`), the configuration is invalid or missing, an option is unknown, or an unexpected error occurs. |

A file fails when it is over its `maxSize`, when a path matches no files, or when a matched path can't be read, such as a directory. Errors from the Bundlewatch service, and error responses from GitHub, are logged without changing the exit code. If statuses are enabled (a token, the repository and the commit are known) and GitHub can't be reached or doesn't answer within 5 seconds, the run fails with code 1.

[Troubleshooting](../guide/troubleshooting.md) explains each message.

## Output

Results and `[INFO]` and `[WARNING]` lines go to stdout; `[ERROR]` and `[FATAL]` lines go to stderr. The details printed before an `[ERROR]` or `[FATAL]` line, such as `Error: ECONNABORTED`, and `[DEBUG]` lines, go to stdout. To turn colors on or off, see [environment variables](./configuration.md#environment-variables).
