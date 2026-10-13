---
title: 迁移到 1.0
description: 从 BundleWatch 0.x 升级到 1.0 时有哪些变化。
---

# 迁移到 1.0

大多数项目无需任何改动。你的配置、CLI 参数、环境变量、GitHub 状态名称和退出码都与之前一致。本页列出所有行为不同的地方。[CONTRACT.md](https://github.com/bundlewatch/bundlewatch/blob/main/CONTRACT.md) 列出了保持兼容的内容。

1.0 是一个新的主版本，`^0.x` 和 `~0.x` 版本范围不会升级到它：在你主动升级之前，一切都不会改变。如果你是从 0.3.x 升级，下文的大部分内容同样适用。

<a id="requirements"></a>

## 手动升级 {#upgrade-by-hand}

1. 使用 Node.js 22.17 或更高版本，CI 中也一样。Node.js 16、18 和 20 已停止维护。
2. 更新 BundleWatch：

::: code-group

```bash [npm]
npm install bundlewatch@1 --save-dev
```

```bash [pnpm]
pnpm add bundlewatch@1 --save-dev
```

```bash [Yarn]
yarn add bundlewatch@1 --dev
```

```bash [Bun]
bun add bundlewatch@1 --dev
```

:::

3. 逐项查看下面的[需要检查的地方](#things-to-check)。
4. 构建，然后运行 `npx bundlewatch`。

## 使用 AI 编程助手升级 {#upgrade-with-an-ai-agent}

将下面的提示词复制到你的 AI 编程助手中，以升级项目：

```text:no-line-numbers
在这个仓库中将 BundleWatch 升级到 1.0。

阅读 https://bundlewatch.io/guide/migrating-to-v1.md 了解有哪些变化，并阅读 https://bundlewatch.io/llms-full.txt 获取完整的文档。然后：

1. 使用这个项目所用的包管理器，将 BundleWatch 更新到最新的 1.x 版本。它需要 Node.js 22.17 或更高版本：如果 CI 中使用的 Node.js 版本更旧，请更新它。
2. 对照迁移指南中“需要检查的地方”（Things to check）一节检查配置，并跟进其中的链接。数字形式的 "maxSize" 现在会生效：如果某个文件未通过一个以前从未检查过的限制，不要提高该限制，而是告诉我。
3. 在 GitHub Actions 上，按照指南中的说明改用工作流的 GITHUB_TOKEN，并移除 1.0 已不再需要的变通做法，例如只是为了避免与 master 对比而设置的 CI_BRANCH_BASE，或设置为 Pull Request 最新提交的 CI_COMMIT_SHA。
4. 如果没有其他地方使用 brotli-size 依赖，请将其移除。
5. 构建，运行 `npx bundlewatch`，并总结你修改了什么、哪些行为现在有所不同，以及还剩下哪些需要我来做的事，例如删除不再使用的 token secret。
```

## 需要检查的地方 {#things-to-check}

- 数字形式的 `maxSize`（例如 `102400`）现在会生效。如果某个文件现在未通过，说明它以前就已经超出限制：参见 [数字形式的 maxSize](#numeric-maxsize)。
- `files` 和 `ci.trackBranches` 会替换默认值，而不是与之合并：参见 [跟踪分支](#tracked-branches)。
- 在 GitHub Actions 上，推送会与默认分支对比，而不是 `master`：参见 [GitHub Actions 上的基准分支](#default-branch-detection-on-github-actions)。
- Pull Request 构建不再保存基准：参见 [Pull Request 构建](#pull-request-builds-no-longer-save-baselines)。
- 没有推送权限的用户的 token 将无法再保存基准：参见 [服务的变化](#service-changes)。
- 对 `bundlewatch/lib/…` 的深层导入不再可用，`bundlewatch/lib/app` 和 `bundlewatch/lib/app/index.js` 除外：参见 [加载该包](#loading-the-package)。
- 使用代理时，请参阅 [代理变量](#proxy-variables)。使用 GitHub Enterprise 时，请参阅 [GitHub Enterprise](#github-enterprise)。

## 变化内容 {#what-changed}

### 加载该包 {#loading-the-package}

- `import bundlewatch, { STATUSES } from 'bundlewatch'` 以及 `require('bundlewatch').default` / `.STATUSES` 与之前一样可用。
- 该包同时提供 ES 模块和 CommonJS 构建，并带有 TypeScript 类型。
- `bundlewatch/lib/app` 和 `bundlewatch/lib/app/index.js` 仍会加载主导出，`import` 和 `require()` 都可以；直接运行 `node_modules/bundlewatch/lib/bin/index.js` 仍会运行 CLI。
- 其他对 `bundlewatch/lib/…` 的深层导入不再可用；请使用该包的主导出。

### 结果短链接 {#short-results-links}

- 以前，结果会被打包进 URL，再通过 Firebase Dynamic Links 缩短，而 Google 已关闭该产品。大型项目生成的 URL 会被浏览器和服务器拒绝（issue [#404](https://github.com/bundlewatch/bundlewatch/issues/404) 和 [#456](https://github.com/bundlewatch/bundlewatch/issues/456)）。
- 现在，当服务接受你的 token 进行写入时，链接是短链接：`https://service.bundlewatch.io/r/<id>`。什么情况下不是短链接，请参阅 [结果链接](./using-bundlewatch.md#results-links)。
- 每次配置了 token 的运行都会多向服务发送一个请求，用于创建短链接。该请求 5 秒后放弃，并回退为长链接。
- 已有的 `/results?d=…` 链接仍然可以访问，包括 `maxSize` 不限时生成的、以前从未能渲染的链接。旧的 `ja2r7.app.goo.gl` 短链接在 Google 继续重定向它们期间仍然可用。

### `bundlewatchServiceHost: null` {#bundlewatchservicehost-null}

禁用服务后，不会输出结果链接，GitHub 状态没有 details 链接，[Node.js API](../reference/nodejs.md#result) 返回 `url: undefined`。在 1.0 之前，该链接指向 `null/results?d=…`。

### 带凭据的服务 URL {#service-urls-with-credentials}

`bundlewatchServiceHost` URL 中的 Basic Auth 凭据（`https://user:pass@…`）仍然有效，并且不再出现在结果链接中：0.x 会把它们输出到 CI 日志中，并作为 GitHub 状态的 details 链接发布。参见 [bundlewatchServiceHost](../reference/configuration.md#bundlewatchservicehost)。

### GitHub Actions 上的基准分支 {#default-branch-detection-on-github-actions}

- Pull Request 构建以前就会与 Pull Request 的目标分支对比。
- 其他构建（例如推送）现在会与仓库的默认分支对比，而不是 `master`（issue [#423](https://github.com/bundlewatch/bundlewatch/issues/423) 和 [service #280](https://github.com/bundlewatch/service/issues/280)）。
- 设置 `CI_BRANCH_BASE` 或 `ci.repoBranchBase` 仍然可以覆盖这一行为。如果你设置 `CI_BRANCH_BASE` 只是为了避开 `master`，请将其删除：它也会替换 Pull Request 的目标分支。参见 [基准分支与跟踪分支](./diffing-against-branches-other-than-master.md)。

### GitHub Actions 上的 Pull Request 状态 {#pull-request-statuses-on-github-actions}

- 状态现在会报告到 Pull Request 的最新提交。
- 以前它们会被报告到 `GITHUB_SHA`，即一个临时合并提交，因此除非你自己设置了 `CI_COMMIT_SHA`，否则不会显示在 Pull Request 上。继续设置它也仍然有效。

### 跟踪分支 {#tracked-branches}

- `trackBranches` 的默认值现在是 `['master', 'main', 'develop']`，在 GitHub Actions 中还会加上仓库的默认分支。
- 配置中的 `trackBranches` 和 `files` 数组现在会替换默认值。以前它们会按索引逐项合并，因此 `trackBranches: ['main']` 实际跟踪的是 `['main', 'develop']`。

### Pull Request 构建不再保存基准 {#pull-request-builds-no-longer-save-baselines}

Pull Request 构建会与基准对比，但不再保存基准。以前，如果 Pull Request 的源分支名是被跟踪的名称（例如 fork 中的 `master`），它会用自己的体积覆盖真正的 `master` 的基准。

哪些构建算作 Pull Request 构建，请参阅 [Pull Request 构建](./diffing-against-branches-other-than-master.md#pull-request-builds)。

### 数字形式的 `maxSize` {#numeric-maxsize}

数字形式的 `maxSize`（例如 `102400`）现在会生效。以前它会被静默忽略，检查总是通过。如果你的 bundle 超过了数字形式的限制，BundleWatch 现在会报告。

`0`（无论是数字，还是 `'0'`、`'0kB'` 这样的字符串）仍然表示不限制。

### 其他修复 {#other-fixes}

- <a id="branch-names-containing"></a>在 GitHub Actions 的推送构建中，包含 `/` 的分支名现在能被正确读取：0.x 会把推送到 `feat/foo` 识别为 `feat`（issue [#422](https://github.com/bundlewatch/bundlewatch/issues/422)）。
- <a id="runs-with-missing-files"></a>如果一次运行中有文件缺失或无法读取，它不再发送基准。服务以前也会拒绝这样的基准；现在 CLI 会记录原因。
- <a id="empty-files"></a>使用 `compression: 'none'` 时，空文件会被计为 0 B，而不是以 `Could not read file` 失败。使用 gzip 和 brotli 时，空文件以前就会被测量（分别为 20 B 和 1 B）。
- <a id="files-named-after-javascript-object-properties"></a>名为某个 `Object.prototype` 属性（例如 `constructor`）的文件被删除后，现在会显示为已移除，而不是没有体积的通过项。同名的新文件会以 0 字节作为基准。规范化后路径恰好为 `__proto__` 的文件，现在会被测量和检查，而不是被丢弃。
- <a id="running-outside-a-package"></a>在没有 package.json 的目录中运行 BundleWatch 不会再崩溃（issue [#434](https://github.com/bundlewatch/bundlewatch/issues/434)）。
- <a id="version"></a>`-V` 和 `--version` 会输出版本号。其他参数与之前一致，包括不带值的 `--max-size` 表示不限制体积；参见 [命令行](../reference/cli.md)。
- <a id="generic-ci-without-a-repository"></a>设置了 `CI` 但没有设置 `CI_REPO_OWNER` 和 `CI_REPO_NAME` 时，BundleWatch 会回退到 `GIT_URL`，而不是使用仓库 `undefined/undefined`。
- <a id="config-files"></a>`--config` 支持绝对路径。它通过 `import()` 加载 `.mjs` 文件以及只有具名导出的配置，并在 Node.js 22.18 及更高版本上加载 `.ts`、`.mts` 和 `.cts` 文件。参见 [使用配置文件](./using-a-config-file.md)。

### 代理变量 {#proxy-variables}

BundleWatch 不再读取 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY` 或类似的变量：0.x 只是借由其 HTTP 库顺带使用了它们，从未在文档中说明。如果代理会阻止直接连接，请参阅 [故障排查](./troubleshooting.md#behind-a-proxy)。

### Brotli {#brotli}

无需安装 `brotli-size` 即可使用 Brotli 压缩，你可以将其移除。Node 内置的 `zlib` 会得到完全相同的体积。

### GitHub Enterprise {#github-enterprise}

设置了 `GITHUB_API_URL` 时，提交状态会发送到该地址的 GitHub API；GitHub Enterprise Server 上的 GitHub Actions 会自动设置它。其余设置请参阅 [GitHub Enterprise](./using-a-custom-server.md#github-enterprise)。

### 从使用 `normalizeFilenames` 的 0.3.x 升级 {#upgrading-from-0-3-x-with-normalizefilenames}

0.3.x 会把所有未被该模式匹配的文件以空名称保存。在第一次运行 1.0 时，这些文件会显示为新增，而一个空名称的条目会显示为已移除，直到某个跟踪分支保存了新的基准。

## 服务的变化（service.bundlewatch.io） {#service-changes}

<!-- 该部分以前的锚点，为已有链接保留。 -->

<a id="running-your-own-service"></a>

这些变化适用于所有 CLI 版本，包括 0.x。

::: warning
在 service.bundlewatch.io 强制执行下面更严格的检查之前，请替换没有推送权限的用户的 token：以拥有推送权限的用户身份在 [`/setup-github`](https://service.bundlewatch.io/setup-github) 创建新的 token，或在 GitHub Actions 中[使用 `GITHUB_TOKEN`](#using-the-github-actions-token)。
:::

- `POST /results` 用于创建短链接，需要写入权限（见下文）；`GET /r/{id}` 用于渲染它。
- 保存基准和创建短链接需要更严格的授权，先以仅报告模式上线：
  - 要保存基准，公开仓库上的 token 必须属于拥有推送权限的用户，或者是该仓库的安装 token，例如该仓库自己工作流中的 `GITHUB_TOKEN`。
  - 以前，任何 GitHub token 都可以覆盖公开仓库的基准。
  - 一开始，服务只会记录新规则将会拒绝的请求。
  - 在报告模式下，更严格的检查从不改变决定，即使它失败或超时也是如此。
  - 读取基准与之前一致。
- 错误码有所变化：
  - 格式错误的结果链接返回 `400`，而不是 `500`。
  - 与 GitHub 通信失败时返回 `503`，而不是 `401` 或 `500`。
  - 过大而无法保存的基准返回 `413`，而不是 `500`。
- 服务现在接受 `maxSize` 为体积字符串（例如 `"100KB"`）的基准和链接。0.x 会拒绝它们，尽管当配置中的 `maxSize` 是数字时，0.x CLI 自己就会发送这样的值。
- `/setup-github` 会校验 OAuth `state`。在另一个浏览器中发起的授权，或 10 分钟之前发起的授权，需要重新开始。
- 部署改用 AWS SAM 和 GitHub Actions OIDC，取代 Serverless Framework v3 和 CircleCI。参见 [`packages/service/README.md`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md)。

## 使用 GitHub Actions 的 token {#using-the-github-actions-token}

如果你在 GitHub Actions 中使用从 `service.bundlewatch.io/setup-github` 获取的 token 运行 BundleWatch，可以改用 GitHub 为每次工作流运行创建的 token：为工作流授予 `statuses: write` 权限，保留 `contents: read`，并将 `secrets.GITHUB_TOKEN` 作为 `BUNDLEWATCH_GITHUB_TOKEN` 传入。服务接受用该 token 保存基准和创建短链接。完整的工作流请参阅 [GitHub Actions](./using-bundlewatch.md#github-actions)。
