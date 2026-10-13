---
title: 使用自定义服务器
description: 如何运行你自己的 Bundlewatch 服务并将项目配置为使用它。
---

# 在 Bundlewatch 中使用自定义服务器

Bundlewatch 服务负责保存构建对比所用的基准、创建结果短链接并渲染结果页面。你可以运行自己的实例，而不是使用 `https://service.bundlewatch.io`。

该服务位于 Bundlewatch 仓库的 [`packages/service`](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service) 目录中。它运行在 AWS Lambda 上，数据保存在 DynamoDB 中，并通过 AWS SAM 使用 [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml) 部署。

首先按照[一次性设置](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#one-time-setup)，在同一 AWS 账户和区域部署 [`infra/bootstrap.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/infra/bootstrap.yaml)。应用模板依赖它导出的 `bundlewatch-service-function-role-arn`。将 `GitHubRepository` 设置为你的 fork 的 `owner/repo`，并确保两个堆栈的 `StoreTableName` 和 `ResultsTableName` 完全一致，使函数角色能够访问你的表。将 bootstrap 的 `ServiceStackName` 设置为应用堆栈名称。如果账户中已有 GitHub OIDC 提供商，请通过 `ExistingOidcProviderArn` 传入其 ARN。

然后部署应用模板，并覆盖以下参数：

- `PublicUrl`：你的服务的 URL。否则短链接会指向 service.bundlewatch.io，而那里并不存在这些链接。
- `GitHubClientId` 和 `GitHubClientSecret`：你自己的 GitHub OAuth 应用，用于 `/setup-github`。它的回调 URL 是 `<你的服务>/setup-github`。
- `ResultsTableName`：短链接表名称，必须与 bootstrap 一致。应用模板会创建该表。
- `StoreTableName`：你的基准表。模板不会创建它：可以复用 0.x 部署中的表，或创建一个哈希键为 `repo`（S）、范围键为 `repoBranch`（S）的表。
- `GitHubApiUrl`：用于 GitHub Enterprise，填写你的 API 地址，例如 `https://github.example.com/api/v3`。参见 [GitHub Enterprise](./migrating-to-v1.md#github-enterprise)。
- `WriteAuthorization`：设为 `enforce` 时，从一开始就对保存基准和创建短链接应用更严格的检查。默认值 `report` 会像 0.x 一样进行授权，只在更严格的检查会做出不同决定时记录日志。参见 [服务的变化](./migrating-to-v1.md#service-changes)。
- `ResultsRetentionDays`：短链接的保留天数。默认值 `0` 表示永久保留。

详情请参阅该服务 README 中的 [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service)。

然后，更新你的 Bundlewatch 配置，使其指向你的自定义服务器：

```js
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  bundlewatchServiceHost: 'https://my-bundlewatch-service.example.com',
}
```

将 `bundlewatchServiceHost` 设置为 `null` 可以在不使用服务的情况下运行。此时 Bundlewatch 只检查 `maxSize`，不会与基准对比，也不会保存基准，并且不会输出结果链接。

## 1.0 之前的服务 {#services-from-before-1-0}

从旧的 `bundlewatch/service` 仓库 fork 的服务仍然可以与 1.0 CLI 配合使用。它不支持短链接，因此 CLI 会输出较长的 `/results?d=…` 链接。服务的变化请参阅 [迁移到 1.0](./migrating-to-v1.md#service-changes)。

更多配置选项，请参阅 [配置参考](../reference/configuration.md)。
