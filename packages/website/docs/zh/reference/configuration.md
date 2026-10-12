---
title: 配置参考
description: Bundlewatch 的所有选项及其默认值，以及 Bundlewatch 读取的环境变量。
---

# 配置参考

唯一必需的配置是包含至少一个 `path` 的 `files` 数组。
`bundlewatch.config.mjs`

```js
export default {
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kB',
      compression: 'none',
    },
  ],
  normalizeFilenames: /^.+?(\..+?)\.\w+$/,
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // 可以是自定义服务
  ci: {
    trackBranches: ['main', 'develop', 'staging'], // 替换默认列表
  },
  defaultCompression: 'gzip',
}
```

你的配置会与下面的默认值合并。`files` 和 `ci.trackBranches` 等数组会替换默认值，而不是与之合并。

| 选项                     | 默认值                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `files`                  | 无，必填                                                            |
| `defaultCompression`     | `'gzip'`                                                            |
| `normalizeFilenames`     | `null`                                                              |
| `bundlewatchServiceHost` | `'https://service.bundlewatch.io'`；设为 `null` 时禁用服务          |
| `ci.repoBranchBase`      | 自动检测，检测不到时为 `'master'`                                   |
| `ci.trackBranches`       | `['master', 'main', 'develop']`，并在能够检测到时加上仓库的默认分支 |
| 其他 `ci` 选项           | 从 CI 环境中自动检测                                                |

## `files` {#files}

数组中的每个 `file` 如下所示

```js
{
  path: "./myfolder/*.js", // 必填
  maxSize: "100kB",
  compression: "none",
}
```

- `path` 是单个文件或一组文件的 glob，相对于运行 Bundlewatch 的目录。没有匹配到任何文件的路径会导致运行失败。
- `maxSize` 是可选的。它可以是带单位的字符串，例如 `'100kB'`，也可以是字节数，例如 `102400`。
  - 单位为 `B`、`KB`、`MB`、`GB`、`TB` 和 `PB`。它们不区分大小写，按 1024 进制计算，因此 `'100kB'` 等于 102400 字节。
  - 带有其他单位的字符串会被当作字节数：`'100k'` 和 `'100KiB'` 都表示 100 字节。
  - 当 `maxSize` 未设置、为 `0`（数字，或 `'0'`、`'0kB'` 这样的字符串），或不以数字开头时，该文件没有体积限制。
