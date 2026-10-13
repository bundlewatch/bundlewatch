---
title: 使用配置文件
description: 如何通过配置文件或 package.json 配置 Bundlewatch。
---

# 使用配置文件 {#using-a-configuration-file}

把配置写在 package.json 的 `bundlewatch` 键下，`npx bundlewatch` 会读取它；也可以写在一个文件中，并通过 `--config` 传入：

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

- 配置文件可以是 `.json`、`.js`、`.cjs` 或 `.mjs`；在能够直接运行 TypeScript 的 Node.js 22.18 及更高版本上，还可以是 `.ts`、`.mts` 或 `.cts`。`--config` 的路径基于当前目录解析，也可以使用绝对路径。
- 不带 `--config` 时，Bundlewatch 会读取最近的 package.json（当前目录或其上级目录）中的 `bundlewatch` 键。它在找到第一个 package.json 时就会停下，即使该文件中没有 `bundlewatch` 键：在 monorepo 中，请把该键放在子包自己的 package.json 中，或使用 `--config`。它不会自行查找 `bundlewatch.config.*` 文件。
- `BundlewatchConfig` 类型可以让编辑器为每个选项提供补全和检查。
- 在 TypeScript 中，建议使用 `.mts`：无论在哪个包中，Node.js 都会将其作为 ES 模块加载。`.ts` 文件也可以使用，但在没有 `"type": "module"` 的包中，Node.js 会在加载它之前输出一条警告。
- JavaScript 或 TypeScript 配置也可以不使用默认导出，而只使用具名导出，例如 `export const files = [...]`。
- JavaScript 配置可以设置 JSON 无法表示的选项，例如为 [`normalizeFilenames`](../reference/configuration.md#normalizefilenames) 使用 `RegExp`，或者根据环境变量计算出的值。

你的配置会与[默认值](../reference/configuration.md)合并。如果同时存在多个配置来源，请参阅 [配置来源](../reference/cli.md#where-configuration-comes-from)。

你也可以直接将配置传给 [Node.js API](../reference/nodejs.md)。
