---
title: Using a config file
description: How to configure BundleWatch using a config file or package.json.
---

# Using a config file {#using-a-configuration-file}

Create `bundlewatch.config.mjs` in your project root and pass it with `--config`:

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

A standalone config file is the recommended setup. BundleWatch does not discover config files automatically, so include `--config` in local and CI commands. If you choose another format below, pass that file’s name instead.

::: code-group

```js [bundlewatch.config.mjs]
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```ts [bundlewatch.config.mts]
import type { BundlewatchConfig } from 'bundlewatch'

export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
} satisfies BundlewatchConfig
```

```js [bundlewatch.config.cjs]
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```json [bundlewatch.config.json]
{
  "files": [
    {
      "path": "./dist/*.js",
      "maxSize": "100kB"
    }
  ]
}
```

:::

- Config files can be `.json`, `.js`, `.cjs` or `.mjs`, or `.ts`, `.mts` or `.cts` on Node.js 22.18 and later, which run TypeScript natively. `--config` paths are resolved from the current directory; absolute paths work too.
- The `BundlewatchConfig` type gives your editor completion and checks for every option.
- In TypeScript, prefer `.mts`: Node.js loads it as an ES module in any package. A `.ts` file works too, but in a package without `"type": "module"`, Node.js prints a warning before loading it.
- A JavaScript or TypeScript config can also have only named exports, such as `export const files = [...]`, instead of a default export.
- A JavaScript config can set options that JSON can't, such as a `RegExp` for [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), or values computed from environment variables.

Your configuration is merged with the [defaults](../reference/configuration.md). If more than one source is present, see [Where configuration comes from](../reference/cli.md#where-configuration-comes-from).

You can also supply the config directly to the [Node.js API](../reference/nodejs.md).

## Alternative: package.json {#package-json}

You can also keep configuration under the `bundlewatch` key in `package.json`:

```json [package.json]
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

Run `npx bundlewatch` to read this configuration. Without `--config`, BundleWatch reads the `bundlewatch` key of the nearest `package.json`, in the current directory or a parent. It stops at the first `package.json` it finds, even if that file has no `bundlewatch` key. In a monorepo, use `--config` to select a config file explicitly, or keep the key in the package’s own `package.json`.
