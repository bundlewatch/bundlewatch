---
title: Node.js API
description: Run Bundlewatch from Node.js, with its result format, TypeScript types and errors.
---

# Node.js API

The API can be used as below, for detail information on the different params, [see configuration](/reference/configuration.md). It requires Node.js 22.17 or later. The package ships ES module and CommonJS builds, with [TypeScript types](#typescript).

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kb',
    },
  ],
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // Can be a custom service
  ci: {
    // Detected from your CI environment unless you set them
    githubAccessToken: process.env.BUNDLEWATCH_GITHUB_TOKEN,
    repoBranchBase: 'main', // Branch PR is being merged into
    trackBranches: ['main', 'develop'],
  },
  defaultCompression: 'gzip',
})

console.log(results)

// Status strings can also be accessed from the api
if (results.status === STATUSES.FAIL) {
  process.exitCode = 1
}
```

Like the CLI, the API posts GitHub statuses and compares with and saves baselines when the `ci` details are available. It also logs the same `[INFO]`, `[WARNING]` and `[ERROR]` lines to the console, but doesn't print the results or set the exit code: that's up to you.

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
      filePath: './myfolder/test-file-1.jpg',
      message: '30.71KB < 100KB (gzip)',
      status: 'pass',
      size: 31448,
      baseBranchSize: 0,
      maxSize: 102400
    },
    {
      filePath: './myfolder/test-file-2.jpg',
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

| Field         | Description                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`      | `'pass'` or `'fail'`, also available as `STATUSES.PASS` and `STATUSES.FAIL`. `'warn'` (`STATUSES.WARN`) is reserved: no check produces it.                                                              |
| `summary`     | A one-line summary, e.g. `'maxSize check failed'`                                                                                                                                                       |
| `url`         | The [results page](../guide/using-bundlewatch.md#results-links): a short link when the service accepts the token for writing, a long one otherwise. `undefined` when `bundlewatchServiceHost` is `null` |
| `fullResults` | One entry per file                                                                                                                                                                                      |

Each entry in `fullResults` has:

| Field            | Description                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `filePath`       | The file path, after `normalizeFilenames`                                                                     |
| `status`         | `'pass'`, `'fail'`, or `'removed'` for a file that is in the baseline but no longer exists                    |
| `message`        | The result as text. Missing on error entries.                                                                 |
| `error`          | Only on error entries, e.g. when a path matches no files. They have no sizes, and their `status` is `'fail'`. |
| `size`           | Size in bytes, after compression. `0` for removed files.                                                      |
| `baseBranchSize` | Size in the baseline, in bytes. `0` when there is no baseline.                                                |
| `maxSize`        | Limit in bytes. `Infinity` when not set; `0` for removed files.                                               |

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
  }
}
```

The CLI uses this API itself, see the [bundlewatch CLI source](https://github.com/bundlewatch/bundlewatch/tree/main/packages/bundlewatch).
