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
- If you omit the `--config` flag, Bundlewatch will look for a `bundlewatch` key in your `package.json`.

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
export default {
  files: [
    {
      path: 'myfolder/*.js',
      maxSize: '100kB',
    },
  ],
}
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

A JavaScript or TypeScript config can also have only named exports, such as `export const files = [...]`, instead of a default export.

Your configuration is merged with the [defaults](../reference/configuration.md). Arrays such as `files` and `ci.trackBranches` replace the default value instead of being merged with it.

You can also supply the config directly to the [Node.js API](../reference/nodejs.md).
