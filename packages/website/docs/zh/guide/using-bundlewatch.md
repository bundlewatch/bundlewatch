---
title: 使用 Bundlewatch
description: 如何运行 Bundlewatch、设置 CI 集成以及查看结果。
---

# 使用 Bundlewatch

在你构建好的资源上运行 Bundlewatch 以检查它们的体积：

```bash
npx bundlewatch --max-size 100kb ./webpack-build/*.js
```

示例输出：

```
Result breakdown at: https://service.bundlewatch.io/results?d=...

PASS ./webpack-build/app.js: 30.71KB < 100KB (gzip)
FAIL ./webpack-build/vendor.js: 198.6KB > 100KB (gzip)

bundlewatch FAIL
maxSize check failed
```

该命令会在终端中立即给出反馈，检查失败时以退出码 1 退出。要在 GitHub Pull Request 上报告结果并与主分支对比，请按下文所述在 CI 中运行它。你的仓库需要托管在 GitHub 上；CI 可以在任何地方。

## 为 GitHub PR 添加构建状态 {#adding-build-status-to-github-prs}

Bundlewatch 可以直接在你的 GitHub Pull Request 上报告其状态。

<div align="center">
    <img alt="build status preview" data-zoomable src="/build-status-preview.png" width="700px">
</div>

## GitHub Actions（推荐） {#github-actions}

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
- 仓库、提交、分支和 Pull Request 的目标分支会被自动检测，包括仓库的默认分支。在 Pull Request 上，状态会报告到 PR 的最新提交。
- 推送到被跟踪分支（`master`、`main`、`develop` 以及你的默认分支）时，结果会被保存为新的基准。Pull Request 会与其目标分支的基准进行对比。参见 [基准分支与跟踪分支](./diffing-against-branches-other-than-master.md)。

::: info 来自 fork 的 Pull Request
GitHub 只为来自 fork 的 Pull Request 提供只读 token，因此 Bundlewatch 无法在这些 PR 上发布状态，而是会记录一个来自 GitHub 的 `403` 错误。不过当文件超过 `maxSize` 时，任务仍然会失败。
:::

## 其他 CI 服务 {#other-ci-providers}

在构建步骤之后运行 `npx bundlewatch`，并通过 `BUNDLEWATCH_GITHUB_TOKEN` 提供 token。

### 设置 CI 认证 {#setting-up-ci-authentication}

Bundlewatch 需要 `BUNDLEWATCH_GITHUB_TOKEN` 中的 GitHub token 来发布 PR 状态，以及与基准对比和保存基准。没有 token 时，它只检查 `maxSize`。你可以在以下地址获取你的 token：

https://service.bundlewatch.io/setup-github

请以拥有该仓库推送权限的用户身份创建它，这样服务才会接受用它保存基准和创建结果短链接。在你的 CI 环境中将此 token 设置为私密环境变量，切勿将它提交到仓库中。

### 支持的 CI 服务 {#supported-ci-providers}

Bundlewatch 会从以下 CI 服务自己的环境变量中读取仓库、提交和分支：

| CI 服务        | Pull Request 的基准分支                                               |
| -------------- | --------------------------------------------------------------------- |
| GitHub Actions | 自动检测。其他构建使用仓库的默认分支。                                |
| GitLab CI      | 在合并请求流水线中自动检测                                            |
| Travis CI      | 自动检测                                                              |
| Drone          | 自动检测                                                              |
| CircleCI       | 不提供：请设置 `CI_BRANCH_BASE`，否则 Pull Request 会与 `master` 对比 |

它也会读取 Netlify、Cloudflare Pages、Buddy、Codefresh、Codeship 和 Wercker 的变量，但其中一些服务不提供仓库或目标分支。对于检测不到的值，请设置下面的变量。

### CI 所需环境变量 {#required-ci-environment-variables}

在其他 CI 服务上，或对于检测不到的值，请设置以下环境变量：

- `CI_REPO_OWNER`（例如 github.com/facebook/react 中的 `facebook`）
- `CI_REPO_NAME`（例如 github.com/facebook/react 中的 `react`）
- `CI_COMMIT_SHA`
- `CI_BRANCH`
- `CI_BRANCH_BASE`，即要对比的分支（如果不是 `master`）

Bundlewatch 读取的所有变量请参阅 [环境变量参考](../reference/configuration.md#environment-variables)。

## GitHub 状态 {#github-statuses}

Bundlewatch 会以 GitHub 提交状态的形式，在它检查的提交上报告结果：

- **`bundlewatch`**：运行期间为 _pending_（"Checking bundlewatch..."），之后为 _success_ 并附带摘要，例如 `Everything is in check (+1.2KB, -0B, +0.4%)`，或为 _failure_ 并附带 `maxSize check failed`。摘要会分别累计与基准分支相比各文件增加和减少的字节数，并给出总体积的变化。它的 _details_ 链接会打开[结果页面](#results-links)。
- **`bundlewatch <file path>`**：每个未通过的文件还会各有一个 _failure_ 状态，附带该文件的体积和限制。过长的路径会被截短为最后 37 个字符。
- 每次运行最多发布五个状态：`bundlewatch` 状态和四个文件的状态。其余未通过的文件只会在日志和结果页面中列出。
- 如果 Bundlewatch 在发布 _pending_ 之后遇到意外错误，`bundlewatch` 会变为 _error_（"Unable to analyze, check logs."）。无效的配置会在发布任何状态之前报告。

发布状态需要 token、仓库和提交。缺少它们时，Bundlewatch 只会输出结果并设置退出码。

要阻止会让文件过大的 Pull Request，请在仓库的分支保护规则或规则集中，将 `bundlewatch` 设为必需的状态检查。只需将 `bundlewatch` 设为必需：针对单个文件的状态只会在文件未通过时出现。

## 结果链接 {#results-links}

每次运行都会输出一个指向结果页面的链接（`Result breakdown at: …`），并将其用作 GitHub 状态的 _details_ 链接。

- 当服务接受你的 token 进行写入时，链接是短链接，例如 `https://service.bundlewatch.io/r/3fK9xQ2LmP7a`。服务接受其用户拥有该仓库推送权限的 token，或 GitHub Actions 中工作流的 `GITHUB_TOKEN`。服务会保存结果，并根据保存的副本渲染页面。
- 否则，在未配置 token 或服务不接受该 token 进行写入时，结果会被打包进链接本身：`https://service.bundlewatch.io/results?d=…`。对于大型项目，这类链接可能过长，一些浏览器和服务器会拒绝。
- 设置 `bundlewatchServiceHost: null` 时，不会输出链接，GitHub 状态也没有 _details_ 链接。
- 已有的 `/results?d=…` 链接仍然可以访问。旧的 `ja2r7.app.goo.gl` 短链接在 Google 继续重定向它们期间仍然可用。

## 查看结果详情 {#viewing-the-results-breakdown}

设置完成后，Bundlewatch 会在你的 PR 上发布构建状态。点击 _details_ 链接可以查看结果详情。

<div align="center">
    <img alt="build results preview" data-zoomable src="/build-results-preview.png" width="700px">
</div>

## 故障排查 {#troubleshooting}

- `[ERROR] Unable to fetch fileDetails … code=404`：基准分支还没有保存过基准，例如第一次运行时。在基准分支的某次构建保存了基准之后，该错误就会消失。如果没有消失，请检查基准分支是否正确（参见 [基准分支与跟踪分支](./diffing-against-branches-other-than-master.md)），以及它是否为跟踪分支。
- 来自 fork 的 Pull Request 上的 `[ERROR] GitHubService HTTP_403 :: …`：它们的 token 无法发布状态。参见 [来自 fork 的 Pull Request](#github-actions)。
- `[WARNING] Some CI configuration options were not found (…)`：Bundlewatch 缺少列出的值，因此只检查 `maxSize`。在你自己的机器上运行时，这是正常的。在 CI 中，请设置日志中列出的 token 或[变量](#required-ci-environment-variables)。
- `[ERROR] There is no matching file for ./dist/*.js`：该路径没有匹配到任何文件，这会导致运行失败。请检查构建是否已先运行，以及路径是否相对于你运行 Bundlewatch 的目录。
- `[WARNING] Max reported statuses reached …`：超过四个文件未通过。参见 [GitHub 状态](#github-statuses)。
- 将 `DEBUG` 环境变量设为任意值，可以在日志中记录失败请求的详细信息。

---

- [使用配置文件](./using-a-config-file.md)
- [基准分支与跟踪分支](./diffing-against-branches-other-than-master.md)
- [配置参考](../reference/configuration.md)
