---
title: Node.js API
description: 在 Node.js 中运行 Bundlewatch，包括其结果格式、TypeScript 类型和错误。
---

# Node.js API

该 API 可按如下方式使用，关于不同参数的详细信息，[请参阅配置](./configuration.md)。它需要 Node.js 22.17 或更高版本。该包同时提供 ES 模块和 CommonJS 构建，并带有 [TypeScript 类型](#typescript)。

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kb',
    },
  ],
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // 可以是自定义服务
  ci: {
    // 除非你手动设置，否则会从 CI 环境中自动检测
    githubAccessToken: process.env.BUNDLEWATCH_GITHUB_TOKEN,
    repoBranchBase: 'main', // PR 合并到的分支
    trackBranches: ['main', 'develop'],
  },
  defaultCompression: 'gzip',
})

console.log(results)

// 状态字符串也可以通过 api 获取
if (results.status === STATUSES.FAIL) {
  process.exitCode = 1
}
```

与 CLI 一样，当 `ci` 信息可用时，API 会发布 GitHub 状态，并与基准对比、保存基准。它也会在控制台输出同样的 `[INFO]`、`[WARNING]` 和 `[ERROR]` 日志行，但不会输出结果，也不会设置退出码：这些由你自己处理。

## CommonJS {#commonjs}

在 CommonJS 代码中，请使用 `default` 导出：

```js
const bundlewatch = require('bundlewatch').default
const { STATUSES } = require('bundlewatch')
```

`require()` 会加载该包的 CommonJS 构建。

## 结果 {#result}

`bundlewatch()` 返回一个 Promise，其结果类似于：

```js
{
  status: 'fail',
  fullResults: [
    {
      filePath: './myfolder/test-file-1.jpg',
      message: '30.71KB < 100KB (gzip)',
      status: 'pass',
      size: 31448,
      baseBranchSize: 0,
      maxSize: 102400
    },
    {
      filePath: './myfolder/test-file-2.jpg',
      message: '198.6KB > 100KB (gzip)',
      status: 'fail',
      size: 203368,
      baseBranchSize: 0,
      maxSize: 102400
    }
  ],
  summary: 'maxSize check failed',
  url: 'https://service.bundlewatch.io/r/3fK9xQ2LmP7a'
}
```

| 字段          | 说明                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`      | `'pass'` 或 `'fail'`，也可以通过 `STATUSES.PASS` 和 `STATUSES.FAIL` 获取。`'warn'`（`STATUSES.WARN`）为保留值：没有任何检查会产生它。                           |
| `summary`     | 一行摘要，例如 `'maxSize check failed'`                                                                                                                         |
| `url`         | [结果页面](../guide/using-bundlewatch.md#results-links)：服务接受该 token 进行写入时为短链接，否则为长链接。`bundlewatchServiceHost` 为 `null` 时为 `undefined` |
| `fullResults` | 每个文件一项                                                                                                                                                    |

`fullResults` 中的每一项包含：

| 字段             | 说明                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `filePath`       | 经过 `normalizeFilenames` 处理后的文件路径                                                      |
| `status`         | `'pass'`、`'fail'`，或 `'removed'`（文件存在于基准中，但已不存在）                              |
| `message`        | 文本形式的结果。错误项中没有该字段。                                                            |
| `error`          | 仅出现在错误项中，例如某个路径没有匹配到任何文件。错误项没有体积字段，其 `status` 为 `'fail'`。 |
| `size`           | 压缩后的体积，单位为字节。已移除的文件为 `0`。                                                  |
| `baseBranchSize` | 基准中的体积，单位为字节。没有基准时为 `0`。                                                    |
| `maxSize`        | 体积限制，单位为字节。未设置时为 `Infinity`；已移除的文件为 `0`。                               |

## TypeScript {#typescript}

两种构建都带有类型声明。除了 `bundlewatch` 和 `STATUSES`，该包还导出以下类型：

| 类型                | 说明                                             |
| ------------------- | ------------------------------------------------ |
| `BundlewatchConfig` | 传给 `bundlewatch()` 的配置                      |
| `FileConfig`        | `files` 中的一项                                 |
| `CiConfig`          | `ci` 对象                                        |
| `BundlewatchResult` | `bundlewatch()` 的返回结果，参见 [结果](#result) |
| `FileResult`        | `fullResults` 中的一项                           |
| `Status`            | `'pass'`、`'warn'`、`'fail'` 或 `'removed'`      |

```ts
import bundlewatch, { type BundlewatchConfig } from 'bundlewatch'

const config: BundlewatchConfig = {
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
}

const results = await bundlewatch(config)
```

## 错误 {#errors}

当配置无效时，`bundlewatch()` 会以 `ValidationError` 拒绝，该包也导出了这个类。与 0.x 一样，它的 `type` 为 `'ValidationError'`。

```js
import bundlewatch, { ValidationError } from 'bundlewatch'

try {
  await bundlewatch({
    files: [{ path: './dist/*.js' }],
    defaultCompression: 'zip',
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message) // config.compression must be a valid type
  }
}
```

CLI 本身就使用了这个 API，参见 [bundlewatch CLI 源码](https://github.com/bundlewatch/bundlewatch/tree/main/packages/bundlewatch)。
