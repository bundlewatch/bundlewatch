---
title: Running in CI
description: Run BundleWatch on GitHub Actions or another CI provider, and read the statuses and results pages it posts.
---

# Running in CI {#using-bundlewatch}

Run BundleWatch in CI after your build. With a GitHub token, it posts a `bundlewatch` status on the commit and compares each file with the [base branch](./diffing-against-branches-other-than-master.md#base-branch). Your repository has to be on GitHub; the CI can be anywhere.

The examples below use `bundlewatch.config.mjs` from [Getting started](./getting-started.md#configuration). If your config file has a different name or location, update the `--config` path.

## GitHub Actions {#github-actions}

On GitHub Actions, BundleWatch can use the token GitHub creates for every workflow run, so there is no token to generate or store. Add a workflow such as `.github/workflows/bundlewatch.yml`:

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
      - run: npx bundlewatch --config bundlewatch.config.mjs
        env:
          BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- `statuses: write` lets BundleWatch post the `bundlewatch` commit status with the workflow's token. Keep `contents: read` as well: a `permissions` block removes every permission it doesn't list.
- The service accepts the workflow's token for saving baselines and creating short results links.
- The `push` trigger lists only the branches you track. Otherwise a push to a branch with an open pull request would run the workflow twice, and both runs would post the same status on one commit.
- The repository, commit, branch and pull request target are detected automatically, including the repository's default branch. On pull requests, the status goes on the pull request's head commit.
- Pushes to a [tracked branch](./diffing-against-branches-other-than-master.md#tracked-branches) save their results as the new baseline. Pull requests are compared with the baseline of the branch they target.

::: info Pull requests from forks
GitHub gives pull requests from forks a read-only token, so BundleWatch can't post a status on them, and logs a `403` error from GitHub instead. The job still fails when a file is over its `maxSize`.
:::

## Other CI providers

<a id="setting-up-ci-authentication"></a>

1. Open [service.bundlewatch.io/setup-github](https://service.bundlewatch.io/setup-github), signed in to GitHub as a user with push access to the repository, and authorize BundleWatch. The token has only the `repo:status` scope: it can read and write commit statuses, not your code.
2. In your CI settings, store the token as a secret environment variable named `BUNDLEWATCH_GITHUB_TOKEN`. Never commit it.
3. Run `npx bundlewatch --config bundlewatch.config.mjs` after your build step.
4. If your provider isn't in the table below, or doesn't supply a value, set [these variables](#required-ci-environment-variables).

Without a token, BundleWatch only checks `maxSize`.

### Supported CI providers

BundleWatch reads the repository, commit and branch from these providers' own environment variables. Pull request builds are compared with a baseline but never save one ([details](./diffing-against-branches-other-than-master.md#pull-request-builds)).

| Provider                                               | Base branch of pull requests                                  | Counts as a pull request build                  |
| ------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------- |
| GitHub Actions                                         | Detected. Other builds use the repository's default branch    | `pull_request` and `pull_request_target` events |
| GitLab CI                                              | Detected in merge request and external pull request pipelines | Those pipelines                                 |
| Travis CI                                              | Detected                                                      | Pull request builds                             |
| Drone                                                  | Detected                                                      | `pull_request` events                           |
| Buddy, Codefresh                                       | Detected                                                      | Not detected                                    |
| CircleCI                                               | Not available                                                 | Builds of pull requests from forks              |
| Netlify                                                | Not available                                                 | Deploy previews                                 |
| Cloudflare Pages, Codeship, Wercker                    | Not available                                                 | Not detected                                    |
| ZEIT Now (the legacy `NOW_GITHUB_*` variables)         | Not available                                                 | Not detected                                    |
| Generic `CI_*` variables (`CI` set, no provider above) | `CI_TARGET_BRANCH`                                            | `CI_EVENT=pull_request`                         |

Where the base branch isn't available, builds are compared with `master` unless you set `CI_BRANCH_BASE`. BundleWatch doesn't read Vercel's `VERCEL_*` variables, and some providers above don't supply the repository: set the [variables below](#required-ci-environment-variables) for anything that isn't detected.

### Variables to set when they aren't detected {#required-ci-environment-variables}

Set these for any value your CI provider doesn't supply:

- `CI_REPO_OWNER` (e.g. `facebook` in github.com/facebook/react)
- `CI_REPO_NAME` (e.g. `react` in github.com/facebook/react)
- `CI_COMMIT_SHA`
- `CI_BRANCH`
- `CI_BRANCH_BASE`, the branch to compare with, if it isn't `master`

See the [environment variables reference](../reference/configuration.md#environment-variables) for every variable BundleWatch reads.

<a id="adding-build-status-to-github-prs"></a>

## GitHub statuses

BundleWatch reports on the commit it checks, as GitHub commit statuses:

<div align="center">
    <img alt="build status preview" data-zoomable src="/build-status-preview.png" width="700px">
</div>

| Status                    | State   | Description                                                                                                                                                                                                                              |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundlewatch`             | pending | `Checking bundlewatch...` while it runs                                                                                                                                                                                                  |
| `bundlewatch`             | success | The summary, such as `Everything is in check (+1.2KB, -0B, +0.4%)`: the bytes files gained and lost compared with the baseline, and the change in total size. Without a baseline, every file counts as gained and there's no percentage. |
| `bundlewatch`             | failure | `maxSize check failed`                                                                                                                                                                                                                   |
| `bundlewatch`             | error   | `Unable to analyze, check logs.` and the error, after an unexpected error.                                                                                                                                                               |
| `bundlewatch <file path>` | failure | One per failing file, with its result, such as `198.6KB > 100KB (gzip)`. There's no description when the path matched no files or couldn't be read.                                                                                      |

- When there is a [results link](#results-links), the success or failure `bundlewatch` status links to it. The other statuses have no link.
- If GitHub can't be reached, a status keeps the last state GitHub accepted, such as pending: see [Troubleshooting](./troubleshooting.md#github-statuses).
- Paths longer than 35 characters show as `*` followed by their last 37 characters, with ` (2)` added when two paths end the same way.
- Descriptions longer than 140 characters are cut.
- At most five statuses per run: `bundlewatch` and four files. The other failing files are only listed in the log and on the results page.
- An invalid configuration is reported before any status is posted.

Statuses need a token, the repository and the commit. Without them, BundleWatch only prints its results and sets the exit code.

To block pull requests that make a file too big, make `bundlewatch` a required status check, in a branch protection rule or a ruleset of your repository. Require only `bundlewatch`: the per-file statuses appear only when a file fails.

## Results links

Each run prints a link to its results page (`Result breakdown at: …`) and uses it as the _details_ link of the `bundlewatch` status.

- When the service accepts your token for writing, the link is short, for example `https://service.bundlewatch.io/r/3fK9xQ2LmP7a`. It accepts a token whose user has push access to the repository, or the workflow's `GITHUB_TOKEN` on GitHub Actions. The service stores the results and renders the page from that copy.
- Otherwise the results are packed into the link itself: `https://service.bundlewatch.io/results?d=…`. That happens without a token, with a token the service doesn't accept for writing, with a service older than 1.0, and when creating the short link fails or takes more than 5 seconds. For large projects these links can get too long for some browsers and servers.
- With `bundlewatchServiceHost: null`, no link is printed and the GitHub status has no _details_ link.

Results pages don't check access: anyone with a results link can open its page, even for a private repository. A page shows the repository, branch and commit, and each file's name, size and limit. It never contains your token or your files.

## Results page {#viewing-the-results-breakdown}

The results link opens a page that starts with what the commit changed compared with the base branch: the bytes it adds and removes, and how much larger or smaller the files are in total.

<div align="center">
    <img alt="build results preview" data-zoomable src="/build-results-preview.png" width="700px">
</div>

- Files are listed by how much they changed, largest first, each next to its limit. A file at 90% of its limit or more is marked. Files that didn't change are collapsed.
- Until the base branch has a baseline, files are listed by size against their limit instead.
- Paths that matched no files, or couldn't be read, are listed at the top with the reason.
- "All files" lists every file in a table: its size, its size on the base branch, the change and its limit.

A short link that doesn't exist or has expired shows "Results not found". A self-hosted service keeps short links for [`ResultsRetentionDays`](./using-a-custom-server.md#deploying-the-service) days, or forever by default.

<a id="troubleshooting"></a>

If something doesn't work, look up the log message in [Troubleshooting](./troubleshooting.md).
