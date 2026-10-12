---
title: Using Bundlewatch
description: How to run Bundlewatch, set up CI integration, and view results.
---

# Using Bundlewatch

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

This command gives you immediate feedback in your terminal, and exits with code 1 when a check fails. To report results on your GitHub pull requests and compare them with your main branch, run it in CI as described below. Your repository has to be on GitHub; the CI can be anywhere.

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

Run `npx bundlewatch` after your build step, with a token in `BUNDLEWATCH_GITHUB_TOKEN`.

### Setting Up CI Authentication

Bundlewatch needs a GitHub token in `BUNDLEWATCH_GITHUB_TOKEN` to post your PR status and to compare with and save baselines. Without one it only checks `maxSize`. Get your token at:

https://service.bundlewatch.io/setup-github

Create it as a user with push access to the repository, so that the service accepts it for saving baselines and creating short results links. Set this token as a secret environment variable in your CI environment, and never commit it.

### Supported CI providers

Bundlewatch reads the repository, commit and branch from these providers' own environment variables:

| Provider       | Base branch of pull requests                                                            |
| -------------- | --------------------------------------------------------------------------------------- |
| GitHub Actions | Detected. Other builds use the repository's default branch.                             |
| GitLab CI      | Detected in merge request pipelines                                                     |
| Travis CI      | Detected                                                                                |
| Drone          | Detected                                                                                |
| CircleCI       | Not available: set `CI_BRANCH_BASE`, otherwise pull requests are compared with `master` |

It also reads the variables of Netlify, Cloudflare Pages, Buddy, Codefresh, Codeship and Wercker, but some of them don't provide the repository or the target branch. Set the variables below for anything that isn't detected.

### Required CI Environment Variables

On other CI providers, or for values that aren't detected, set these environment variables:

- `CI_REPO_OWNER` (e.g. `facebook` in github.com/facebook/react)
- `CI_REPO_NAME` (e.g. `react` in github.com/facebook/react)
- `CI_COMMIT_SHA`
- `CI_BRANCH`
- `CI_BRANCH_BASE`, the branch to compare with, if it isn't `master`

See the [environment variables reference](../reference/configuration.md#environment-variables) for every variable Bundlewatch reads.

## GitHub statuses

Bundlewatch reports on the commit it checks, as GitHub commit statuses:

- **`bundlewatch`**: _pending_ ("Checking bundlewatch...") while it runs, then _success_ with a summary such as `Everything is in check (+1.2KB, -0B, +0.4%)`, or _failure_ with `maxSize check failed`. The summary adds up the bytes that files gained and lost compared with the base branch, and the change in total size. Its _details_ link opens the [results page](#results-links).
- **`bundlewatch <file path>`**: one more _failure_ status for each file that fails, with its size and limit. Long paths are shortened to their last 37 characters.
- At most five statuses per run: the `bundlewatch` status and four files. The other failing files are only listed in the log and on the results page.
- If Bundlewatch runs into an unexpected error after posting _pending_, `bundlewatch` becomes _error_ ("Unable to analyze, check logs."). An invalid configuration is reported before any status is posted.

Statuses need a token, the repository and the commit. Without them, Bundlewatch only prints its results and sets the exit code.

To block pull requests that make a file too big, make `bundlewatch` a required status check, in a branch protection rule or a ruleset of your repository. Require only `bundlewatch`: the per-file statuses appear only when a file fails.

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

- `[ERROR] Unable to fetch fileDetails … code=404`: no baseline has been saved for the base branch yet, for example on the first run. It goes away once a build of the base branch has saved one. If it doesn't, check that the base branch is right (see [Base and tracked branches](./diffing-against-branches-other-than-master.md)) and that it is a tracked branch.
- `[ERROR] GitHubService HTTP_403 :: …` on pull requests from forks: their token can't post statuses. See [Pull requests from forks](#github-actions).
- `[WARNING] Some CI configuration options were not found (…)`: Bundlewatch is missing the listed values, so it only checks `maxSize`. This is expected when you run it on your machine. In CI, set the token or the [variables](#required-ci-environment-variables) it lists.
- `[ERROR] There is no matching file for ./dist/*.js`: the path matched no files, which fails the run. Check that the build ran first, and that paths are relative to the directory you run Bundlewatch in.
- `[WARNING] Max reported statuses reached …`: more than four files failed. See [GitHub statuses](#github-statuses).
- Set the `DEBUG` environment variable to any value to log the details of failed requests.

---

- [Using a config file](./using-a-config-file.md)
- [Base and Tracked Branches](./diffing-against-branches-other-than-master.md)
- [Configuration Reference](../reference/configuration.md)
