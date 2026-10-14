---
title: 使用自定义服务器
description: 如何运行你自己的 BundleWatch 服务，并让项目使用它。
---

# 使用自定义服务器 {#using-a-custom-server-with-bundlewatch}

BundleWatch 服务负责保存构建对比所用的基准、创建结果短链接并渲染结果页面。你可以运行自己的实例，而不是使用 `https://service.bundlewatch.io`。

在 `bundlewatch.config.mjs` 中让 BundleWatch 指向你的服务：

```js [bundlewatch.config.mjs]
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  bundlewatchServiceHost: 'https://bundlewatch.example.com',
}
```

使用此配置运行：

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

URL 的格式，以及如何在不使用服务的情况下运行，请参阅 [bundlewatchServiceHost](../reference/configuration.md#bundlewatchservicehost)。

## 部署服务 {#deploying-the-service}

该服务位于 BundleWatch 仓库的 [`packages/service`](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service) 目录中。它运行在 AWS Lambda 上，数据保存在 DynamoDB 中，并通过 AWS SAM 使用 [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml) 部署。

1. 按照 [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service) 中的说明，在你的 AWS 账户和区域中部署 [`infra/bootstrap.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/infra/bootstrap.yaml)。将 `GitHubRepository` 设为你的 fork，并使用与第 3 步中 template.yaml 相同的 `StoreTableName` 和 `ResultsTableName`。

   将 `ServiceStackName` 设为应用堆栈的名称。如果账户中已有 GitHub OIDC 提供商，请通过 `ExistingOidcProviderArn` 传入其 ARN。

2. 为 `/setup-github` 创建一个 GitHub OAuth 应用，回调 URL 为 `<你的服务>/setup-github`。
3. 按照 [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service) 中的说明，使用你的服务 URL、OAuth 应用和表名部署 [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml)。

`template.yaml` 还有以下两个参数：

- `WriteAuthorization`：设为 `enforce` 时，从一开始就对保存基准和创建短链接应用更严格的检查。默认值 `report` 会像 0.x 一样进行授权，只在更严格的检查会做出不同决定时记录日志。参见 [服务的变化](./migrating-to-v1.md#service-changes)。
- `ResultsRetentionDays`：短链接的保留天数。默认值 `0` 表示永久保留。

## GitHub Enterprise {#github-enterprise}

- 设置了 `GITHUB_API_URL` 时，提交状态会发送到该地址的 GitHub API；GitHub Enterprise Server 上的 GitHub Actions 会自动设置它。
- service.bundlewatch.io 只接受 github.com 的 token。在 GitHub Enterprise 上，它无法与基准对比、保存基准或创建短链接：每次运行都会记录 `401` 错误，并输出长结果链接。
- 如需对比，请部署你自己的服务，将 `GitHubApiUrl` 设为你的 API 地址，例如 `https://github.example.com/api/v3`，并将 `bundlewatchServiceHost` 设为该服务的 URL。
- 否则请设置 `bundlewatchServiceHost: null`，这样你的 token 和文件名就不会被发送到 service.bundlewatch.io。

## 1.0 之前的服务 {#services-from-before-1-0}

从旧的 `bundlewatch/service` 仓库 fork 的服务仍然可以与 1.0 CLI 配合使用。它不支持短链接，因此 CLI 会输出较长的 `/results?d=…` 链接。服务有哪些变化，请参阅 [迁移到 1.0](./migrating-to-v1.md#service-changes)。
