---
title: Migrating to 1.0
description: What changes when you upgrade from Bundlewatch 0.x to 1.0.
---

# Migrating to 1.0

Most setups need no changes. Your configuration, CLI flags, environment variables, GitHub status names and exit codes work as before. This page lists everything that behaves differently. [CONTRACT.md](https://github.com/bundlewatch/bundlewatch/blob/main/CONTRACT.md) lists what stays compatible.

1.0 is a new major version, so `^0.x` and `~0.x` ranges don't pick it up: nothing changes until you upgrade. Most of what follows applies equally if you're coming from 0.3.x.

<a id="requirements"></a>

## Upgrade by hand

1. Use Node.js 22.17 or later, in CI too. Node.js 16, 18 and 20 are end-of-life.
2. Update Bundlewatch:

::: code-group

```bash [npm]
npm install bundlewatch@1 --save-dev
```

```bash [pnpm]
pnpm add bundlewatch@1 --save-dev
```

```bash [Yarn]
yarn add bundlewatch@1 --dev
```

:::

3. Go through [Things to check](#things-to-check) below.
4. Build, then run `npx bundlewatch`.

## Upgrade with an AI agent

Copy this prompt into your coding agent to upgrade a project:

```text:no-line-numbers
Upgrade Bundlewatch to 1.0 in this repository.

Read https://bundlewatch.io/guide/migrating-to-v1.md for what changed, and https://bundlewatch.io/llms-full.txt for the whole documentation. Then:

1. Update Bundlewatch to the latest 1.x version, with the package manager this project uses. It needs Node.js 22.17 or later: update the Node.js version used in CI if it's older.
2. Check the configuration against "Things to check" in the migration guide, and follow its links. A numeric "maxSize" is now enforced: if a file now fails a limit that was never checked before, don't raise the limit, tell me.
3. On GitHub Actions, switch to the workflow's GITHUB_TOKEN as described in the guide, and remove workarounds that 1.0 makes unnecessary, such as CI_BRANCH_BASE set only to avoid comparing with master, or CI_COMMIT_SHA set to the pull request's head commit.
4. Remove the brotli-size dependency if nothing else uses it.
5. Build, run `npx bundlewatch`, and summarize what you changed, what now behaves differently, and what is left for me to do, such as deleting a token secret that is no longer used.
```

## Things to check

- A numeric `maxSize`, such as `102400`, is now enforced. If a file now fails, it was over its limit before too: see [Numeric maxSize](#numeric-maxsize).
- `files` and `ci.trackBranches` replace the defaults instead of merging with them: see [Tracked branches](#tracked-branches).
- On GitHub Actions, pushes are compared with the default branch instead of `master`: see [Base branch on GitHub Actions](#default-branch-detection-on-github-actions).
- Pull request builds no longer save baselines: see [Pull request builds](#pull-request-builds-no-longer-save-baselines).
- Tokens of users without push access will stop saving baselines: see [Service changes](#service-changes).
- Deep imports into `bundlewatch/lib/…` no longer work, except `bundlewatch/lib/app` and `bundlewatch/lib/app/index.js`: see [Loading the package](#loading-the-package).
- Behind a proxy, see [Proxy variables](#proxy-variables). On GitHub Enterprise, see [GitHub Enterprise](#github-enterprise).

## What changed

### Loading the package

- `import bundlewatch, { STATUSES } from 'bundlewatch'` and `require('bundlewatch').default` / `.STATUSES` work as before.
- The package ships both ES module and CommonJS builds, with TypeScript types.
- `bundlewatch/lib/app` and `bundlewatch/lib/app/index.js` still load the main export, with `import` or `require()`, and running `node_modules/bundlewatch/lib/bin/index.js` directly still runs the CLI.
- Other deep imports into `bundlewatch/lib/…` don't; use the package's main export.

### Short results links

- Previously the results were packed into the URL and shortened with Firebase Dynamic Links, a product Google has shut down. Large projects produced URLs that browsers and servers refused (issues [#404](https://github.com/bundlewatch/bundlewatch/issues/404) and [#456](https://github.com/bundlewatch/bundlewatch/issues/456)).
- Now, when the service accepts your token for writing, the link is short: `https://service.bundlewatch.io/r/<id>`. See [Results links](./using-bundlewatch.md#results-links) for when it isn't.
- Each run with a token makes one more request to the service, to create the short link. It gives up after 5 seconds and falls back to the long link.
- Existing `/results?d=…` links keep working, including those with an unlimited `maxSize`, which never rendered before. Old `ja2r7.app.goo.gl` short links work for as long as Google keeps redirecting them.

### `bundlewatchServiceHost: null`

With the service disabled, no results link is printed, the GitHub status has no details link, and the [Node.js API](../reference/nodejs.md#result) returns `url: undefined`. Before 1.0 the link pointed to `null/results?d=…`.

### Service URLs with credentials

Basic auth credentials in `bundlewatchServiceHost` URLs (`https://user:pass@…`) keep working, and no longer appear in results links: 0.x printed them in the CI log and posted them as the GitHub status's details link. See [bundlewatchServiceHost](../reference/configuration.md#bundlewatchservicehost).

### Base branch on GitHub Actions {#default-branch-detection-on-github-actions}

- Pull request builds already compared with the pull request's target branch.
- Other builds, such as pushes, now compare with the repository's default branch instead of `master` (issues [#423](https://github.com/bundlewatch/bundlewatch/issues/423) and [service #280](https://github.com/bundlewatch/service/issues/280)).
- Setting `CI_BRANCH_BASE` or `ci.repoBranchBase` still overrides this. If you set `CI_BRANCH_BASE` only to avoid `master`, remove it: it also replaces the target branch of pull requests. See [Base and tracked branches](./diffing-against-branches-other-than-master.md).

### Pull request statuses on GitHub Actions

- Statuses are now reported on the pull request's head commit.
- Previously they went to `GITHUB_SHA`, a temporary merge commit, so they didn't appear on the pull request unless you set `CI_COMMIT_SHA` yourself. Setting it still works.

### Tracked branches

- The default `trackBranches` is now `['master', 'main', 'develop']`, plus the repository's default branch on GitHub Actions.
- `trackBranches` and `files` arrays in your configuration now replace the defaults. Previously they were merged index by index, so `trackBranches: ['main']` actually tracked `['main', 'develop']`.

### Pull request builds no longer save baselines

Pull request builds compare with the baseline but no longer save one. Previously, a pull request whose head branch had a tracked name, such as a fork's `master`, overwrote the real `master` baseline with its own sizes.

See [Pull request builds](./diffing-against-branches-other-than-master.md#pull-request-builds) for which builds count.

### Numeric `maxSize`

A numeric `maxSize` such as `102400` is now enforced. Previously it was silently ignored and the check always passed. If your bundle is over a numeric limit, Bundlewatch now reports it.

`0`, whether a number or a string such as `'0'` or `'0kB'`, still means no limit.

### Other fixes

- <a id="branch-names-containing"></a>On GitHub Actions push builds, branch names containing `/` are read correctly: 0.x read a push to `feat/foo` as `feat` (issue [#422](https://github.com/bundlewatch/bundlewatch/issues/422)).
- <a id="runs-with-missing-files"></a>A run where some files are missing or can't be read no longer sends a baseline. The service rejected those anyway; the CLI now logs why.
- <a id="empty-files"></a>With `compression: 'none'`, empty files are measured as 0 B instead of failing with `Could not read file`. gzip and brotli already measured them, as 20 B and 1 B.
- <a id="files-named-after-javascript-object-properties"></a>Removed files named after an `Object.prototype` property, such as `constructor`, now show as removed instead of passing with no size. New files with those names get a zero-byte baseline. A file whose normalized path is exactly `__proto__` is now measured and checked instead of dropped.
- <a id="running-outside-a-package"></a>Running Bundlewatch in a directory without a package.json no longer crashes (issue [#434](https://github.com/bundlewatch/bundlewatch/issues/434)).
- <a id="version"></a>`-V` and `--version` print the version. Other flags work as before, including a bare `--max-size` for no limit; see [Command line](../reference/cli.md).
- <a id="generic-ci-without-a-repository"></a>With `CI` set but no `CI_REPO_OWNER` and `CI_REPO_NAME`, Bundlewatch falls back to `GIT_URL` instead of using the repository `undefined/undefined`.
- <a id="config-files"></a>`--config` accepts absolute paths. It loads `.mjs` files, and configs with only named exports, with `import()`, and it loads `.ts`, `.mts` and `.cts` files on Node.js 22.18 and later. See [Using a config file](./using-a-config-file.md).

### Proxy variables

Bundlewatch no longer reads `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` or similar variables: 0.x used them only as a side effect of its HTTP library, and never documented them. Behind a proxy that blocks direct connections, see [Troubleshooting](./troubleshooting.md#behind-a-proxy).

### Brotli

Brotli compression works without installing `brotli-size`, which you can remove. Node's built-in `zlib` produces identical sizes.

### GitHub Enterprise

Commit statuses go to the GitHub API at `GITHUB_API_URL` when it is set; GitHub Actions on GitHub Enterprise Server sets it automatically. See [GitHub Enterprise](./using-a-custom-server.md#github-enterprise) for the rest of the setup.

### Upgrading from 0.3.x with `normalizeFilenames`

0.3.x saved every file that the pattern didn't match under an empty name. On the first 1.0 run those files show as new, and an empty-named entry shows as removed, until a tracked branch saves a new baseline.

## Service changes (service.bundlewatch.io) {#service-changes}

<!-- The previous anchor of this section, kept for existing links. -->

<a id="running-your-own-service"></a>

These apply to every CLI version, 0.x included.

::: warning
Before service.bundlewatch.io enforces the stricter check below, replace tokens of users without push access: create a new one at [`/setup-github`](https://service.bundlewatch.io/setup-github) as a user with push access, or [use `GITHUB_TOKEN`](#using-the-github-actions-token) on GitHub Actions.
:::

- `POST /results` creates a short link and needs write access (below); `GET /r/{id}` renders it.
- Saving baselines and creating short links need stricter authorization, rolled out in report-only mode:
  - To save, a token on a public repository must belong to a user with push access, or be an installation token for that repository, such as the `GITHUB_TOKEN` of its own workflows.
  - Previously, any GitHub token could overwrite a public repository's baseline.
  - At first the service only logs requests the new rule would refuse.
  - In report mode, the stricter check never changes a decision, even when it fails or times out.
  - Reading a baseline works as before.
- Error codes changed:
  - Malformed results links return `400` instead of `500`.
  - Failures talking to GitHub return `503` instead of `401` or `500`.
  - Baselines too large to store return `413` instead of `500`.
- The service now accepts baselines and links where `maxSize` is a size string such as `"100KB"`. 0.x rejected these even though its CLIs sent them for a numeric `maxSize` in the config.
- `/setup-github` checks an OAuth `state`. An authorization started in another browser, or more than 10 minutes earlier, has to be restarted.
- Deployment uses AWS SAM and GitHub Actions OIDC, replacing the Serverless Framework v3 and CircleCI. See [`packages/service/README.md`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md).

## Using the GitHub Actions token

If you run Bundlewatch on GitHub Actions with a token from `service.bundlewatch.io/setup-github`, you can switch to the token GitHub creates for each workflow run: grant the workflow `statuses: write`, keep `contents: read`, and pass `secrets.GITHUB_TOKEN` as `BUNDLEWATCH_GITHUB_TOKEN`. The service accepts this token for saving baselines and creating short links. See [GitHub Actions](./using-bundlewatch.md#github-actions) for a complete workflow.
