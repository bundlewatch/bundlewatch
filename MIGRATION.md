# Migrating to bundlewatch 1.0

Most setups need no changes, but automatically discovered config files can now take precedence over `package.json`. Review [Config files](#config-files) before upgrading. CLI flags, environment variables, GitHub status names and exit codes remain supported. This document lists everything that behaves differently. [CONTRACT.md](CONTRACT.md) lists what stays compatible.

1.0 is a new major version, so `^0.x` and `~0.x` ranges don't pick it up: nothing changes until you upgrade. Most of what follows applies equally if you're coming from 0.3.x.

## Requirements

- **Node.js 22.17 or later.** Node 16, 18 and 20 are end-of-life.
- Basic Auth credentials in `bundlewatchServiceHost` URLs (`https://user:pass@…`) keep working. They no longer appear in the results link: 0.x printed them in the CI log and posted them as the GitHub status's details link.
- **How to load the package:**
  - `import bundlewatch, { STATUSES } from 'bundlewatch'` and `require('bundlewatch').default` / `.STATUSES` work as before.
  - The package ships both ES module and CommonJS builds, with TypeScript types.
  - `require('bundlewatch/lib/app')` and running `node_modules/bundlewatch/lib/bin/index.js` directly still work.
  - Other deep imports into `bundlewatch/lib/…` don't; use the package's main export.

## Changes you might notice

### Short results links

- When the service accepts your token for writing, results links look like `https://service.bundlewatch.io/r/<id>`. It accepts a token whose user has push access, or the workflow's `GITHUB_TOKEN` on GitHub Actions.
- The service stores the results and renders the page from that copy.
- Previously the results were packed into the URL and shortened with Firebase Dynamic Links, a product Google has shut down. Large projects produced URLs that browsers and servers refused (issues #404 and #456).
- Otherwise the CLI prints the long `/results?d=…` link as before. That happens without a token, with a token the service doesn't accept for writing, or with a self-hosted service older than 1.0.
- Existing `/results?d=…` links keep working, including those with an unlimited `maxSize`, which never rendered before. Old `ja2r7.app.goo.gl` short links work for as long as Google keeps redirecting them.
- Each run with a token makes one more request to the service, to create the short link. It gives up after 5 seconds and falls back to the long link.

### `bundlewatchServiceHost: null`

With the service disabled, no results link is printed, the GitHub status has no details link, and the Node.js API returns `url: undefined`. Before 1.0 the link pointed to `null/results?d=…`.

### Base branch on GitHub Actions

- Pull request builds already compared against the pull request's target branch.
- Other builds, such as pushes, now compare against the repository's default branch instead of `master` (issues #423 and service #280).
- Setting `CI_BRANCH_BASE` or `ci.repoBranchBase` still overrides this.

### Pull request statuses on GitHub Actions

- Statuses are now reported on the pull request's head commit.
- Previously they went to `GITHUB_SHA`, a temporary merge commit, so they didn't appear on the pull request unless you set `CI_COMMIT_SHA` yourself. Setting it still works.

### Tracked branches

- The default `trackBranches` is now `['master', 'main', 'develop']`, plus the repository's default branch on GitHub Actions.
- `trackBranches` and `files` arrays in your configuration now **replace** the defaults. Previously they were merged index by index, so `trackBranches: ['main']` actually tracked `['main', 'develop']`.

### Branch names containing `/`

On GitHub Actions push builds, branch names containing `/` are now read correctly. Previously a push to `feat/foo` was read as `feat` (issue #422); pull request builds were already correct.

### Pull request builds no longer save baselines

Pull request builds compare against the baseline but no longer save one. Previously, a pull request whose head branch had a tracked name, such as a fork's `master`, overwrote the real `master` baseline with its own sizes.

Only builds that the CI provider runs specifically for a pull request count:

| Provider                 | Counts as a pull request build                  |
| ------------------------ | ----------------------------------------------- |
| GitHub Actions           | `pull_request` and `pull_request_target` events |
| GitLab                   | merge request pipelines                         |
| Travis                   | pull request builds                             |
| Drone                    | `pull_request` events                           |
| Netlify                  | deploy previews                                 |
| CircleCI                 | builds of pull requests from forks              |
| Generic `CI_*` variables | `CI_EVENT=pull_request`                         |

Branch builds keep saving, even when the branch has an open pull request. Set `ci.isPullRequest` in a JavaScript config file to override the detection.

### Runs with missing files

- A run where some files are missing or can't be read no longer sends a baseline to the service.
- The service rejected such baselines anyway, so nothing was saved before either. The CLI now logs why instead of reporting a failed request.

### Numeric `maxSize`

A numeric `maxSize` such as `102400` is now enforced. Previously it was silently ignored and the check always passed. If your bundle is over a numeric limit, bundlewatch now reports it.

`0`, whether a number or a string such as `'0'` or `'0kB'`, still means no limit.

### Empty files with `compression: 'none'`

With `compression: 'none'`, empty files are measured as 0 B. Before 1.0 they were reported as "Could not read file", which failed the run. With gzip and brotli, empty files were already measured (20 B and 1 B).

### Files named after JavaScript object properties

Removed baseline files named `constructor`, `toString` or another `Object.prototype` property now show as removed. Previously they incorrectly appeared as passing files with no size. New files with these names also get the correct zero-byte baseline instead of an undefined size. The size-change totals now reflect both cases.

A file whose path, after `normalizeFilenames`, is exactly `__proto__` is now measured and checked. Before 1.0 it was silently dropped, so the run passed even when the file was over its `maxSize` or missing.

### Proxy variables

bundlewatch no longer reads `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` or similar variables. 0.x used them only as a side effect of its HTTP library, and never documented them. Behind a proxy that blocks direct connections, comparisons and saving baselines fail and are logged. With a GitHub token set, the run itself fails with exit code 1, because it can't post its GitHub status: like 0.x, Bundlewatch stops when GitHub is unreachable. Allow direct connections to `api.github.com` and the Bundlewatch service, or unset the token there to run only the size check.

### Brotli

Brotli compression works without installing `brotli-size`. Node's built-in `zlib` produces identical sizes.

### Config files

- Without command-line globs or `--config`, BundleWatch now searches for `bundlewatch.config.mjs`, `.js`, `.cjs`, `.mts`, `.ts`, `.cts` and `.json`, in that order in each directory, starting in the current directory and searching upward. The first file found wins. The search includes the nearest `package.json` directory, then stops; without one, it continues to the filesystem root. If no file is found, the nearest package’s `bundlewatch` key is still used.
- A discovered file takes precedence over `package.json` configuration, with a warning when that configuration is present. A file that cannot be loaded or has invalid configuration fails the run without trying another source. Globs remain relative to the current working directory. Use `--config <path>` to select a file explicitly, including outside the current package.
- `--config` accepts absolute paths.
- `.mjs` files, and configs with only named exports, are loaded with `import()`.
- `.ts`, `.mts` and `.cts` files work on Node.js versions that run TypeScript natively (22.18 and later).

### Running outside a package

Running bundlewatch in a directory without a `package.json` no longer crashes (issue #434).

### `--version`

`-V` and `--version` print the version. Other flags work as before, including giving `--max-size` without a value to mean no limit.

### Generic CI without a repository

With `CI` set but no `CI_REPO_OWNER` and `CI_REPO_NAME`, 0.x used the repository `undefined/undefined`. 1.0 falls back to `GIT_URL`, so statuses and baselines may start working on such setups.

### GitHub Enterprise

- Commit statuses go to the GitHub API at `GITHUB_API_URL` when it is set; GitHub Actions on GitHub Enterprise Server sets it automatically.
- `service.bundlewatch.io` only accepts github.com tokens. On GitHub Enterprise it can't compare against baselines, save them or create short links: each run logs `401` errors and prints a long results link.
- For comparisons, [run your own service](packages/service/README.md#running-your-own-service) with its GitHub API URL set to yours.
- Otherwise set `bundlewatchServiceHost: null`, so your token and file names aren't sent to service.bundlewatch.io.

### Upgrading from 0.3.x with `normalizeFilenames`

0.3.x saved every file that the pattern didn't match under an empty name. On the first 1.0 run those files show as new, and an empty-named entry shows as removed, until a tracked branch saves a new baseline.

## Service changes (service.bundlewatch.io)

These apply to every CLI version, 0.x included.

- **New endpoints for short links:**
  - `POST /results` creates a short link and needs write access (below).
  - `GET /r/{id}` renders it.
- **Stricter authorization for saving baselines and creating short links, rolled out in report-only mode:**
  - To save, a token on a public repository must belong to a user with push access, or be an installation token for that repository, such as the `GITHUB_TOKEN` of its own workflows.
  - Previously, any GitHub token could overwrite a public repository's baseline.
  - At first the service only logs requests the new rule would refuse. Before it's enforced, tokens of users without push access, such as one created by someone who has since left the project, should be replaced: create a new token at `/setup-github` as a user with push access, or use `GITHUB_TOKEN` on GitHub Actions.
  - A failed or timed-out stricter check only logs an inconclusive result in report mode; the independent 0.x check still decides. Installation listing reserves the last two seconds of its six-second budget for the statuses fallback.
  - Reading a baseline works as before.
- **Error codes:**
  - Malformed results links return `400` instead of `500`.
  - Failures talking to GitHub return `503` instead of `401` or `500`.
  - Baselines too large to store return `413` instead of `500`.
- **Accepted that 0.x rejected:** baselines and links where `maxSize` is a size string such as `"100KB"`. 0.x CLIs sent these for a numeric `maxSize` in the config.
- **`/setup-github`** checks an OAuth `state`. An authorization started in another browser, or more than 10 minutes earlier, has to be restarted.
- **Deployment** uses AWS SAM and GitHub Actions OIDC, replacing the Serverless Framework v3 and CircleCI. See [`packages/service/README.md`](packages/service/README.md).