- `compression` 是可选的，默认为 [`defaultCompression`](#defaultcompression)。该字符串必须是 `gzip`、`brotli` 或 `none` 之一。

## `defaultCompression` {#defaultcompression}

用于测量未单独设置 `compression` 的文件的压缩方式：`gzip`（默认）、`brotli` 或 `none`。Brotli 使用 Node 内置的 `zlib`，无需额外安装包。

## `normalizeFilenames` {#normalizefilenames}

用于移除文件名中的部分内容，例如你的文件名包含类似 `main.abc134.js` 的 hash。

接受一个 `RegExp` 或可被解析为 RegExp 的 `string`。正则表达式捕获组匹配到的内容会被移除。

示例：

**Hash 移除器：**
查找点与扩展名之间的字符并将其移除。

正则表达式: `/^.+?(\..+?)\.\w+$/`

字符串: `"^.+?(\\..+?)\\.\\w+$"`

## `ci` {#ci}

该对象用于启用 [bundlewatch 的核心功能](../guide/using-bundlewatch.md)：GitHub 状态，以及与基准对比和保存基准。除非你手动设置，每个值都会从 CI 环境中自动检测。

| 选项                | 默认值                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `githubAccessToken` | `BUNDLEWATCH_GITHUB_TOKEN`，其次是 `GITHUB_ACCESS_TOKEN`                                                                                                                   |
| `repoOwner`         | 自动检测，例如 github.com/facebook/react 中的 `facebook`                                                                                                                   |
| `repoName`          | 自动检测，例如 github.com/facebook/react 中的 `react`                                                                                                                      |
| `repoCurrentBranch` | 自动检测                                                                                                                                                                   |
| `repoBranchBase`    | 自动检测：PR 合并到的分支；在 GitHub Actions 中为仓库的默认分支。检测不到时为 `'master'`。                                                                                 |
| `commitSha`         | 自动检测                                                                                                                                                                   |
| `trackBranches`     | `['master', 'main', 'develop']`，并在能够检测到时加上仓库的默认分支                                                                                                        |
| `isPullRequest`     | 自动检测。Pull Request 构建会与基准对比，但不会保存基准；参见 [哪些构建算作 Pull Request 构建](../guide/diffing-against-branches-other-than-master.md#pull-request-builds) |

分支在 `trackBranches` 中的构建会将结果保存为该分支的基准，Pull Request 构建除外。参见 [基准分支与跟踪分支](../guide/diffing-against-branches-other-than-master.md)。

### 环境变量 {#environment-variables}

Bundlewatch 会读取以下环境变量。`CI_*` 和 `GIT_*` 变量优先于从 CI 服务中检测到的值，而配置中的值优先于两者。

| 变量                                                     | 设置                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`，其次是 `GITHUB_ACCESS_TOKEN` | `ci.githubAccessToken`                                                                                                                                                                                        |
| `CI_REPO_OWNER`、`CI_REPO_NAME`                          | `ci.repoOwner`、`ci.repoName`                                                                                                                                                                                 |
| `CI_REPO_SLUG`（`owner/name`）                           | 在未设置上述变量时，设置 `ci.repoOwner` 和 `ci.repoName`                                                                                                                                                      |
| `CI_COMMIT_SHA`，其次是 `GIT_COMMIT`                     | `ci.commitSha`                                                                                                                                                                                                |
| `CI_BRANCH`，其次是 `GIT_BRANCH`                         | `ci.repoCurrentBranch`                                                                                                                                                                                        |
| `CI_BRANCH_BASE`                                         | `ci.repoBranchBase`                                                                                                                                                                                           |
| `GITHUB_API_URL`                                         | 提交状态发送到的 GitHub API 地址。默认为 `https://api.github.com`；GitHub Actions 会自动设置。GitHub Enterprise 还需要你自己的服务，参见 [GitHub Enterprise](../guide/migrating-to-v1.md#github-enterprise)。 |
| `CI_EVENT`                                               | 未检测到受支持的 CI 服务时，值为 `pull_request` 表示这是 [Pull Request 构建](../guide/diffing-against-branches-other-than-master.md#pull-request-builds)                                                      |
| `GIT_URL`                                                | 在没有其他来源设置时，从 github.com URL 中得到 `ci.repoOwner` 和 `ci.repoName`                                                                                                                                |
| `DEBUG`（任意值）                                        | 启用调试日志                                                                                                                                                                                                  |
| `NO_COLOR`、`FORCE_COLOR`                                | 只有输出到终端时才带颜色。`NO_COLOR` 关闭颜色，`FORCE_COLOR` 开启颜色，例如用于支持颜色的 CI 日志查看器                                                                                                       |

在 GitHub Actions、GitLab CI、Travis CI、Drone、CircleCI 以及其他若干 CI 服务上，Bundlewatch 会自动检测其余的值。参见 [支持的 CI 服务](../guide/using-bundlewatch.md#supported-ci-providers)。

## `bundlewatchServiceHost` {#bundlewatchservicehost}

用于保存基准、创建结果短链接和渲染结果页面的服务。默认为 `'https://service.bundlewatch.io'`。

如果你希望使用[自定义服务器](../guide/using-a-custom-server.md)，可以修改此项。设置为 `null` 可以禁用服务：此时 Bundlewatch 只检查 `maxSize`，不会与基准对比，也不会保存基准。它不会输出结果链接，GitHub 状态没有详情链接，[Node.js API](./nodejs.md#result) 返回 `url: undefined`。
