---
title: 使用配置文件
description: 如何通过配置文件或 package.json 配置 BundleWatch。
---

# 使用配置文件 {#using-a-configuration-file}

在项目根目录创建 `bundlewatch.config.mjs`，然后运行：

```bash
npx bundlewatch
```

推荐使用独立配置文件。BundleWatch 会自动查找下面列出的文件名；搜索顺序请参见[配置查找](#config-discovery)。

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

## 配置查找 {#config-discovery}

没有命令行 glob 或 `--config` 时，BundleWatch 从当前目录开始向上搜索。在每个目录中，按以下顺序查找文件：

1. `bundlewatch.config.mjs`
2. `bundlewatch.config.js`
3. `bundlewatch.config.cjs`
4. `bundlewatch.config.mts`
5. `bundlewatch.config.ts`
6. `bundlewatch.config.cts`
7. `bundlewatch.config.json`

使用第一个找到的文件。搜索范围包含最近的 `package.json` 所在目录，并在该目录停止。如果没有找到配置文件，BundleWatch 会读取该包的 `bundlewatch` 键。即使该键不存在，也不会继续搜索上级包。如果没有 `package.json`，则一直搜索到文件系统根目录。

如果找到的文件无法加载或配置无效，本次运行会失败，不会回退到其他文件或 `package.json`。即使配置文件位于上级目录，文件 glob 仍相对于运行 BundleWatch 的目录解析。

使用自定义文件名或位置时，请通过 `--config` 指定。它会覆盖自动查找，也可以选择当前包之外的共享配置：

```bash
npx bundlewatch --config ../shared/bundlewatch.config.mjs
```

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

没有找到配置文件时，运行 `npx bundlewatch` 即可读取此配置。命令行 glob、`--config` 和自动找到的配置文件都优先于该键。在 monorepo 中，请将该键保存在子包自己的 `package.json` 中，或使用 `--config` 明确选择共享配置文件。
