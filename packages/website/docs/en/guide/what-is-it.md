---
title: What is Bundlewatch?
description: Learn what Bundlewatch is and how it helps monitor your bundle size.
---

# What is Bundlewatch?

Bundlewatch is a tool that checks the size of your bundled browser assets, helping you prevent unexpected increases in file size.

## Why Use Bundlewatch?

Bundlewatch helps you:

- Detect when a new dependency bloats your bundle
- Catch accidental large imports
- Ensure assets are properly minified
- Prevent regressions in bundle size over time

::: tip
Run `bundlewatch` in your CI pipeline after building your production assets. Bundlewatch will track these files and alert you if they exceed your configured size limits.
:::

If a file goes over the maximum size, Bundlewatch will update the status on your GitHub pull request, and can block merges that fail checks.

---

For more details, see the [Getting Started guide](./getting-started.md) or the [Configuration Reference](../reference/configuration.md).
