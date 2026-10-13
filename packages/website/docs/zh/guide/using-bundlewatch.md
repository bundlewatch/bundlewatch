---
title: 在 CI 中运行
description: 在 GitHub Actions 或其他 CI 服务上运行 Bundlewatch，以及如何看懂它发布的状态和结果页面。
---

# 在 CI 中运行 {#using-bundlewatch}

在 CI 中于构建之后运行 Bundlewatch。有了 GitHub token，它会在提交上发布 `bundlewatch` 状态，并将每个文件与[基准分支](./diffing-against-branches-other-than-master.md#base-branch)对比。你的仓库需要托管在 GitHub 上；CI 可以在任何地方。

## GitHub Actions {#github-actions}

在 GitHub Actions 中，Bundlewatch 可以使用 GitHub 为每次工作流运行创建的 token，因此无需生成或保存 token。添加一个工作流，例如 `.github/workflows/bundlewatch.yml`：

```yaml
name: bundlewatch

on:
  push:
    branches: [main] # 你跟踪的分支
  pull_request:

permissions:
  contents: read
  statuses: write

jobs:
  bundlewatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npm run build
      - run: npx bundlewatch
        env:
          BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- `statuses: write` 允许 Bundlewatch 使用工作流的 token 发布 `bundlewatch` 提交状态。同时请保留 `contents: read`：`permissions` 块会移除所有未列出的权限。
- 服务接受用工作流的 token 保存基准和创建结果短链接。
- `push` 触发器只列出你跟踪的分支。否则，推送到有打开的 Pull Request 的分支会让工作流运行两次，两次运行会在同一个提交上发布相同的状态。
- 仓库、提交、分支和 Pull Request 的目标分支会被自动检测，包括仓库的默认分支。在 Pull Request 上，状态会报告到 Pull Request 的最新提交。
- 推送到[跟踪分支](./diffing-against-branches-other-than-master.md#tracked-branches)时，结果会被保存为新的基准。Pull Request 会与其目标分支的基准对比。

::: info 来自 fork 的 Pull Request
GitHub 只为来自 fork 的 Pull Request 提供只读 token，因此 Bundlewatch 无法在这些 Pull Request 上发布状态，而是会记录一个来自 GitHub 的 `403` 错误。当文件超过 `maxSize` 时，任务仍然会失败。
:::

## 其他 CI 服务 {#other-ci-providers}

<a id="setting-up-ci-authentication"></a>

1. 以拥有该仓库推送权限的用户身份登录 GitHub，打开 [service.bundlewatch.io/setup-github](https://service.bundlewatch.io/setup-github)，并授权 Bundlewatch。该 token 只有 `repo:status` 权限：它可以读写提交状态，但无法访问你的代码。
2. 在 CI 设置中，将 token 保存为名为 `BUNDLEWATCH_GITHUB_TOKEN` 的私密环境变量。切勿将它提交到仓库中。
3. 在构建步骤之后运行 `npx bundlewatch`。
4. 如果你的 CI 服务不在下表中，或者没有提供某个值，请设置[这些变量](#required-ci-environment-variables)。

没有 token 时，Bundlewatch 只检查 `maxSize`。

### 支持的 CI 服务 {#supported-ci-providers}

Bundlewatch 会从以下 CI 服务自己的环境变量中读取仓库、提交和分支。Pull Request 构建会与基准对比，但从不保存基准（[详情](./diffing-against-branches-other-than-master.md#pull-request-builds)）。

| CI 服务                                         | Pull Request 的基准分支                          | 算作 Pull Request 构建的情况                 |
| ----------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| GitHub Actions                                  | 自动检测。其他构建使用仓库的默认分支             | `pull_request` 和 `pull_request_target` 事件 |
| GitLab CI                                       | 在合并请求流水线和外部 Pull Request 流水线中检测 | 这两类流水线                                 |
| Travis CI                                       | 自动检测                                         | Pull Request 构建                            |
| Drone                                           | 自动检测                                         | `pull_request` 事件                          |
| Buddy、Codefresh                                | 自动检测                                         | 不检测                                       |
| CircleCI                                        | 不提供                                           | 来自 fork 的 Pull Request 的构建             |
| Netlify                                         | 不提供                                           | 部署预览                                     |
| Cloudflare Pages、Codeship、Wercker             | 不提供                                           | 不检测                                       |
| ZEIT Now（旧的 `NOW_GITHUB_*` 变量）            | 不提供                                           | 不检测                                       |
| 通用 `CI_*` 变量（设置了 `CI`，且不是上述服务） | `CI_TARGET_BRANCH`                               | `CI_EVENT=pull_request`                      |

在不提供基准分支的情况下，构建会与 `master` 对比，除非你设置了 `CI_BRANCH_BASE`。Bundlewatch 不读取 Vercel 的 `VERCEL_*` 变量，上面的一些服务也不提供仓库信息：对于检测不到的值，请设置[下面的变量](#required-ci-environment-variables)。

### 检测不到时需要设置的变量 {#required-ci-environment-variables}

对于 CI 服务没有提供的值，请设置以下变量：

- `CI_REPO_OWNER`（例如 github.com/facebook/react 中的 `facebook`）
- `CI_REPO_NAME`（例如 github.com/facebook/react 中的 `react`）
- `CI_COMMIT_SHA`
- `CI_BRANCH`
- `CI_BRANCH_BASE`，即要对比的分支（如果不是 `master`）

Bundlewatch 读取的所有变量请参阅 [环境变量参考](../reference/configuration.md#environment-variables)。

<a id="adding-build-status-to-github-prs"></a>

## GitHub 状态 {#github-statuses}

Bundlewatch 会以 GitHub 提交状态的形式，在它检查的提交上报告结果：

<div align="center">
    <img alt="build status preview" data-zoomable src="/build-status-preview.png" width="700px">
</div>

| 状态                      | 状态值  | 描述                                                                                                                                                           |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundlewatch`             | pending | 运行期间为 `Checking bundlewatch...`                                                                                                                           |
| `bundlewatch`             | success | 摘要，例如 `Everything is in check (+1.2KB, -0B, +0.4%)`：与基准相比各文件增加和减少的字节数，以及总体积的变化。没有基准时，每个文件都算作增加，也没有百分比。 |
| `bundlewatch`             | failure | `maxSize check failed`                                                                                                                                         |
| `bundlewatch`             | error   | 发生意外错误后为 `Unable to analyze, check logs.` 加上错误信息。                                                                                               |
| `bundlewatch <file path>` | failure | 每个未通过的文件一个，附带其结果，例如 `198.6KB > 100KB (gzip)`。路径没有匹配到文件或无法读取时没有描述。                                                      |

- 有[结果链接](#results-links)时，success 或 failure 的 `bundlewatch` 状态会链接到它。其他状态没有链接。
- 如果无法连接 GitHub，状态会停留在 GitHub 最后接受的状态，例如 pending：参见 [故障排查](./troubleshooting.md#github-statuses)。
- 超过 35 个字符的路径会显示为 `*` 加上最后 37 个字符；两个路径结尾相同时，会加上 ` (2)`。
- 超过 140 个字符的描述会被截断。
- 每次运行最多发布五个状态：`bundlewatch` 和四个文件的状态。其余未通过的文件只会在日志和结果页面中列出。
- 无效的配置会在发布任何状态之前报告。

发布状态需要 token、仓库和提交。缺少它们时，Bundlewatch 只会输出结果并设置退出码。

要阻止会让文件过大的 Pull Request 被合并，请在仓库的分支保护规则或规则集中，将 `bundlewatch` 设为必需的状态检查。只需将 `bundlewatch` 设为必需：针对单个文件的状态只会在文件未通过时出现。

## 结果链接 {#results-links}

每次运行都会输出一个指向结果页面的链接（`Result breakdown at: …`），并将其用作 `bundlewatch` 状态的 _details_ 链接。

- 当服务接受你的 token 进行写入时，链接是短链接，例如 `https://service.bundlewatch.io/r/3fK9xQ2LmP7a`。服务接受其用户拥有该仓库推送权限的 token，或 GitHub Actions 中工作流的 `GITHUB_TOKEN`。服务会保存结果，并根据保存的副本渲染页面。
- 否则，结果会被打包进链接本身：`https://service.bundlewatch.io/results?d=…`。没有 token、服务不接受该 token 进行写入、服务早于 1.0，或创建短链接失败或超过 5 秒时，都会这样。对于大型项目，这类链接可能过长，一些浏览器和服务器无法处理。
- 设置 `bundlewatchServiceHost: null` 时，不会输出链接，GitHub 状态也没有 _details_ 链接。

结果页面不检查访问权限：任何拿到结果链接的人都能打开页面，私有仓库也一样。页面会显示仓库、分支和提交，以及每个文件的名称、体积和限制。它从不包含你的 token 或文件本身。

## 结果页面 {#viewing-the-results-breakdown}

结果链接打开的页面包含摘要，以及每个文件一行：

<div align="center">
    <img alt="build results preview" data-zoomable src="/build-results-preview.png" width="700px">
</div>

| 列     | 显示内容                                                     |
| ------ | ------------------------------------------------------------ |
| Status | 通过、失败或已移除：文件在基准中，但不在这次构建中           |
| File   | 经过 `normalizeFilenames` 处理后的路径                       |
| Bundle | 体积条，分为基准体积和变化量两段                             |
| Now    | 这次构建中的体积                                             |
| Diff   | 相对基准的变化；基准体积为零或不可用时（例如新文件）为 `n/a` |
| Max    | `maxSize`；文件没有限制时为 `Infinity`                       |

没有匹配到文件或无法读取的路径会显示为没有体积的失败行：原因请查看 CI 日志。不存在或已过期的短链接会显示 Results not found。自托管的服务会将短链接保留 [`ResultsRetentionDays`](./using-a-custom-server.md#deploying-the-service) 天，默认永久保留。

<a id="troubleshooting"></a>

遇到问题时，请在 [故障排查](./troubleshooting.md) 中查找对应的日志消息。
