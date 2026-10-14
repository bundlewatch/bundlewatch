<div align="center">
  <a href="https://bundlewatch.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://bundlewatch.io/logo-wordmark-dark.svg">
      <img src="https://bundlewatch.io/logo-wordmark.svg" width="400" alt="BundleWatch">
    </picture>
  </a>
  <br>
  <br>

Keep watch of your bundle size.

[![Version](https://img.shields.io/npm/v/bundlewatch)](https://www.npmjs.com/package/bundlewatch)
[![Monthly Downloads](https://img.shields.io/npm/dm/bundlewatch)](https://www.npmjs.com/package/bundlewatch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bundlewatch/bundlewatch/blob/main/LICENSE)

</div>

---

BundleWatch checks file sizes so bundled browser assets don't suddenly grow. A sharp increase usually means something went wrong: a package that bloats the bundle, an incorrect import, or a missing minification step.

On pull requests, it compares each file with the target branch and reports the result as a GitHub status.

Inspired by [Siddharth Kshetrapal's `bundlesize`](https://github.com/siddharthkp/bundlesize).

## Getting started

Requires Node.js 22.17 or later.

```sh
npm install --save-dev bundlewatch
```

Create `bundlewatch.config.mjs` in your project root:

```js
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
}
```

You can also keep your configuration under the `bundlewatch` key in `package.json`. See [configuration options](https://bundlewatch.io/guide/using-a-config-file).

### Usage

Run BundleWatch after your build:

```sh
npx bundlewatch
```

It prints the results and exits with code 1 when a file is over its `maxSize`. Files are measured with gzip by default; Brotli and uncompressed sizes are also supported.

## Reporting on pull requests

BundleWatch can report its status on GitHub pull requests and link to a breakdown of the changes:

<div align="center">
  <img src="https://bundlewatch.io/build-status-preview.png" width="700" alt="BundleWatch reporting a successful size check on a GitHub pull request">
</div>

### GitHub Actions

Add a workflow such as `.github/workflows/bundlewatch.yml`:

```yaml
name: bundlewatch

on:
  push:
    branches: [main] # the branches you track
  pull_request:

permissions:
  contents: read
  statuses: write

jobs:
  bundlewatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npm run build
      - run: npx bundlewatch
        env:
          BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The workflow's token lets BundleWatch post statuses and save baselines. Pushes to `main` save a baseline; pull requests are compared with the branch they target. Replace `main` with the branch you track, and see [base and tracked branches](https://bundlewatch.io/guide/diffing-against-branches-other-than-master) for other branches.

Pull requests from forks get a read-only token, so BundleWatch cannot post a status on them. Size limits are still checked. See [GitHub Actions setup](https://bundlewatch.io/guide/using-bundlewatch#github-actions) for details.

### Other CI providers

Get a token from [service.bundlewatch.io/setup-github](https://service.bundlewatch.io/setup-github), store it as the `BUNDLEWATCH_GITHUB_TOKEN` secret in your CI, and run `npx bundlewatch` after your build.

BundleWatch detects the repository, commit and branch on supported CI providers. If a value is missing, set `CI_REPO_OWNER`, `CI_REPO_NAME`, `CI_COMMIT_SHA` or `CI_BRANCH`. See [supported CI providers and environment variables](https://bundlewatch.io/guide/using-bundlewatch#supported-ci-providers).

### Viewing the results breakdown

Click the status's **Details** link, or open the results link printed in the build log, to see each file's size, limit and change from the base branch:

<div align="center">
  <img src="https://bundlewatch.io/build-results-preview.png" width="700" alt="BundleWatch results showing file sizes, limits and changes compared with main">
</div>

## Node.js API

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

CommonJS: `const bundlewatch = require('bundlewatch').default`. TypeScript types are included. See the [Node.js API reference](https://bundlewatch.io/reference/nodejs).

## Features

- Per-file size limits with glob patterns and gzip, Brotli or no compression.
- Comparisons with the branch a pull request targets, including branches other than `main` or `master`.
- JavaScript, TypeScript and JSON configuration files, or configuration in `package.json`.
- A CLI and Node.js API, with TypeScript types and ES module and CommonJS builds.
- An [open-source service](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service) you can [host yourself](https://bundlewatch.io/guide/using-a-custom-server).

## Documentation

- [bundlewatch.io](https://bundlewatch.io): configuration, CLI and CI setup
- [Configuration reference](https://bundlewatch.io/reference/configuration)
- [Migrating from 0.x](https://bundlewatch.io/guide/migrating-to-v1)
- [Source and issues](https://github.com/bundlewatch/bundlewatch)

## Contributors

<a href="https://github.com/bundlewatch/bundlewatch/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bundlewatch/bundlewatch" alt="BundleWatch contributors">
</a>

See the [contributing guide](https://github.com/bundlewatch/bundlewatch/blob/main/CONTRIBUTING.md) to get involved.

## License

[MIT](https://github.com/bundlewatch/bundlewatch/blob/main/LICENSE)
