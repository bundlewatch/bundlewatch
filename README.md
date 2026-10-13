<div align="center">
  <a href="https://bundlewatch.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/website/docs/public/logo-wordmark-dark.svg">
      <img src="packages/website/docs/public/logo-wordmark.svg" width="400" alt="BundleWatch">
    </picture>
  </a>
  <br>
  <br>

Keep watch of your bundle size.

[![Version](https://img.shields.io/npm/v/bundlewatch)](https://www.npmjs.com/package/bundlewatch)
[![Monthly Downloads](https://img.shields.io/npm/dm/bundlewatch)](https://www.npmjs.com/package/bundlewatch)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

BundleWatch checks file sizes so bundled browser assets don't suddenly grow. A sharp increase usually means something went wrong: a package that bloats the bundle, an incorrect import, or a missing minification step.

On pull requests, it compares each file with the target branch and reports the result as a GitHub status.

## Getting started

```sh
npm install --save-dev bundlewatch
```

Add your files to `package.json`:

```json
{
  "bundlewatch": {
    "files": [{ "path": "./dist/*.js", "maxSize": "100kB" }]
  }
}
```

Run `npx bundlewatch` after your build.

To report results on pull requests, see [GitHub Actions setup](https://bundlewatch.io/guide/using-bundlewatch#github-actions). The [documentation](https://bundlewatch.io) also covers other CI providers, configuration files, the Node.js API and [migrating from 0.x](https://bundlewatch.io/guide/migrating-to-v1).

## Repository layout

| Path                                                 | What it is                                                                 | Ships as                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`packages/bundlewatch`](packages/bundlewatch)       | The CLI and Node.js API                                                    | [`bundlewatch` on npm](https://www.npmjs.com/package/bundlewatch) |
| [`packages/core`](packages/core)                     | Analysis, results links and GitHub statuses, shared by the CLI and service | Bundled into both; not published                                  |
| [`packages/service`](packages/service)               | Stores baselines and renders results pages                                 | `service.bundlewatch.io` on AWS Lambda                            |
| [`packages/website`](packages/website)               | The documentation site                                                     | `bundlewatch.io` on AWS Amplify, with pull request previews       |
| [`packages/contract-tests`](packages/contract-tests) | Runs bundlewatch 0.4.2 and the current CLI side by side                    | –                                                                 |

- [CONTRACT.md](CONTRACT.md) lists the behavior that must stay compatible with 0.x CLIs, services and links.
- [MIGRATION.md](MIGRATION.md) lists what changed in 1.0.
- [CONTRIBUTING.md](CONTRIBUTING.md) explains how to work on the repository.

## License

[MIT](LICENSE)

Inspired by [Siddharth Kshetrapal's `bundlesize`](https://github.com/siddharthkp/bundlesize).

<!-- Temporary check: an unrelated follow-up must retain the existing website preview. -->
