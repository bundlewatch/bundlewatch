---
title: Using a Config File
description: How to configure Bundlewatch using a config file or package.json.
---

# Using a Configuration File

The [Bundlewatch CLI](../reference/cli.md) can read configuration from a `.json`, `.js`, `.cjs` or `.mjs` file, or from your `package.json`. On Node.js 22.18 and later, which run TypeScript natively, it can also read a `.ts`, `.mts` or `.cts` file.

- To use a custom config file, specify it on the command line:
  ```bash
  bundlewatch --config .bundlewatch.config.js
  ```
  Relative paths are resolved from the current directory. Absolute paths work too.
- If you omit the `--config` flag, Bundlewatch reads the `bundlewatch` key of the nearest `package.json`, looking in the current directory and then its parents. It doesn't look for `bundlewatch.config.*` files on its own.

Example `package.json` configuration:

```json
{
  "name": "my package name",
  "version": "0.0.1",
  "bundlewatch": {
    "files": [
      {
        "path": "myfolder/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

Example config files:

::: code-group

```js [bundlewatch.config.mjs]
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [
    {
      path: 'myfolder/*.js',
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
      path: 'myfolder/*.js',
      maxSize: '100kB',
    },
  ],
} satisfies BundlewatchConfig
```

```js [bundlewatch.config.cjs]
module.exports = {
  files: [
    {
      path: 'myfolder/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```json [bundlewatch.config.json]
{
  "files": [
    {
      "path": "myfolder/*.js",
      "maxSize": "100kB"
    }
  ]
}
```

:::

- The `BundlewatchConfig` type gives your editor completion and checks for every option.
- In TypeScript, prefer `.mts`: Node.js loads it as an ES module in any package. A `.ts` file works too, but in a package without `"type": "module"`, Node.js prints a warning before loading it.
- A JavaScript or TypeScript config can also have only named exports, such as `export const files = [...]`, instead of a default export.
- A JavaScript config can set options that JSON can't, such as a `RegExp` for [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), or values computed from environment variables.

Your configuration is merged with the [defaults](../reference/configuration.md). Arrays such as `files` and `ci.trackBranches` replace the default value instead of being merged with it.

You can also supply the config directly to the [Node.js API](../reference/nodejs.md).
