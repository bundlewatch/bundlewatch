---
title: 入门指南
description: 分步指导你在项目中安装和设置 Bundlewatch。
---

# 入门指南

本指南将帮助你在项目中安装并设置 Bundlewatch。

## 环境要求 {#requirements}

- Node.js 22.17 或更高版本。
- 该包同时提供 ES 模块和 CommonJS 构建。在 CommonJS 代码中请使用 `require('bundlewatch').default`，参见 [Node.js API](../reference/nodejs.md#commonjs)。
- 已内置 TypeScript 类型。

从 0.x 升级？请参阅 [迁移到 1.0](./migrating-to-v1.md)。

## 安装 {#installation}

你可以使用 npm、pnpm 或 Yarn 安装 Bundlewatch：

### 使用 npm

```bash
npm install bundlewatch --save-dev
```

### 使用 pnpm

```bash
pnpm add bundlewatch --save-dev
```

### 使用 Yarn

```bash
yarn add bundlewatch --dev
```

## 配置 {#configuration}

在 `package.json` 中告诉 Bundlewatch 要检查哪些文件，以及它们最大允许多大：

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "./dist/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

构建项目后运行：

```bash
npx bundlewatch
```

其他配置方式请参阅 [使用配置文件](./using-a-config-file.md)。

## 在 CI 中运行 {#running-in-ci}

要在 Pull Request 上报告结果并与主分支对比，请在 CI 中运行 Bundlewatch。在 GitHub 上，推荐使用 [GitHub Actions 工作流](./using-bundlewatch.md#github-actions)，它不需要单独的 token。其他 CI 服务请参阅 [使用 Bundlewatch](./using-bundlewatch.md#other-ci-providers)。

现在你已经可以开始使用 BundleWatch 了！:tada:
