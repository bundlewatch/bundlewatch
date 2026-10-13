---
title: Base and Tracked Branches
description: How Bundlewatch picks the branch to diff against, and which branches save a baseline.
---

# Base and Tracked Branches

Bundlewatch compares each build with a baseline: the last results saved for the base branch. Two settings control this:

- The **base branch** (`ci.repoBranchBase`) is the branch the current build is compared with.
- The **tracked branches** (`ci.trackBranches`) are the branches whose builds save a new baseline.

## Base branch

Bundlewatch uses the first of these that is available:

1. `ci.repoBranchBase` in your [configuration](../reference/configuration.md#ci).
2. The `CI_BRANCH_BASE` environment variable.
3. The pull request's target branch, if your CI provides it. GitHub Actions, GitLab, Travis and Drone do.
4. On GitHub Actions, the repository's default branch.
5. `master`.

On GitHub Actions this means pull requests are compared with the branch they target, and other builds with your default branch, without any configuration.

On other providers, builds that aren't pull requests are compared with `master`, and on CircleCI, which doesn't provide the target branch, pull requests are too. If your main branch has another name, set `CI_BRANCH_BASE` to it, for example `main`. It applies to every build, so on GitLab, Travis and Drone, pull requests that target another branch are then compared with it too.

To diff against another branch (e.g. `develop`), set the `CI_BRANCH_BASE` environment variable. Note that this applies to every build, including pull requests that target a different branch.

::: info Info
See which CI variables are automatically detected in the [environment variables reference](../reference/configuration.md#environment-variables) and the [CLI source code](https://github.com/bundlewatch/bundlewatch/blob/main/packages/bundlewatch/src/ci.ts).
:::

## Tracked branches

By default, Bundlewatch tracks `master`, `main` and `develop`, plus the repository's default branch when it can be detected (on GitHub Actions). A build saves its results as the baseline for its branch when:

- its branch is tracked,
- it is not a pull request build, and
- every file was found and could be read.

To track other branches (e.g. `staging`), add the `trackBranches` option to your Bundlewatch config in `package.json`. The list replaces the default one, so include every branch you want to track:

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "myfolder/*.js",
        "maxSize": "100kB"
      }
    ],
    "ci": {
      "trackBranches": ["main", "develop", "staging"]
    }
  }
}
```

::: warning Changed in 1.0
Before 1.0, `trackBranches` was merged with the defaults index by index, so `["main"]` actually tracked `["main", "develop"]`. Now your list is used as is.
:::

### Pull request builds

Pull request builds are compared with the baseline but never save one, even when the pull request's branch has a tracked name, such as a fork's `master`.

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

Branch builds keep saving, even when the branch has an open pull request. Set `ci.isPullRequest` in a [JavaScript config file](./using-a-config-file.md) to override the detection.

For more configuration options, see the [Configuration Reference](../reference/configuration.md).
