---
title: 命令行
description: Bundlewatch 的命令行选项、读取配置的位置以及退出码。
---

# 命令行

```
Usage: bundlewatch [options] <filePathGlobs ...>
```

[安装](../guide/getting-started.md#installation)后，使用 `npx bundlewatch`（或你的包管理器的等效命令）运行。

## 选项 {#options}

| 选项                          | 说明                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--config [configFilePath]`   | 读取配置的文件：`.json`、`.js`、`.cjs` 或 `.mjs`，在 Node.js 22.18 及更高版本上还支持 `.ts`、`.mts` 或 `.cts`。其他扩展名按 JSON 读取。相对路径基于当前目录解析。参见 [使用配置文件](../guide/using-a-config-file.md)。 |
| `--max-size [maxSize]`        | 命令行中指定文件的最大体积阈值（例如 `3kb`）。单位参见 [`maxSize`](./configuration.md#files)。不带值时不限制体积。                                                                                                      |
| `--compression [compression]` | 使用的压缩算法：`gzip`（默认）、`brotli` 或 `none`                                                                                                                                                                      |
| `--normalize [regex]`         | 通过正则表达式规范化文件名，匹配的部分会被移除。参见 [`normalizeFilenames`](./configuration.md#normalizefilenames)。                                                                                                    |
| `-V, --version`               | 输出版本号                                                                                                                                                                                                              |
| `-h, --help`                  | 输出使用说明                                                                                                                                                                                                            |

选项的行为与使用 commander 的 0.x 一致：选项会把下一个参数作为它的值，除非该参数以 `-` 开头。`--max-size=3kb` 也可以使用。不带值的 `--max-size`（例如位于命令末尾时）表示不限制体积。未知选项会输出错误并以退出码 1 退出。

## 示例 {#examples}

从 `package.json` 读取配置：

```bash
bundlewatch
```

从文件读取配置：

```bash
bundlewatch --config internals/bundlewatch.config.js
```

使用命令行：

```bash
bundlewatch --max-size 100KB ./src/*.js ./lib/*.js
```

## 配置来源 {#where-configuration-comes-from}

Bundlewatch 会使用以下第一个找到的配置：

1. 命令行中的文件 glob，以及 `--max-size`、`--compression` 和 `--normalize`。
2. 通过 `--config` 指定的文件。
3. 最近的 `package.json` 中的 `bundlewatch` 键。它可以是一个配置对象，也可以是一个用作 `files` 的数组。

如果同时存在多个来源，Bundlewatch 会输出警告并忽略其余来源。如果都找不到，它会输出 "Configuration missing" 并以退出码 1 退出。

## 退出码 {#exit-codes}

| 退出码 | 情况                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| `0`    | 所有文件都通过（`bundlewatch PASS`）。                                             |
| `1`    | 有文件未通过检查（`bundlewatch FAIL`）、配置无效或缺失、选项未知，或发生意外错误。 |

当文件超过其 `maxSize`，或某个路径没有匹配到任何文件时，该文件检查失败。来自 Bundlewatch 服务的错误以及 GitHub 返回的错误响应只会记录到日志，不会改变退出码。如果设置了 token 但完全无法连接到 GitHub，运行会以退出码 1 失败，与 0.x 一致。
