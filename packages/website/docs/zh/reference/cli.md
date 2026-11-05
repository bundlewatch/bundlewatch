---
title: 命令行
description: BundleWatch 的命令行选项、读取配置的位置、退出码以及 update-max-sizes 命令。
---

# 命令行

```
Usage: bundlewatch [options] <filePathGlobs ...>
       bundlewatch update-max-sizes [--write] [--headroom <size>] [--config <path>]
```

[安装](../guide/getting-started.md#installation)后，使用 `npx bundlewatch`（或你的包管理器的等效命令）运行。

## 选项 {#options}

| 选项                          | 说明                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--config [configFilePath]`   | 读取配置的文件：`.json`、`.js`、`.cjs` 或 `.mjs`，在 Node.js 22.18 及更高版本上还支持 `.ts`、`.mts` 或 `.cts`。其他扩展名按 JSON 读取。相对路径基于当前目录解析。参见 [使用配置文件](../guide/using-a-config-file.md)。 |
| `--max-size [maxSize]`        | 命令行中指定的每个文件的限制，例如 `3kb`。单位参见 [`maxSize`](./configuration.md#files)。不带值时不限制体积。                                                                                                          |
| `--compression [compression]` | 命令行中指定的文件所用的压缩方式：`gzip`（默认）、`brotli` 或 `none`。                                                                                                                                                  |
| `--normalize [regex]`         | 为命令行中指定的文件设置 [`normalizeFilenames`](./configuration.md#normalizefilenames)。                                                                                                                                |
| `-V, --version`               | 输出版本号                                                                                                                                                                                                              |
| `-h, --help`                  | 输出使用说明                                                                                                                                                                                                            |

- `--max-size`、`--compression` 和 `--normalize` 只作用于命令行中指定的文件 glob。使用自动找到的配置文件、`--config` 或 package.json 中的 `bundlewatch` 键时，它们会被忽略，且没有警告。
- 选项会把下一个参数作为它的值，除非该参数以 `-` 开头。请把值紧跟在选项后面，或者写成 `--max-size=3kb`：在 `bundlewatch --max-size ./dist/*.js` 中，第一个文件会被当作体积。
- 不带值时：有文件 glob 时，`--max-size` 表示不限制体积，`--compression` 或 `--normalize` 会让运行报错停止。没有文件 glob 时，`--config` 会让运行报错停止。
- `--` 表示选项结束：之后的每个参数都是 glob。
- 未知选项会输出 `unknown option '…'` 并以退出码 1 退出。

## 示例 {#examples}

自动查找配置文件（推荐）：

```bash
npx bundlewatch
```

如果没有找到配置文件，同一个命令会读取 `package.json` 中的 `bundlewatch` 键。要使用指定文件：

```bash
npx bundlewatch --config internals/bundlewatch.config.mjs
```

使用命令行：

```bash
npx bundlewatch --max-size 100kB "./src/*.js" "./lib/*.js"
```

给 glob 加上引号，让 BundleWatch 而不是你的 shell 去展开它们：这样 `**` 在任何 shell 中都能用。

## 提高超出的限制 {#update-max-sizes}

**需要 BundleWatch 1.2.0 或更高版本。** 更早的版本没有这个命令：它们会输出 `[ERROR] There is no matching file for update-max-sizes` 或 `[ERROR] unknown option '--write'`，并以退出码 1 退出。

当体积增长是有意为之时，`update-max-sizes` 会提高每个被超出的 `maxSize`，让检查重新通过。**它接受更大的预算，并不会减小包的体积。** 请像审查其他改动一样审查新的限制。

```bash
# 预览改动
npx bundlewatch update-max-sizes

# 保存改动
npx bundlewatch update-max-sizes --write

# 保存改动，并额外留出 1 KB 空间
npx bundlewatch update-max-sizes --write --headroom 1KB
```

请在构建之后运行它：它会测量已经构建好的文件，使用与检查相同的配置、压缩方式和 `normalizeFilenames`。对于每个被提高的限制，它会输出匹配模式、当前和新的 `maxSize`，以及最大的文件及其体积：

```
UPDATE ./dist/*.js: 100kB -> 249kB, largest file ./dist/app.js is 248.79KB (gzip)
```

- 只有存在超过 `maxSize` 的文件的条目才会改变。限制永远不会降低，没有 `maxSize` 的条目也保持不限制体积。
- 新的限制是该条目所作用的最大文件的体积加上 `--headroom`，再向上取整到下一个 KB（1024 字节）。当两个条目匹配同一个文件时，检查使用后一个条目，因此对该文件只会提高后一个条目的限制。
- 以字节数表示的数字仍是数字。字符串会变为整数个 KB；如果旧值已经以 KB 为单位，则保留原来的写法：`'100kB'` 变为 `'249kB'`，`'100 KB'` 变为 `'249 KB'`，而 `'1MB'` 会变为 `'1075kB'`。
- 不带 `--write` 时，配置不会被修改。
- `--write` 会编辑 JSON 配置文件（自动找到的或通过 `--config` 指定的），或 `package.json` 中的 `bundlewatch` 键。只有 `maxSize` 值会改变：格式和其他所有值都保持原样。
- 无法编辑 JavaScript 和 TypeScript 配置文件。需要提高限制时，该命令会输出新值，供你复制到文件中；如果带了 `--write`，它会以退出码 1 退出。
- 如果某个路径没有匹配到任何文件，或某个文件无法读取，则不会写入任何内容，命令以退出码 1 退出。
- 它从不连接 BundleWatch 服务或 GitHub：不保存基线，不输出结果链接，也不发布状态。

| 选项                | 说明                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--write`           | 保存新值。                                                                                                           |
| `--headroom <size>` | 取整前给最大文件增加的空间，例如 `1KB` 或 `512B`。默认为 `0`。使用 `maxSize` 的单位；其他写法（例如 `1k`）会被拒绝。 |
| `--config <path>`   | 要读取的文件，代替[自动查找](#where-configuration-comes-from)。                                                      |
| `-h, --help`        | 输出使用说明                                                                                                         |

只有第一个参数会被当作命令：要检查名为 `update-max-sizes` 的文件，请写成 `./update-max-sizes`。

## 配置来源 {#where-configuration-comes-from}

BundleWatch 会使用以下第一个找到的配置：

1. 命令行中的文件 glob，以及 `--max-size`、`--compression` 和 `--normalize`。
2. 通过 `--config` 指定的文件。
3. 自动找到的 `bundlewatch.config.*` 文件。从当前目录开始向上搜索，包含最近的 `package.json` 所在目录；文件名和搜索边界请参见[配置查找](../guide/using-a-config-file.md#config-discovery)。
4. 最近的 `package.json` 中的 `bundlewatch` 键。它可以是一个配置对象，也可以是一个用作 `files` 的数组。

未被使用的 `--config` 选项或 `package.json` 配置会触发警告。如果指定了命令行 glob 或 `--config`，则跳过自动查找。选定的配置文件无法加载或配置无效时，运行会失败，不会回退到其他来源。如果都找不到，它会输出 `[ERROR] Configuration missing` 并以退出码 1 退出。

## 退出码 {#exit-codes}

| 退出码 | 情况                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| `0`    | 所有文件都通过（`bundlewatch PASS`），或者指定了 `--help` 或 `--version`。         |
| `1`    | 有文件未通过检查（`bundlewatch FAIL`）、配置无效或缺失、选项未知，或发生意外错误。 |

当文件超过其 `maxSize`、某个路径没有匹配到任何文件，或匹配到的路径无法读取（例如目录）时，该文件检查失败。来自 BundleWatch 服务的错误以及 GitHub 返回的错误响应只会记录到日志，不会改变退出码。如果启用了状态（token、仓库和提交都已知），而 GitHub 无法连接或在 5 秒内没有响应，运行会以退出码 1 失败。

`update-max-sizes` 的退出码请参见[提高超出的限制](#update-max-sizes)。

[故障排查](../guide/troubleshooting.md)解释了每条消息。

## 输出 {#output}

结果以及 `[INFO]` 和 `[WARNING]` 行输出到 stdout；`[ERROR]` 和 `[FATAL]` 行输出到 stderr。在 `[ERROR]` 或 `[FATAL]` 行之前输出的详细信息（例如 `Error: ECONNABORTED`）以及 `[DEBUG]` 行输出到 stdout。要开启或关闭颜色，请参阅 [环境变量](./configuration.md#environment-variables)。
