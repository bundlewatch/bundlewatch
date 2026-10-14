---
title: Node.js API
description: 在 Node.js 中运行 BundleWatch，包括其结果格式、TypeScript 类型和错误。
---

`bundlewatch(config)` 接受与[配置](./configuration.md)相同的选项，并像 CLI 一样从环境中检测 `ci` 的值。它不读取 package.json 或配置文件。该包需要 Node.js 22.17 或更高版本，同时提供 ES 模块和 CommonJS 构建，并带有 [TypeScript 类型](#typescript)。

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
})

console.log(results.summary)
if (results.status === STATUSES.FAIL) {
  process.exitCode = 1
}
```

与 CLI 一样，当 `ci` 信息可用时，API 会发布 GitHub 状态，并与基准对比、保存基准。它也会在控制台输出同样的 `[INFO]`、`[WARNING]` 和 `[ERROR]` 日志行，但不会输出结果，也不会设置退出码：这些由你自己处理。

与 CLI 不同，它接受空的 `files`。此时不会测量任何文件，结果为 `'pass'`，但带 token 的跟踪分支构建仍会保存，从而用一个空基准替换原有基准。

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
      filePath: './dist/app.js',
      message: '30.71KB < 100KB (gzip)',
      status: 'pass',
      size: 31448,
      baseBranchSize: 0,
      maxSize: 102400
    },
    {
      filePath: './dist/vendor.js',
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

| 字段          | 说明                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`      | `'pass'` 或 `'fail'`，也可以通过 `STATUSES.PASS` 和 `STATUSES.FAIL` 获取。`'warn'`（`STATUSES.WARN`）为保留值：没有任何检查会产生它。                                                                       |
| `summary`     | 一行摘要，例如 `'maxSize check failed'`                                                                                                                                                                     |
| `url`         | [结果页面](../guide/using-bundlewatch.md#results-links)：服务接受该 token 进行写入时为短链接，否则为长链接。`bundlewatchServiceHost` 为 `null` 时为 `undefined`                                             |
| `fullResults` | 每个不同的路径一项：每个测量过的文件、每个没有匹配到文件或无法读取的路径，以及每个在基准中但不在这次构建中的文件。经过 [`normalizeFilenames`](./configuration.md#normalizefilenames) 后同名的文件共用一项。 |

`fullResults` 中的每一项包含：

| 字段             | 说明                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `filePath`       | 经过 `normalizeFilenames` 处理后的文件路径。错误项中为没有匹配到文件的 glob，或无法读取的路径。 |
| `status`         | `'pass'`、`'fail'`，或 `'removed'`（`STATUSES.REMOVED`）：文件在基准中，但已不存在              |
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

文件超出限制不会导致拒绝：结果的 `status` 为 `'fail'`。当无法发布 GitHub 状态时，即 GitHub 无法连接或在 5 秒内没有响应，`bundlewatch()` 会拒绝。错误消息是错误码，例如 `ECONNABORTED`；如果这发生在发布 pending 状态之后，它会先尝试把 `bundlewatch` 设为 error。

来自 BundleWatch 服务的错误从不导致拒绝：它们只会被记录到日志。查询基准失败时，结果中没有对比；创建短链接失败时，`url` 为长链接。

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
  } else {
    throw error
  }
}
```
