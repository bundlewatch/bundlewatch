---
title: 基准分支与跟踪分支
description: Bundlewatch 如何选择对比的分支，以及哪些分支会保存基准。
---

# 基准分支与跟踪分支

Bundlewatch 会将每次构建与一个基准进行对比：基准是为基准分支保存的最近一次结果。有两个设置控制这一行为：

- **基准分支**（`ci.repoBranchBase`）是当前构建要对比的分支。
- **跟踪分支**（`ci.trackBranches`）是构建时会保存新基准的分支。

## 基准分支 {#base-branch}

Bundlewatch 会使用以下第一个可用的值：

1. 你的[配置](../reference/configuration.md#ci)中的 `ci.repoBranchBase`。
2. `CI_BRANCH_BASE` 环境变量。
3. Pull Request 的目标分支（如果你的 CI 提供）。GitHub Actions、GitLab、Travis 和 Drone 会提供。
4. 在 GitHub Actions 中，仓库的默认分支。
5. `master`。

这意味着在 GitHub Actions 中无需任何配置：Pull Request 会与其目标分支对比，其他构建会与默认分支对比。

如果你想对比其他分支（例如 `develop`），请设置 `CI_BRANCH_BASE` 环境变量。注意它会作用于每一次构建，包括目标分支不同的 Pull Request。

::: info 信息
查看哪些 CI 变量会被自动检测，请参阅 [环境变量参考](../reference/configuration.md#environment-variables) 和 [CLI 源码](https://github.com/bundlewatch/bundlewatch/blob/main/packages/bundlewatch/src/ci.ts)。
:::

## 跟踪分支 {#tracked-branches}

默认情况下，Bundlewatch 跟踪 `master`、`main` 和 `develop`，以及能检测到的仓库默认分支（在 GitHub Actions 中）。满足以下条件时，构建会将结果保存为其分支的基准：

- 它的分支被跟踪，
- 它不是 Pull Request 构建，并且
- 所有文件都能找到并读取。

要跟踪其他分支（例如 `staging`），请在 `package.json` 的 Bundlewatch 配置中添加 `trackBranches` 选项。该列表会替换默认列表，因此请列出所有你想跟踪的分支：

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "myfolder/*.js",
        "maxSize": "100kB"
      }
    ],
    "ci": {
      "trackBranches": ["main", "develop", "staging"]
    }
  }
}
```

::: warning 1.0 中的变化
在 1.0 之前，`trackBranches` 会与默认值按索引逐项合并，因此 `["main"]` 实际跟踪的是 `["main", "develop"]`。现在会原样使用你的列表。
:::

### Pull Request 构建 {#pull-request-builds}

Pull Request 构建会与基准对比，但从不保存基准，即使 Pull Request 的分支名是被跟踪的名称，例如 fork 中的 `master`。

只有 CI 服务专门为 Pull Request 运行的构建才算作 Pull Request 构建：

| CI 服务          | 算作 Pull Request 构建的情况                 |
| ---------------- | -------------------------------------------- |
| GitHub Actions   | `pull_request` 和 `pull_request_target` 事件 |
| GitLab           | 合并请求流水线                               |
| Travis           | Pull Request 构建                            |
| Drone            | `pull_request` 事件                          |
| Netlify          | 部署预览                                     |
| CircleCI         | 来自 fork 的 Pull Request 的构建             |
| 通用 `CI_*` 变量 | `CI_EVENT=pull_request`                      |

分支构建会继续保存基准，即使该分支有打开的 Pull Request。在 [JavaScript 配置文件](./using-a-config-file.md)中设置 `ci.isPullRequest` 可以覆盖这一检测。

更多配置选项，请参阅 [配置参考](../reference/configuration.md)。
