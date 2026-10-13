---
title: Node.js API
description: Run Bundlewatch from Node.js, with its result format, TypeScript types and errors.
---

# Node.js API

`bundlewatch(config)` takes the same options as the [configuration](./configuration.md), and detects the `ci` values from the environment like the CLI does. It doesn't read package.json or a config file. The package requires Node.js 22.17 or later, and ships ES module and CommonJS builds with [TypeScript types](#typescript).

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
})

console.log(results.summary)
if (results.status === STATUSES.FAIL) {
  process.exitCode = 1
}
```

Like the CLI, the API posts GitHub statuses and compares with and saves baselines when the `ci` details are available. It also logs the same `[INFO]`, `[WARNING]` and `[ERROR]` lines to the console, but doesn't print the results or set the exit code: that's up to you.

Unlike the CLI, it accepts an empty `files`. Nothing is measured and the result is `'pass'`, but a tracked-branch build with a token still saves, which replaces the baseline with an empty one.

## CommonJS

In CommonJS code, use the `default` export:

```js
const bundlewatch = require('bundlewatch').default
const { STATUSES } = require('bundlewatch')
```

`require()` loads the package's CommonJS build.

## Result

`bundlewatch()` returns a promise for a result like this one:

```js
{
  status: 'fail',
  fullResults: [
    {
      filePath: './dist/app.js',
      message: '30.71KB < 100KB (gzip)',
      status: 'pass',
      size: 31448,
      baseBranchSize: 0,
      maxSize: 102400
    },
    {
      filePath: './dist/vendor.js',
      message: '198.6KB > 100KB (gzip)',
      status: 'fail',
      size: 203368,
      baseBranchSize: 0,
      maxSize: 102400
    }
  ],
  summary: 'maxSize check failed',
  url: 'https://service.bundlewatch.io/r/3fK9xQ2LmP7a'
}
```

| Field         | Description                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`      | `'pass'` or `'fail'`, also available as `STATUSES.PASS` and `STATUSES.FAIL`. `'warn'` (`STATUSES.WARN`) is reserved: no check produces it.                                                                                                                                     |
| `summary`     | A one-line summary, e.g. `'maxSize check failed'`                                                                                                                                                                                                                              |
| `url`         | The [results page](../guide/using-bundlewatch.md#results-links): a short link when the service accepts the token for writing, a long one otherwise. `undefined` when `bundlewatchServiceHost` is `null`                                                                        |
| `fullResults` | One entry per distinct path: each measured file, each path that matched nothing or couldn't be read, and each baseline file missing from this build. Files that end up with the same name after [`normalizeFilenames`](./configuration.md#normalizefilenames) share one entry. |

Each entry in `fullResults` has:

| Field            | Description                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `filePath`       | The file path, after `normalizeFilenames`. Error entries have the glob that matched nothing, or the path that couldn't be read. |
| `status`         | `'pass'`, `'fail'`, or `'removed'` (`STATUSES.REMOVED`) for a file that is in the baseline but no longer exists                 |
| `message`        | The result as text. Missing on error entries.                                                                                   |
| `error`          | Only on error entries, e.g. when a path matches no files. They have no sizes, and their `status` is `'fail'`.                   |
| `size`           | Size in bytes, after compression. `0` for removed files.                                                                        |
| `baseBranchSize` | Size in the baseline, in bytes. `0` when there is no baseline.                                                                  |
| `maxSize`        | Limit in bytes. `Infinity` when not set; `0` for removed files.                                                                 |

## TypeScript

Both builds include type declarations. Besides `bundlewatch` and `STATUSES`, the package exports these types:

| Type                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `BundlewatchConfig` | The configuration passed to `bundlewatch()`             |
| `FileConfig`        | An entry in `files`                                     |
| `CiConfig`          | The `ci` object                                         |
| `BundlewatchResult` | What `bundlewatch()` resolves to, see [Result](#result) |
| `FileResult`        | An entry in `fullResults`                               |
| `Status`            | `'pass'`, `'warn'`, `'fail'` or `'removed'`             |

```ts
import bundlewatch, { type BundlewatchConfig } from 'bundlewatch'

const config: BundlewatchConfig = {
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
}

const results = await bundlewatch(config)
```

## Errors

When the configuration is invalid, `bundlewatch()` rejects with a `ValidationError`, which the package also exports. As in 0.x, its `type` is `'ValidationError'`.

A file over its limit doesn't reject: the result's `status` is `'fail'`. `bundlewatch()` rejects when it can't post a GitHub status, because GitHub can't be reached or doesn't answer within 5 seconds. The error's message is the code, such as `ECONNABORTED`, and if this happens after the pending status, it first tries to set `bundlewatch` to error.

Errors from the Bundlewatch service never reject: they're logged. A failed lookup leaves the result without a comparison, and a failed short link leaves `url` as the long link.

```js
import bundlewatch, { ValidationError } from 'bundlewatch'

try {
  await bundlewatch({
    files: [{ path: './dist/*.js' }],
    defaultCompression: 'zip',
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message) // config.compression must be a valid type
  } else {
    throw error
  }
}
```
