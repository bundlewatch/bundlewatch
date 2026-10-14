---
title: 基准分支与跟踪分支
description: BundleWatch 如何选择要对比的分支、哪些分支会保存基准，以及文件如何与基准匹配。
---

# 基准分支与跟踪分支

BundleWatch 会将每次构建与一个基准对比：基准是为基准分支保存的最近一次结果。有两个设置控制这一行为：

- 基准分支（`ci.repoBranchBase`）是当前构建要对比的分支。
- 跟踪分支（`ci.trackBranches`）是构建时会保存新基准的分支。

## 基准分支 {#base-branch}

BundleWatch 会使用以下第一个可用的值：

1. 你的[配置](../reference/configuration.md#ci)中的 `ci.repoBranchBase`。
2. `CI_BRANCH_BASE` 环境变量。
3. Pull Request 的目标分支，如果你的 CI 服务提供（[各 CI 服务的情况](./using-bundlewatch.md#supported-ci-providers)）。
4. 在 GitHub Actions 中，仓库的默认分支。
5. `master`。

因此在 GitHub Actions 中无需任何配置：Pull Request 会与其目标分支对比，其他构建会与默认分支对比。

当前四项都不可用时，例如 GitLab CI 或 Travis CI 上的推送，以及 CircleCI 上的所有构建，构建会与 `master` 对比。如果你的主分支使用其他名称，或者你想与 `develop` 等分支对比，请设置 `CI_BRANCH_BASE`。它会作用于每一次构建，包括目标为其他分支的 Pull Request。

## 文件如何匹配 {#how-files-are-matched}

每个文件会与基准中同名的条目对比：名称是你的 glob 写出的路径，再经过 `normalizeFilenames` 处理。`./dist/app.js` 和 `dist/app.js` 是不同的名称，因此把 `./dist/*.js` 改成 `dist/*.js` 会让每个文件都显示为已移除和新增。对比体积时不会检查压缩方式，因此把某个文件从 gzip 改为 brotli 会显示为体积变化。

这些差异会一直存在，直到某次跟踪分支的构建用新配置保存了基准。

## 跟踪分支 {#tracked-branches}

默认情况下，BundleWatch 跟踪 `master`、`main` 和 `develop`，以及能检测到的仓库默认分支（在 GitHub Actions 中）。满足以下条件时，构建会将结果保存为其分支的基准：

- 它的分支被跟踪，
- 它不是 Pull Request 构建，并且
- 所有文件都能找到并读取。

未通过 `maxSize` 检查的构建仍然会保存体积。

要跟踪其他分支（例如 `staging`），请在 `bundlewatch.config.mjs` 的 `ci` 中添加 `trackBranches` 选项。该列表会替换默认列表，因此请列出所有你想跟踪的分支：

```js [bundlewatch.config.mjs]
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  ci: {
    trackBranches: ['main', 'develop', 'staging'],
  },
}
```

使用此配置运行：

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

::: warning 每个分支一个基准
每个分支只有一个基准。如果有多次 BundleWatch 运行在同一个分支上保存基准，例如 monorepo 中每个包各运行一次，最后一次会覆盖其他几次，之后的对比会把其他运行的文件显示为已移除。请在一次运行中检查所有文件。
:::

### Pull Request 构建 {#pull-request-builds}

Pull Request 构建会与基准对比，但从不保存基准，即使 Pull Request 的分支名是被跟踪的名称，例如 fork 中的 `master`。

只有 CI 服务专门为 Pull Request 运行的构建才算作 Pull Request 构建：参见 [支持的 CI 服务](./using-bundlewatch.md#supported-ci-providers)。

分支构建会继续保存基准，即使该分支有打开的 Pull Request。在 [JavaScript 配置文件](./using-a-config-file.md)中设置 `ci.isPullRequest` 可以覆盖这一检测。
