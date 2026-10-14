---
title: Configuration reference
description: Every BundleWatch option, its default, and the environment variables BundleWatch reads.
---

Set these options under the `bundlewatch` key of package.json, or in a [config file](../guide/using-a-config-file.md). The command line requires `files`; every other option has a default.

Your configuration is merged with the defaults below. Arrays, such as `files` and `ci.trackBranches`, replace the default value instead of being merged with it.

| Option                   | Default                            | Description                                                                                                  |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `files`                  | None                               | The files to check and their limits, see [files](#files)                                                     |
| `defaultCompression`     | `'gzip'`                           | Compression for files that don't set their own, see [defaultCompression](#defaultcompression)                |
| `normalizeFilenames`     | `null`                             | Removes hashes from file names, see [normalizeFilenames](#normalizefilenames)                                |
| `bundlewatchServiceHost` | `'https://service.bundlewatch.io'` | The service that stores baselines; `null` disables it, see [bundlewatchServiceHost](#bundlewatchservicehost) |
| `ci`                     | Detected from your CI environment  | Token, repository, commit and branches, see [ci](#ci)                                                        |

## `files`

Each entry in `files` checks the files that match its `path`:

| Field         | Description                                                                                                                                                                                                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`        | Required. A glob, relative to the directory you run BundleWatch in, not to the config file. `*`, `**` and `{a,b}` work. A path that matches no files fails the run, and so does one that matches a directory: `./dist/*` fails as soon as `dist` contains a folder, so write `./dist/*.js` or `./dist/**/*.js`. |
| `maxSize`     | Optional. The limit for each matching file, not for their total: a file larger than its `maxSize` fails. Write a string with a unit, such as `'100kB'`, or a number of bytes, such as `102400`.                                                                                                                 |
| `compression` | Optional: `'gzip'`, `'brotli'` or `'none'`. Defaults to [defaultCompression](#defaultcompression). Any other non-empty value isn't rejected: the file is then measured uncompressed.                                                                                                                            |

`maxSize` values:

- Units are `B`, `KB`, `MB`, `GB`, `TB` and `PB`. They are case-insensitive and use multiples of 1024, so `'100kB'` is 102400 bytes.
- A string with any other unit is read as a number of bytes: `'100k'` and `'100KiB'` both mean 100 bytes.
- When `maxSize` is missing, `0` (a number, or a string such as `'0'` or `'0kB'`), or doesn't start with a number, the file has no size limit.

Growth compared with the baseline never fails the check: only `maxSize` does. If two entries match the same path, such as `./dist/*.js` and `./dist/app.js`, the `maxSize` and `compression` of the last one apply: put catch-all globs first.

## `defaultCompression`

The compression used to measure files that don't set their own `compression`: `gzip` (default), `brotli` or `none`. gzip runs at level 9, and brotli at quality 11. Any other value stops the run with `[FATAL] config.compression must be a valid type`.

Brotli uses Node's built-in `zlib`; no extra package is needed.

## `normalizeFilenames`

Removes the part of each file name that changes between builds, such as a content hash, so that each file can be compared with its baseline. It changes the names BundleWatch reports and saves, not your files.

Set it to a `RegExp`, or to a string that BundleWatch turns into one. Write a pattern that matches the whole path, from `^` to `$`, and capture the part to remove: BundleWatch removes the captured text. A path that the pattern doesn't match keeps its name.

| Path                              | Pattern                    | Becomes                  |
| --------------------------------- | -------------------------- | ------------------------ |
| `./dist/main.3f2a1b9c.js`         | `/^.*(\.[a-f0-9]+)\.\w+$/` | `./dist/main.js`         |
| `./dist/assets/index-BdF3x9Qa.js` | `/^.*?(-[\w-]{8})\.\w+$/`  | `./dist/assets/index.js` |

In package.json, write the pattern as a string without the slashes, and double each backslash: `"normalizeFilenames": "^.*(\\.[a-f0-9]+)\\.\\w+$"`.

:::caution
Check the result against your real file names. The second pattern also turns `./dist/app-polyfill.js` into `./dist/app.js`. `/^.+?(\..+?)\.\w+$/`, an older example, turns `./.next/static/chunks/main-abc123.js` into `./.js`.

When two files end up with the same name, only the last one is checked and saved, and nothing is logged.
:::

<details>
<summary>How the pattern is applied</summary>

BundleWatch splits the path with the pattern. That gives the text before the match, the text after it, and each captured group. BundleWatch then removes the first occurrence of each of these pieces from the path.

With a pattern that matches the whole path, that removes the captured text. A pattern that matches only part of the path also removes everything outside the match: `/-[a-f0-9]+/` turns `./dist/main-abc123.js` into `-abc123`.

</details>

## `bundlewatchServiceHost`

The service that stores baselines, creates short results links and renders results pages. Defaults to `'https://service.bundlewatch.io'`.

Set it to your own service's URL to use a [custom server](../guide/using-a-custom-server.md). Give the full URL, starting with `https://`, without a trailing slash: BundleWatch appends paths such as `/store` to it. It can include Basic auth credentials, such as `https://user:password@bundlewatch.example.com`: BundleWatch sends them in an `Authorization` header, and leaves them out of results links and log lines.

Set it to `null` to disable the service: BundleWatch then only checks `maxSize`, without comparing with or saving a baseline. It prints no results link, the GitHub status has no details link, and the [Node.js API](./nodejs.md#result) returns `url: undefined`.

## `ci`

The `ci` options let BundleWatch post [GitHub statuses](../guide/using-bundlewatch.md#github-statuses), and compare with and save baselines. Most defaults are detected from your CI environment; set an option only to override it.

| Option              | Default                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `githubAccessToken` | `BUNDLEWATCH_GITHUB_TOKEN`, then `GITHUB_ACCESS_TOKEN`                                                                                                   |
| `repoOwner`         | Detected, e.g. `facebook` in github.com/facebook/react                                                                                                   |
| `repoName`          | Detected, e.g. `react` in github.com/facebook/react                                                                                                      |
| `repoCurrentBranch` | Detected                                                                                                                                                 |
| `repoBranchBase`    | Detected: the branch a pull request is being merged into, or on GitHub Actions the repository's default branch. Falls back to `'master'`.                |
| `commitSha`         | Detected                                                                                                                                                 |
| `trackBranches`     | `['master', 'main', 'develop']`, plus the repository's default branch when it can be detected                                                            |
| `isPullRequest`     | Detected. Pull request builds compare with a baseline but never save one; see [which builds count](../guide/using-bundlewatch.md#supported-ci-providers) |

Builds on a branch listed in `trackBranches` save their results as the baseline for that branch, unless they are pull request builds. See [Base and tracked branches](../guide/diffing-against-branches-other-than-master.md).

## Environment variables

BundleWatch reads these environment variables. Values in your configuration come first. `CI_REPO_OWNER`, `CI_REPO_NAME`, `CI_REPO_SLUG`, `CI_COMMIT_SHA`, `GIT_COMMIT`, `CI_BRANCH`, `GIT_BRANCH` and `CI_BRANCH_BASE` take precedence over what BundleWatch detects from your CI provider. `GIT_URL` is used only when nothing else gives the repository, and `CI_EVENT` and `CI_TARGET_BRANCH` are read for generic CI: when `CI` is set and no supported provider is detected.

| Variable                                               | Sets                                                                                                                                                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`, then `GITHUB_ACCESS_TOKEN` | `ci.githubAccessToken`                                                                                                                                                                                                                                          |
| `CI_REPO_OWNER`, `CI_REPO_NAME`                        | `ci.repoOwner`, `ci.repoName`                                                                                                                                                                                                                                   |
| `CI_REPO_SLUG` (`owner/name`)                          | `ci.repoOwner` and `ci.repoName`, if the variables above are not set                                                                                                                                                                                            |
| `CI_COMMIT_SHA`, then `GIT_COMMIT`                     | `ci.commitSha`                                                                                                                                                                                                                                                  |
| `CI_BRANCH`, then `GIT_BRANCH`                         | `ci.repoCurrentBranch`                                                                                                                                                                                                                                          |
| `CI_BRANCH_BASE`                                       | `ci.repoBranchBase`                                                                                                                                                                                                                                             |
| `CI_TARGET_BRANCH`                                     | `ci.repoBranchBase` with generic CI, when `CI_BRANCH_BASE` isn't set                                                                                                                                                                                            |
| `GITHUB_API_URL`                                       | The GitHub API URL that commit statuses are posted to. Defaults to `https://api.github.com`; GitHub Actions sets it automatically. GitHub Enterprise also needs your own service, see [GitHub Enterprise](../guide/using-a-custom-server.md#github-enterprise). |
| `CI_EVENT`                                             | `pull_request` marks a [pull request build](../guide/diffing-against-branches-other-than-master.md#pull-request-builds) with generic CI                                                                                                                         |
| `GIT_URL`                                              | `ci.repoOwner` and `ci.repoName`, from a github.com remote such as `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`, if nothing else sets them                                                                                            |
| `DEBUG` (any non-empty value)                          | Logs the details of failed requests to the BundleWatch service                                                                                                                                                                                                  |
| `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`       | Output is colored only in a terminal. `NO_COLOR` or `NODE_DISABLE_COLORS` turns colors off. `FORCE_COLOR` turns them on, for example in a CI log viewer that supports them, unless it is `0` or `false`; it wins over the other two.                            |

BundleWatch detects the other values on GitHub Actions, GitLab CI, Travis CI, Drone, CircleCI and several other CI providers. See [Supported CI providers](../guide/using-bundlewatch.md#supported-ci-providers).
