---
title: 使用配置文件
description: 如何通过配置文件或 package.json 配置 Bundlewatch。
---

# 使用配置文件

[Bundlewatch CLI](../reference/cli.md) 可以从 `.json`、`.js`、`.cjs` 或 `.mjs` 文件，或你的 `package.json` 文件中读取配置。在能够直接运行 TypeScript 的 Node.js 22.18 及更高版本上，它还可以读取 `.ts`、`.mts` 或 `.cts` 文件。

- 若要使用自定义配置文件，请在命令行中指定它：
  ```bash
  bundlewatch --config .bundlewatch.config.js
  ```
  相对路径基于当前目录解析，也可以使用绝对路径。
- 如果省略 `--config` 标志，Bundlewatch 会在你的 `package.json` 中查找 `bundlewatch` 键。

`package.json` 配置示例：

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

配置文件示例：

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

JavaScript 或 TypeScript 配置也可以不使用默认导出，而只使用具名导出，例如 `export const files = [...]`。

你的配置会与[默认值](../reference/configuration.md)合并。`files` 和 `ci.trackBranches` 等数组会替换默认值，而不是与之合并。

你也可以直接将配置传递给 [Node.js API](../reference/nodejs.md)。
