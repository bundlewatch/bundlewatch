---
title: Using a config file
description: How to configure BundleWatch using a config file or package.json.
---

# Using a config file {#using-a-configuration-file}

Create `bundlewatch.config.mjs` in your project root, then run:

```bash
npx bundlewatch
```

A standalone config file is the recommended setup. BundleWatch discovers the filenames shown below automatically; see [config discovery](#config-discovery) for the search order.

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

## Config discovery {#config-discovery}

Without command-line globs or `--config`, BundleWatch searches from the current directory upward. In each directory it checks these filenames, in order:

1. `bundlewatch.config.mjs`
2. `bundlewatch.config.js`
3. `bundlewatch.config.cjs`
4. `bundlewatch.config.mts`
5. `bundlewatch.config.ts`
6. `bundlewatch.config.cts`
7. `bundlewatch.config.json`

The first file found wins. The search includes the directory containing the nearest `package.json`, then stops. If no config file is found, BundleWatch reads that package's `bundlewatch` key. It does not search beyond that package, even if the key is missing. Without a `package.json`, it searches up to the filesystem root.

A file that cannot be loaded, or whose configuration is invalid, fails the run; BundleWatch does not fall back to another file or to `package.json`. File globs remain relative to the directory where you run BundleWatch, even when the config is in a parent directory.

For a custom filename or location, use `--config`. This overrides discovery and can select a shared config outside the current package:

```bash
npx bundlewatch --config ../shared/bundlewatch.config.mjs
```

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

Run `npx bundlewatch` to read this configuration when no config file is discovered. Command-line globs, `--config`, and discovered config files take precedence over this key. In a monorepo, keep the key in the package’s own `package.json`, or use `--config` to select a shared file explicitly.
