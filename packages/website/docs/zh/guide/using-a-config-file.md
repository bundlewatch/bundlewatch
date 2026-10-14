---
title: 使用配置文件
description: 如何通过配置文件或 package.json 配置 BundleWatch。
---

# 使用配置文件 {#using-a-configuration-file}

在项目根目录创建 `bundlewatch.config.mjs`，并通过 `--config` 指定它：

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

推荐使用独立配置文件。BundleWatch 不会自动查找配置文件，因此本地和 CI 命令中都需要包含 `--config`。如果选择下面的其他格式，请传入对应的文件名。

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

- 配置文件可以是 `.json`、`.js`、`.cjs` 或 `.mjs`；在能够直接运行 TypeScript 的 Node.js 22.18 及更高版本上，还可以是 `.ts`、`.mts` 或 `.cts`。`--config` 的路径基于当前目录解析，也可以使用绝对路径。
- `BundlewatchConfig` 类型可以让编辑器为每个选项提供补全和检查。
- 在 TypeScript 中，建议使用 `.mts`：无论在哪个包中，Node.js 都会将其作为 ES 模块加载。`.ts` 文件也可以使用，但在没有 `"type": "module"` 的包中，Node.js 会在加载它之前输出一条警告。
- JavaScript 或 TypeScript 配置也可以不使用默认导出，而只使用具名导出，例如 `export const files = [...]`。
- JavaScript 配置可以设置 JSON 无法表示的选项，例如为 [`normalizeFilenames`](../reference/configuration.md#normalizefilenames) 使用 `RegExp`，或者根据环境变量计算出的值。

你的配置会与[默认值](../reference/configuration.md)合并。如果同时存在多个配置来源，请参阅 [配置来源](../reference/cli.md#where-configuration-comes-from)。

你也可以直接将配置传给 [Node.js API](../reference/nodejs.md)。

## 其他方式：package.json {#package-json}

你也可以将配置保存在 `package.json` 的 `bundlewatch` 键下：

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

运行 `npx bundlewatch` 即可读取此配置。不带 `--config` 时，BundleWatch 会读取最近的 `package.json`（当前目录或其上级目录）中的 `bundlewatch` 键。它在找到第一个 `package.json` 时就会停下，即使该文件中没有 `bundlewatch` 键。在 monorepo 中，请使用 `--config` 明确选择配置文件，或将该键保存在子包自己的 `package.json` 中。
