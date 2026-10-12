---
title: Getting Started
description: Step-by-step guide to installing and setting up Bundlewatch in your project.
---

# Getting Started

This guide will help you install and set up Bundlewatch in your project.

## Requirements

- Node.js 22.17 or later.
- The package ships ES module and CommonJS builds. In CommonJS code, use `require('bundlewatch').default`, see the [Node.js API](../reference/nodejs.md#commonjs).
- TypeScript types are included.

Upgrading from 0.x? See [Migrating to 1.0](./migrating-to-v1.md).

## Installation

You can install Bundlewatch using npm, pnpm or Yarn:

### Using npm

```bash
npm install bundlewatch --save-dev
```

### Using pnpm

```bash
pnpm add bundlewatch --save-dev
```

### Using Yarn

```bash
yarn add bundlewatch --dev
```

## Configuration

Tell Bundlewatch which files to check, and how big they may get, in your `package.json`:

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "./dist/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

Build your project, then run:

```bash
npx bundlewatch
```

See [Using a config file](./using-a-config-file.md) for other ways to configure Bundlewatch.

## Running in CI

To report results on your pull requests and compare them with your main branch, run Bundlewatch in CI. On GitHub, the recommended setup is a [GitHub Actions workflow](./using-bundlewatch.md#github-actions); it doesn't need a token of its own. Other CI providers are covered in [Using Bundlewatch](./using-bundlewatch.md#other-ci-providers).

Now you're ready to use BundleWatch! :tada:
