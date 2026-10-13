---
title: Using a config file
description: How to configure BundleWatch using a config file or package.json.
---

# Using a config file {#using-a-configuration-file}

Put your configuration under the `bundlewatch` key of package.json, which `npx bundlewatch` reads, or in a file that you pass with `--config`:

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

::: code-group

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
- Without `--config`, BundleWatch reads the `bundlewatch` key of the nearest package.json, in the current directory or a parent. It stops at the first package.json it finds, even if that file has no `bundlewatch` key: in a monorepo, put the key in the package's own package.json, or use `--config`. It doesn't look for `bundlewatch.config.*` files on its own.
- The `BundlewatchConfig` type gives your editor completion and checks for every option.
- In TypeScript, prefer `.mts`: Node.js loads it as an ES module in any package. A `.ts` file works too, but in a package without `"type": "module"`, Node.js prints a warning before loading it.
- A JavaScript or TypeScript config can also have only named exports, such as `export const files = [...]`, instead of a default export.
- A JavaScript config can set options that JSON can't, such as a `RegExp` for [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), or values computed from environment variables.

Your configuration is merged with the [defaults](../reference/configuration.md). If more than one source is present, see [Where configuration comes from](../reference/cli.md#where-configuration-comes-from).

You can also supply the config directly to the [Node.js API](../reference/nodejs.md).
