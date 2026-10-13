---
title: What is Bundlewatch?
description: Learn what Bundlewatch is, how it works, and how it helps you keep your bundle size in check.
---

# What is Bundlewatch?

Bundlewatch checks the size of your built browser assets, so files don't grow without anyone noticing. You list your files and how big they may get. Bundlewatch measures them after every build, fails the build when one is too big, and shows on each pull request how much every file changed.

## Why use Bundlewatch?

A sudden increase in size usually means something went wrong:

- a new dependency that bloats your bundle
- an accidental import of a whole library
- a missing minification or compression step
- slow growth that nobody notices, one pull request at a time

## How it works

1. **Measure.** After your build, Bundlewatch measures each file the way browsers download it: compressed with gzip by default, or brotli, or uncompressed.
2. **Check.** A file over its `maxSize`, or a path that matches no files, fails the run. The command exits with code 1, which fails your CI job.
3. **Compare.** On CI, Bundlewatch fetches the sizes saved for the base branch, usually the one you're merging into, from the Bundlewatch service. This _baseline_ shows how much each file changed.
4. **Report.** The result appears as a `bundlewatch` status on the commit, with a link to a page that breaks it down file by file.
5. **Save.** Builds of tracked branches, such as `main`, save their sizes as the new baseline that later pull requests are compared with.

The service at `service.bundlewatch.io` is free. Bundlewatch sends it file names and sizes, the repository, branch and commit, and your GitHub token so it can check your access. It never sends the files themselves. You can also [run your own](./using-a-custom-server.md), or none at all: without a service, Bundlewatch still checks `maxSize`.

## Blocking merges

To stop pull requests that make a file too big from being merged, make `bundlewatch` a required status check in your repository's branch protection rules or rulesets. See [GitHub statuses](./using-bundlewatch.md#github-statuses).

---

Ready to try it? See [Getting Started](./getting-started.md), or let your coding agent [set it up for you](./getting-started.md#set-up-with-an-ai-agent).
