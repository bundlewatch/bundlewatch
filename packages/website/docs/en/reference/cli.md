# Command Line

```
Usage: bundlewatch [options] <filePathGlobs ...>
```

Run it with `npx bundlewatch` (or your package manager's equivalent) after [installing](../guide/getting-started.md#installation) it.

## Options

| Option                        | Description                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--config [configFilePath]`   | File to read configuration from: `.json`, `.js`, `.cjs` or `.mjs`, or `.ts`, `.mts` or `.cts` on Node.js 22.18 and later. Any other extension is read as JSON. Relative paths are resolved from the current directory. See [Using a config file](../guide/using-a-config-file.md). |
| `--max-size [maxSize]`        | Maximum size threshold for the files given on the command line (e.g. `3kb`). See [`maxSize`](./configuration.md#files) for the units. Without a value, there is no limit.                                                                                                          |
| `--compression [compression]` | Compression algorithm to use: `gzip` (default), `brotli` or `none`                                                                                                                                                                                                                 |
| `--normalize [regex]`         | Normalize filenames via regex, any match will be removed. See [`normalizeFilenames`](./configuration.md#normalizefilenames).                                                                                                                                                       |
| `-V, --version`               | Output the version number                                                                                                                                                                                                                                                          |
| `-h, --help`                  | Output usage information                                                                                                                                                                                                                                                           |

Options work as they did in 0.x, which used commander: an option takes the next argument as its value, unless that argument starts with `-`. `--max-size=3kb` works too. A `--max-size` without a value, such as at the end of the command, means no limit. Unknown options print an error and exit with code 1.

## Examples

Read configuration from `package.json`:

```bash
bundlewatch
```

Read configuration from a file:

```bash
bundlewatch --config internals/bundlewatch.config.js
```

Use the command line:

```bash
bundlewatch --max-size 100KB ./src/*.js ./lib/*.js
```

## Where configuration comes from

Bundlewatch uses the first of these it finds:

1. File globs on the command line, with `--max-size`, `--compression` and `--normalize`.
2. The file given with `--config`.
3. The `bundlewatch` key in the nearest `package.json`. It can be a config object, or an array that is used as `files`.

If more than one is present, Bundlewatch logs a warning and ignores the others. If none is found, it prints "Configuration missing" and exits with code 1.

## Exit codes

| Code | When                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `0`  | Every file passes (`bundlewatch PASS`), or the result is a warning (`bundlewatch WARN`).                                                   |
| `1`  | A file fails its check (`bundlewatch FAIL`), the configuration is invalid or missing, an option is unknown, or an unexpected error occurs. |

A file fails when it is over its `maxSize`, or when a path matches no files.
