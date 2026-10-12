# Configuration Reference

The only required config is the `files` array, with at least one `path`.
`bundlewatch.config.mjs`

```js
export default {
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kB',
      compression: 'none',
    },
  ],
  normalizeFilenames: /^.+?(\..+?)\.\w+$/,
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // Can be a custom service
  ci: {
    trackBranches: ['main', 'develop', 'staging'], // Replaces the default list
  },
  defaultCompression: 'gzip',
}
```

Your configuration is merged with the defaults below. Arrays, such as `files` and `ci.trackBranches`, replace the default value instead of being merged with it.

| Option                   | Default                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `files`                  | None, required                                                                                |
| `defaultCompression`     | `'gzip'`                                                                                      |
| `normalizeFilenames`     | `null`                                                                                        |
| `bundlewatchServiceHost` | `'https://service.bundlewatch.io'`; `null` disables the service                               |
| `ci.repoBranchBase`      | Detected, falling back to `'master'`                                                          |
| `ci.trackBranches`       | `['master', 'main', 'develop']`, plus the repository's default branch when it can be detected |
| Other `ci` options       | Detected from your CI environment                                                             |

## `files`

Each `file` in the array is as follows

```js
{
  path: "./myfolder/*.js", // Required
  maxSize: "100kB",
  compression: "none",
}
```

- `path` is a glob for a single file, or a set of files.
- `maxSize` is optional. It is either a string with a unit, such as `'100kB'`, or a number of bytes, such as `102400`.
  - Units are `B`, `KB`, `MB`, `GB`, `TB` and `PB`. They are case-insensitive and use multiples of 1024, so `'100kB'` is 102400 bytes.
  - A string with any other unit is read as a number of bytes: `'100k'` and `'100KiB'` both mean 100 bytes.
  - When `maxSize` is missing, `0` (a number, or a string such as `'0'` or `'0kB'`), or doesn't start with a number, the file has no size limit.
- `compression` is optional, and defaults to [`defaultCompression`](#defaultcompression). This string must be one of `gzip`, `brotli` or `none`.

## `defaultCompression`

The compression used to measure files that don't set their own `compression`: `gzip` (default), `brotli` or `none`. Brotli uses Node's built-in `zlib`; no extra package is needed.

## `normalizeFilenames`

Used to remove parts of filenames, e.g. if your filenames contain hashes like `main.abc134.js`.

Takes a `RegExp` or `string` that gets parsed into a RegExp. Any matches by the regular expression capturing groups will be removed.

Examples:

**Hash remover:**
Finds characters between a dot and the extension and removes them.

RegExp: `/^.+?(\..+?)\.\w+$/`

String: `"^.+?(\\..+?)\\.\\w+$"`

## `ci`

This object enables the [core features of bundlewatch](/guide/using-bundlewatch): GitHub statuses, and comparing with and saving baselines. Each value is detected from your CI environment unless you set it.

| Option              | Default                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `githubAccessToken` | `BUNDLEWATCH_GITHUB_TOKEN`, then `GITHUB_ACCESS_TOKEN`                                                                                                                         |
| `repoOwner`         | Detected, e.g. `facebook` in github.com/facebook/react                                                                                                                         |
| `repoName`          | Detected, e.g. `react` in github.com/facebook/react                                                                                                                            |
| `repoCurrentBranch` | Detected                                                                                                                                                                       |
| `repoBranchBase`    | Detected: the branch a pull request is being merged into, or on GitHub Actions the repository's default branch. Falls back to `'master'`.                                      |
| `commitSha`         | Detected                                                                                                                                                                       |
| `trackBranches`     | `['master', 'main', 'develop']`, plus the repository's default branch when it can be detected                                                                                  |
| `isPullRequest`     | Detected. Pull request builds compare with a baseline but never save one; see [which builds count](../guide/diffing-against-branches-other-than-master.md#pull-request-builds) |

Builds on a branch listed in `trackBranches` save their results as the baseline for that branch, unless they are pull request builds. See [Base and tracked branches](../guide/diffing-against-branches-other-than-master.md).

### Environment variables

Bundlewatch reads these environment variables. The `CI_*` and `GIT_*` variables take precedence over the values detected from your CI provider. Values in your configuration take precedence over both.

| Variable                                               | Sets                                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`, then `GITHUB_ACCESS_TOKEN` | `ci.githubAccessToken`                                                                                                                                                                                                                                    |
| `CI_REPO_OWNER`, `CI_REPO_NAME`                        | `ci.repoOwner`, `ci.repoName`                                                                                                                                                                                                                             |
| `CI_REPO_SLUG` (`owner/name`)                          | `ci.repoOwner` and `ci.repoName`, if the variables above are not set                                                                                                                                                                                      |
| `CI_COMMIT_SHA`, then `GIT_COMMIT`                     | `ci.commitSha`                                                                                                                                                                                                                                            |
| `CI_BRANCH`, then `GIT_BRANCH`                         | `ci.repoCurrentBranch`                                                                                                                                                                                                                                    |
| `CI_BRANCH_BASE`                                       | `ci.repoBranchBase`                                                                                                                                                                                                                                       |
| `GITHUB_API_URL`                                       | The GitHub API URL that commit statuses are posted to. Defaults to `https://api.github.com`; GitHub Actions sets it automatically. GitHub Enterprise also needs your own service, see [GitHub Enterprise](../guide/migrating-to-v1.md#github-enterprise). |
| `DEBUG` (any value)                                    | Enables debug logging                                                                                                                                                                                                                                     |

Bundlewatch detects the other values on GitHub Actions, CircleCI, Travis, GitLab, Drone and several other CI providers. See the [CLI source](https://github.com/bundlewatch/bundlewatch/blob/main/packages/bundlewatch/src/ci.ts) for the full list.

## `bundlewatchServiceHost`

The service that stores baselines, creates short results links and renders results pages. Defaults to `'https://service.bundlewatch.io'`.

This can be modified if you wish to use a [custom server](/guide/using-a-custom-server.md). Set it to `null` to disable the service: Bundlewatch then only checks `maxSize`, without comparing with or saving a baseline. It prints no results link, the GitHub status has no details link, and the [Node.js API](./nodejs.md#result) returns `url: undefined`.
