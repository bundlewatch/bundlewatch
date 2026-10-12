---
title: Using Bundlewatch
description: How to run Bundlewatch, set up CI integration, and view results.
---

# Basic Usage

Run Bundlewatch on your built assets to check their sizes:

```bash
npx bundlewatch --max-size 100kb ./webpack-build/*.js
```

Example output:

```
Result breakdown at: https://service.bundlewatch.io/results?d=...

PASS ./webpack-build/app.js: 30.71KB < 100KB (gzip)
FAIL ./webpack-build/vendor.js: 198.6KB > 100KB (gzip)

bundlewatch FAIL
maxSize check failed
```

This command gives you immediate feedback in your terminal, and exits with code 1 when a check fails. To enable build status reporting on your GitHub pull requests, follow the steps below.

## Adding Build Status to GitHub PRs

Bundlewatch can report its status directly on your GitHub Pull Requests.

<div align="center">
    <img alt="build status preview" data-zoomable src="/build-status-preview.png" width="700px">
</div>

## GitHub Actions (recommended) {#github-actions}

On GitHub Actions, Bundlewatch can use the token GitHub creates for every workflow run, so there is no token to generate or store. Add a workflow such as `.github/workflows/bundlewatch.yml`:

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

- `statuses: write` lets Bundlewatch post the `bundlewatch` commit status with the workflow's token. Keep `contents: read` as well: a `permissions` block removes every permission it doesn't list.
- The service accepts the workflow's token for saving baselines and creating short results links.
- The `push` trigger lists only the branches you track. Otherwise a push to a branch with an open pull request would run the workflow twice, and both runs would post the same status on one commit.
- The repository, commit, branch and pull request target are detected automatically, including the repository's default branch. On pull requests, the status goes on the pull request's head commit.
- Pushes to a tracked branch (`master`, `main`, `develop` and your default branch) save their results as the new baseline. Pull requests are compared with the baseline of their target branch. See [Base and tracked branches](./diffing-against-branches-other-than-master.md).

::: info Pull requests from forks
GitHub gives pull requests from forks a read-only token, so Bundlewatch can't post a status on them, and logs a `403` error from GitHub instead. The job still fails when a file is over its `maxSize`.
:::

## Other CI Providers

### Setting Up CI Authentication

Bundlewatch needs a GitHub token in `BUNDLEWATCH_GITHUB_TOKEN` to post your PR status and to compare with and save baselines. Without one it only checks `maxSize`. Get your token at:

https://service.bundlewatch.io/setup-github

Create it as a user with push access to the repository, so that the service accepts it for saving baselines and creating short results links. Set this token as a secret environment variable in your CI environment.

### Required CI Environment Variables

Bundlewatch needs the following environment variables in CI:

- `CI_REPO_OWNER` (e.g. `facebook` in github.com/facebook/react)
- `CI_REPO_NAME` (e.g. `react` in github.com/facebook/react)
- `CI_COMMIT_SHA`
- `CI_BRANCH`

::: info
If you're using CircleCI, Travis, GitLab or Drone, these variables are usually detected automatically.
See the [environment variables reference](../reference/configuration.md#environment-variables) and the [CLI source](https://github.com/bundlewatch/bundlewatch/blob/main/packages/bundlewatch/src/ci.ts) for details.
:::

## Results Links

Each run prints a link to its results page (`Result breakdown at: …`) and uses it as the _details_ link of the GitHub status.

- When the service accepts your token for writing, the link is short, for example `https://service.bundlewatch.io/r/3fK9xQ2LmP7a`. It accepts a token whose user has push access to the repository, or the workflow's `GITHUB_TOKEN` on GitHub Actions. The service stores the results and renders the page from that copy.
- Otherwise, without a token or with a token the service doesn't accept for writing, the results are packed into the link itself: `https://service.bundlewatch.io/results?d=…`. For large projects these links can get too long for some browsers and servers.
- With `bundlewatchServiceHost: null`, no link is printed and the GitHub status has no _details_ link.
- Existing `/results?d=…` links keep working. Old `ja2r7.app.goo.gl` short links work for as long as Google keeps redirecting them.

## Viewing the Results Breakdown

After setup, Bundlewatch will post build status on your PRs. Clicking the _details_ link shows a breakdown of your results.

<div align="center">
    <img alt="build results preview" data-zoomable src="/build-results-preview.png" width="700px">
</div>

## Troubleshooting

Two errors in the log are expected:

- `[ERROR] Unable to fetch fileDetails … code=404`: no baseline has been saved for the base branch yet, for example on the first run. It goes away once a build of the base branch has saved one.
- `[ERROR] GitHubService HTTP_403 :: …` on pull requests from forks: their token can't post statuses. See [Pull requests from forks](#github-actions).

---

- [Configuring Bundlewatch](./using-a-config-file.md)
- [Base and Tracked Branches](./diffing-against-branches-other-than-master.md)
- [Configuration Reference](../reference/configuration.md)
