---
title: Base and tracked branches
description: How BundleWatch picks the branch to compare with, which branches save a baseline, and how files are matched with it.
---

# Base and tracked branches

BundleWatch compares each build with a baseline: the last results saved for the base branch. Two settings control this:

- The base branch (`ci.repoBranchBase`) is the branch the current build is compared with.
- The tracked branches (`ci.trackBranches`) are the branches whose builds save a new baseline.

## Base branch

BundleWatch uses the first of these that is available:

1. `ci.repoBranchBase` in your [configuration](../reference/configuration.md#ci).
2. The `CI_BRANCH_BASE` environment variable.
3. The pull request's target branch, if your CI provider supplies it ([by provider](./using-bundlewatch.md#supported-ci-providers)).
4. On GitHub Actions, the repository's default branch.
5. `master`.

On GitHub Actions this means pull requests are compared with the branch they target, and other builds with your default branch, without any configuration.

When none of the first four is available, as for pushes on GitLab CI or Travis CI and every build on CircleCI, the build is compared with `master`. If your main branch has another name, or you want to compare with a branch such as `develop`, set `CI_BRANCH_BASE`. It applies to every build, including pull requests that target another branch.

## How files are matched

Each file is compared with the baseline entry of the same name: its path as your glob spells it, after `normalizeFilenames`. `./dist/app.js` and `dist/app.js` are different names, so changing `./dist/*.js` to `dist/*.js` shows every file as removed and new. Sizes are compared without checking their compression, so switching a file from gzip to brotli shows as a change in size.

These differences last until a tracked-branch build with the new configuration saves its baseline.

## Tracked branches

By default, BundleWatch tracks `master`, `main` and `develop`, plus the repository's default branch when it can be detected (on GitHub Actions). A build saves its results as the baseline for its branch when:

- its branch is tracked,
- it is not a pull request build, and
- every file was found and could be read.

A build that fails its `maxSize` check still saves its sizes.

To track other branches, such as `staging`, add the `trackBranches` option to `ci` in `bundlewatch.config.mjs`. The list replaces the default one, so include every branch you want to track:

```js [bundlewatch.config.mjs]
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  ci: {
    trackBranches: ['main', 'develop', 'staging'],
  },
}
```

Run with this configuration:

```bash
npx bundlewatch
```

::: warning One baseline per branch
Each branch has one baseline. If several BundleWatch runs save on the same branch, such as one per package in a monorepo, the last one replaces the others, and later comparisons show the other runs' files as removed. Check all your files in one run.
:::

### Pull request builds

Pull request builds are compared with the baseline but never save one, even when the pull request's branch has a tracked name, such as a fork's `master`.

Only builds that the CI provider runs specifically for a pull request count: see [Supported CI providers](./using-bundlewatch.md#supported-ci-providers).

Branch builds keep saving, even when the branch has an open pull request. Set `ci.isPullRequest` in a [JavaScript config file](./using-a-config-file.md) to override the detection.
