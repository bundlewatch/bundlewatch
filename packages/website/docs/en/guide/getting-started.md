---
title: Getting Started
description: Set up Bundlewatch in your project, by hand or with a coding agent.
---

# Getting Started

This guide sets up Bundlewatch in your project: install it, tell it which files to check, and run it in CI.

## Requirements

- Node.js 22.17 or later.
- The package ships ES module and CommonJS builds. In CommonJS code, use `require('bundlewatch').default`, see the [Node.js API](../reference/nodejs.md#commonjs).
- TypeScript types are included.

Upgrading from 0.x? See [Migrating to 1.0](./migrating-to-v1.md).

## Set up with an AI agent

Copy this prompt into your coding agent. It reads this documentation, measures your build, picks limits and adds the CI setup:

```text:no-line-numbers
Set up Bundlewatch (https://bundlewatch.io) in this repository, so CI fails when a built file gets too big, and pull requests show how much each file changed.

Read https://bundlewatch.io/llms-full.txt first: it has the whole documentation. If this repository already uses bundlewatch 0.x, follow https://bundlewatch.io/guide/migrating-to-v1.md instead. Then:

1. Find the production build command and run it. List the JavaScript and CSS files it outputs, with their gzip sizes.
2. Add bundlewatch as a dev dependency, with the package manager this project already uses.
3. Add a "bundlewatch" key to package.json, with one "files" entry per output. Use globs that still match when file names change between builds, and a "maxSize" about 10% above each file's current gzip size, rounded up to a whole kB. If file names contain content hashes, set "normalizeFilenames" so that a file keeps the same name across builds, and check the pattern against the actual file names.
4. Build, run `npx bundlewatch`, and make sure every file passes.
5. Run it in CI after the build:
   - On GitHub Actions, add the workflow from https://bundlewatch.io/guide/using-bundlewatch#github-actions, adapted to this project's Node.js version, package manager, build command and default branch. It needs no secret.
   - On another CI provider, add a step that runs `npx bundlewatch` after the build, and ask me to create a token at https://service.bundlewatch.io/setup-github and store it as the BUNDLEWATCH_GITHUB_TOKEN secret. Never commit a token.
6. Summarize what you changed, the limits you chose, and what is left for me to do, such as making `bundlewatch` a required status check.
```

The whole documentation is also available as plain text for agents and LLMs: [`llms.txt`](https://bundlewatch.io/llms.txt) lists the pages, and [`llms-full.txt`](https://bundlewatch.io/llms-full.txt) contains all of them. Every page is available as Markdown too, by adding `.md` to its URL.

Prefer to set it up yourself? Follow the steps below.

## Installation

Install Bundlewatch as a dev dependency:

::: code-group

```bash [npm]
npm install bundlewatch --save-dev
```

```bash [pnpm]
pnpm add bundlewatch --save-dev
```

```bash [Yarn]
yarn add bundlewatch --dev
```

:::

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

Each file is listed with its size. The command exits with code 1 when a file is over its `maxSize`, or when a path matches no files.

- **Choosing limits:** to see your current sizes, run `npx bundlewatch` before adding `maxSize`: a file without one has no limit, and is listed with its size. Then set each `maxSize` a little above the current size, so the check catches real increases without failing on every small change.
- **Hashed file names:** if your file names contain content hashes, such as `main.3f2a1b.js`, set [`normalizeFilenames`](../reference/configuration.md#normalizefilenames). Otherwise each build's files look new, and there is nothing to compare them with.

See [Using a config file](./using-a-config-file.md) for other ways to configure Bundlewatch, and the [configuration reference](../reference/configuration.md) for every option.

## Running in CI

To report results on your pull requests and compare them with your main branch, run Bundlewatch in CI after your build. On GitHub, use a [GitHub Actions workflow](./using-bundlewatch.md#github-actions); it doesn't need a token of its own. Other CI providers are covered in [Using Bundlewatch](./using-bundlewatch.md#other-ci-providers).

## Next steps

- [GitHub statuses](./using-bundlewatch.md#github-statuses): block merges when a file is too big.
- [Base and tracked branches](./diffing-against-branches-other-than-master.md): what each build is compared with.
- [Configuration reference](../reference/configuration.md): every option and environment variable.
