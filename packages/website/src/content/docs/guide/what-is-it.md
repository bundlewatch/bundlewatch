---
title: What is BundleWatch?
description: What BundleWatch checks after each build, and how it reports the results on pull requests.
---

BundleWatch checks the size of your built browser assets, so files don't grow without anyone noticing. You list your files and how big they may get. BundleWatch measures them after every build, fails the build when one is too big, and shows on each pull request how much every file changed.

## What it catches {#why-use-bundlewatch}

A sudden increase in size usually means something went wrong:

- a new dependency that bloats your bundle
- an accidental import of a whole library
- a missing minification or compression step
- slow growth that nobody notices, one pull request at a time

## How it works

1. After your build, BundleWatch measures each file the way browsers download it: compressed with gzip by default, or brotli, or uncompressed.
2. A file over its `maxSize`, or a path that matches no files, fails the run. The command exits with code 1, which fails your CI job.
3. On CI, BundleWatch fetches the sizes saved for the base branch, usually the one you're merging into, from the BundleWatch service. This _baseline_ shows how much each file changed.
4. The result appears as a `bundlewatch` status on the commit, with a link to a page that breaks it down file by file.
5. Builds of tracked branches, such as `main`, save their sizes as the new baseline that later pull requests are compared with.

The service at `service.bundlewatch.io` is free. BundleWatch sends it file names and sizes, the repository, branch and commit, and your GitHub token so it can check your access. It never sends the files themselves. You can also [run your own](./using-a-custom-server.md), or none at all: without a service, BundleWatch still checks `maxSize`.

Anyone with a results link can open its page: see [Results links](./using-bundlewatch.md#results-links).

## Blocking merges

To stop pull requests that make a file too big from being merged, make `bundlewatch` a required status check in your repository's branch protection rules or rulesets. See [GitHub statuses](./using-bundlewatch.md#github-statuses).

---

Next: [Getting started](./getting-started.md), or [set it up with a coding agent](./getting-started.md#set-up-with-an-ai-agent).
