---
title: 配置参考
description: BundleWatch 的所有选项及其默认值，以及 BundleWatch 读取的环境变量。
---

# 配置参考

将这些选项写在[配置文件](../guide/using-a-config-file.md)中，例如 `bundlewatch.config.mjs`，然后运行 `npx bundlewatch`。命令行要求设置 `files`；其他选项都有默认值。也支持将配置写在 [package.json](../guide/using-a-config-file.md#package-json) 的 `bundlewatch` 键下。

你的配置会与下面的默认值合并。`files` 和 `ci.trackBranches` 等数组会替换默认值，而不是与之合并。

| 选项                     | 默认值                             | 说明                                                                                    |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `files`                  | 无                                 | 要检查的文件及其限制，参见 [files](#files)                                              |
| `defaultCompression`     | `'gzip'`                           | 未单独设置压缩方式的文件所用的压缩方式，参见 [defaultCompression](#defaultcompression)  |
| `normalizeFilenames`     | `null`                             | 移除文件名中的 hash，参见 [normalizeFilenames](#normalizefilenames)                     |
| `bundlewatchServiceHost` | `'https://service.bundlewatch.io'` | 保存基准的服务；`null` 表示禁用，参见 [bundlewatchServiceHost](#bundlewatchservicehost) |
| `ci`                     | 从 CI 环境中自动检测               | token、仓库、提交和分支，参见 [ci](#ci)                                                 |

## `files` {#files}

`files` 中的每一项会检查与其 `path` 匹配的文件：

| 字段          | 说明                                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`        | 必填。一个 glob，相对于你运行 BundleWatch 的目录，而不是配置文件所在的目录。支持 `*`、`**` 和 `{a,b}`。没有匹配到任何文件的路径会导致运行失败，匹配到目录的路径也一样：只要 `dist` 中有子目录，`./dist/*` 就会失败，因此请写成 `./dist/*.js` 或 `./dist/**/*.js`。 |
| `maxSize`     | 可选。针对每个匹配文件的限制，而不是它们的总和：体积大于其 `maxSize` 的文件会失败。可以写成带单位的字符串，例如 `'100kB'`，也可以写成字节数，例如 `102400`。                                                                                                       |
| `compression` | 可选：`'gzip'`、`'brotli'` 或 `'none'`。默认为 [defaultCompression](#defaultcompression)。其他非空值不会被拒绝：此时文件会以不压缩的方式测量。                                                                                                                     |

`maxSize` 的取值：

- 单位为 `B`、`KB`、`MB`、`GB`、`TB` 和 `PB`。它们不区分大小写，按 1024 进制计算，因此 `'100kB'` 等于 102400 字节。
- 带有其他单位的字符串会被当作字节数：`'100k'` 和 `'100KiB'` 都表示 100 字节。
- 当 `maxSize` 未设置、为 `0`（数字，或 `'0'`、`'0kB'` 这样的字符串），或不以数字开头时，该文件没有体积限制。

相对基准的增长永远不会让检查失败：只有 `maxSize` 会。如果两项匹配到同一个路径，例如 `./dist/*.js` 和 `./dist/app.js`，会使用最后一项的 `maxSize` 和 `compression`：请把兜底的 glob 放在前面。

## `defaultCompression` {#defaultcompression}

用于测量未单独设置 `compression` 的文件的压缩方式：`gzip`（默认）、`brotli` 或 `none`。gzip 使用 9 级压缩，brotli 使用 11 级质量。其他值会让运行以 `[FATAL] config.compression must be a valid type` 停止。

Brotli 使用 Node 内置的 `zlib`，无需额外安装包。

## `normalizeFilenames` {#normalizefilenames}

移除文件名中在不同构建之间会变化的部分，例如内容 hash，使每个文件都能与其基准对比。它改变的是 BundleWatch 报告和保存的名称，而不是你的文件。

将它设为一个 `RegExp`，或一个由 BundleWatch 转换为 RegExp 的字符串。写一个从 `^` 到 `$` 匹配整个路径的模式，并用捕获组捕获要移除的部分：BundleWatch 会移除捕获到的文本。没有被模式匹配的路径保留原名。

| 路径                              | 模式                       | 结果                     |
| --------------------------------- | -------------------------- | ------------------------ |
| `./dist/main.3f2a1b9c.js`         | `/^.*(\.[a-f0-9]+)\.\w+$/` | `./dist/main.js`         |
| `./dist/assets/index-BdF3x9Qa.js` | `/^.*?(-[\w-]{8})\.\w+$/`  | `./dist/assets/index.js` |

在 JSON 中，请把模式写成不带斜杠的字符串，并把每个反斜杠写两次：`"normalizeFilenames": "^.*(\\.[a-f0-9]+)\\.\\w+$"`。

::: warning
请用你真实的文件名检验结果。第二个模式也会把 `./dist/app-polyfill.js` 变成 `./dist/app.js`。旧示例中的 `/^.+?(\..+?)\.\w+$/` 会把 `./.next/static/chunks/main-abc123.js` 变成 `./.js`。

当两个文件最终得到相同的名称时，只有最后一个会被检查和保存，并且不会有任何日志。
:::

::: details 模式是如何应用的
BundleWatch 用该模式拆分路径，得到匹配之前的文本、匹配之后的文本，以及每个捕获组。然后从路径中移除这些片段各自的第一次出现。

对于匹配整个路径的模式，结果就是移除捕获到的文本。只匹配路径一部分的模式还会移除匹配范围之外的所有内容：`/-[a-f0-9]+/` 会把 `./dist/main-abc123.js` 变成 `-abc123`。
:::

## `bundlewatchServiceHost` {#bundlewatchservicehost}

用于保存基准、创建结果短链接和渲染结果页面的服务。默认为 `'https://service.bundlewatch.io'`。

要使用[自定义服务器](../guide/using-a-custom-server.md)，请将它设为你自己服务的 URL。请填写以 `https://` 开头的完整 URL，末尾不带斜杠：BundleWatch 会在后面拼接 `/store` 等路径。它可以包含 Basic Auth 凭据，例如 `https://user:password@bundlewatch.example.com`：BundleWatch 会通过 `Authorization` 请求头发送它们，并且不会把它们写进结果链接和日志。

设为 `null` 可以禁用服务：此时 BundleWatch 只检查 `maxSize`，不会与基准对比，也不会保存基准。它不会输出结果链接，GitHub 状态没有 details 链接，[Node.js API](./nodejs.md#result) 返回 `url: undefined`。

## `ci` {#ci}

`ci` 选项让 BundleWatch 能够发布 [GitHub 状态](../guide/using-bundlewatch.md#github-statuses)，以及与基准对比和保存基准。大多数默认值会从 CI 环境中自动检测；只有需要覆盖时才设置。

| 选项                | 默认值                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `githubAccessToken` | `BUNDLEWATCH_GITHUB_TOKEN`，其次是 `GITHUB_ACCESS_TOKEN`                                                                                             |
| `repoOwner`         | 自动检测，例如 github.com/facebook/react 中的 `facebook`                                                                                             |
| `repoName`          | 自动检测，例如 github.com/facebook/react 中的 `react`                                                                                                |
| `repoCurrentBranch` | 自动检测                                                                                                                                             |
| `repoBranchBase`    | 自动检测：Pull Request 构建使用其目标分支；其他 GitHub Actions 构建使用仓库的默认分支。检测不到时为 `'master'`。                                     |
| `commitSha`         | 自动检测                                                                                                                                             |
| `trackBranches`     | `['master', 'main', 'develop']`，并在能够检测到时加上仓库的默认分支                                                                                  |
| `isPullRequest`     | 自动检测。Pull Request 构建会与基准对比，但从不保存基准；参见 [哪些构建算作 Pull Request 构建](../guide/using-bundlewatch.md#supported-ci-providers) |

分支在 `trackBranches` 中的构建会将结果保存为该分支的基准，Pull Request 构建除外。参见 [基准分支与跟踪分支](../guide/diffing-against-branches-other-than-master.md)。

## 环境变量 {#environment-variables}

BundleWatch 会读取以下环境变量。配置中的值优先。`CI_REPO_OWNER`、`CI_REPO_NAME`、`CI_REPO_SLUG`、`CI_COMMIT_SHA`、`GIT_COMMIT`、`CI_BRANCH`、`GIT_BRANCH` 和 `CI_BRANCH_BASE` 优先于 BundleWatch 从 CI 服务中检测到的值。`GIT_URL` 只在没有其他来源提供仓库时使用；`CI_EVENT` 和 `CI_TARGET_BRANCH` 只在通用 CI 中读取，即设置了 `CI` 且没有检测到受支持的 CI 服务时。

| 变量                                                     | 设置                                                                                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`，其次是 `GITHUB_ACCESS_TOKEN` | `ci.githubAccessToken`                                                                                                                                                                                              |
| `CI_REPO_OWNER`、`CI_REPO_NAME`                          | `ci.repoOwner`、`ci.repoName`                                                                                                                                                                                       |
| `CI_REPO_SLUG`（`owner/name`）                           | 在未设置上述变量时，设置 `ci.repoOwner` 和 `ci.repoName`                                                                                                                                                            |
| `CI_COMMIT_SHA`，其次是 `GIT_COMMIT`                     | `ci.commitSha`                                                                                                                                                                                                      |
| `CI_BRANCH`，其次是 `GIT_BRANCH`                         | `ci.repoCurrentBranch`                                                                                                                                                                                              |
| `CI_BRANCH_BASE`                                         | `ci.repoBranchBase`                                                                                                                                                                                                 |
| `CI_TARGET_BRANCH`                                       | 通用 CI 中未设置 `CI_BRANCH_BASE` 时，设置 `ci.repoBranchBase`                                                                                                                                                      |
| `GITHUB_API_URL`                                         | 提交状态发送到的 GitHub API 地址。默认为 `https://api.github.com`；GitHub Actions 会自动设置。GitHub Enterprise 还需要你自己的服务，参见 [GitHub Enterprise](../guide/using-a-custom-server.md#github-enterprise)。 |
| `CI_EVENT`                                               | 在通用 CI 中，值为 `pull_request` 表示这是 [Pull Request 构建](../guide/diffing-against-branches-other-than-master.md#pull-request-builds)                                                                          |
| `GIT_URL`                                                | 在没有其他来源设置时，从 github.com 远程地址（例如 `https://github.com/owner/repo.git` 或 `git@github.com:owner/repo.git`）中得到 `ci.repoOwner` 和 `ci.repoName`                                                   |
| `DEBUG`（任意非空值）                                    | 在日志中记录发往 BundleWatch 服务的失败请求的详细信息                                                                                                                                                               |
| `NO_COLOR`、`NODE_DISABLE_COLORS`、`FORCE_COLOR`         | 只有输出到终端时才带颜色。`NO_COLOR` 或 `NODE_DISABLE_COLORS` 关闭颜色。`FORCE_COLOR` 开启颜色（例如用于支持颜色的 CI 日志查看器），值为 `0` 或 `false` 时除外；它优先于另外两个变量。                              |

在 GitHub Actions、GitLab CI、Travis CI、Drone、CircleCI 以及其他若干 CI 服务上，BundleWatch 会自动检测其余的值。参见 [支持的 CI 服务](../guide/using-bundlewatch.md#supported-ci-providers)。
