---
title: 入门指南
description: 在你的项目中设置 Bundlewatch，可以手动完成，也可以交给 AI 编程助手。
---

# 入门指南

本指南将在你的项目中设置 Bundlewatch：安装它，告诉它要检查哪些文件，并在 CI 中运行它。

## 环境要求 {#requirements}

- Node.js 22.17 或更高版本。
- 该包同时提供 ES 模块和 CommonJS 构建。在 CommonJS 代码中请使用 `require('bundlewatch').default`，参见 [Node.js API](../reference/nodejs.md#commonjs)。
- 已内置 TypeScript 类型。

从 0.x 升级？请参阅 [迁移到 1.0](./migrating-to-v1.md)。

## 使用 AI 编程助手设置 {#set-up-with-an-ai-agent}

将下面的提示词复制到你的 AI 编程助手中。它会阅读本文档、测量你的构建产物、选定体积限制，并添加 CI 配置：

```text:no-line-numbers
在这个仓库中设置 Bundlewatch（https://bundlewatch.io），让 CI 在构建出的文件过大时失败，并让 Pull Request 显示每个文件的体积变化。

先阅读 https://bundlewatch.io/llms-full.txt：其中包含完整的文档。如果这个仓库已经在使用 bundlewatch 0.x，请改为按照 https://bundlewatch.io/guide/migrating-to-v1.md 操作。然后：

1. 找到生产构建命令并运行它。列出它输出的 JavaScript 和 CSS 文件，以及它们的 gzip 体积。
2. 使用这个项目已在使用的包管理器，将 bundlewatch 添加为开发依赖。
3. 在 package.json 中添加 "bundlewatch" 键，每个输出文件对应一个 "files" 条目。使用在不同构建之间文件名变化时仍能匹配的 glob，并将每个文件的 "maxSize" 设为比当前 gzip 体积高约 10%，向上取整到整数 kB。如果文件名包含内容 hash，请设置 "normalizeFilenames"，使同一个文件在不同构建中保持相同的名称，并用实际的文件名检验该模式。
4. 构建，运行 `npx bundlewatch`，并确保每个文件都通过检查。
5. 在 CI 中于构建之后运行它：
   - 在 GitHub Actions 上，添加 https://bundlewatch.io/guide/using-bundlewatch#github-actions 中的工作流，并根据这个项目的 Node.js 版本、包管理器、构建命令和默认分支进行调整。它不需要任何 secret。
   - 在其他 CI 服务上，添加一个在构建之后运行 `npx bundlewatch` 的步骤，并让我在 https://service.bundlewatch.io/setup-github 创建一个 token，将它保存为 BUNDLEWATCH_GITHUB_TOKEN secret。绝不要提交 token。
6. 总结你修改了什么、你选择的体积限制，以及还剩下哪些需要我来做的事，例如将 `bundlewatch` 设为必需的状态检查。
```

完整的英文文档也以纯文本形式提供给 AI 编程助手和大语言模型：[`llms.txt`](https://bundlewatch.io/llms.txt) 列出了所有页面，[`llms-full.txt`](https://bundlewatch.io/llms-full.txt) 包含了全部页面。在英文文档任意页面的 URL 后加上 `.md`，也可以获取该页面的 Markdown 版本。

想自己动手设置？请按照以下步骤操作。

## 安装 {#installation}

将 Bundlewatch 安装为开发依赖：

::: code-group

```bash [npm]
npm install bundlewatch --save-dev
```

```bash [pnpm]
pnpm add bundlewatch --save-dev
```

```bash [Yarn]
yarn add bundlewatch --dev
```

:::

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

每个文件都会与其体积一起列出。当某个文件超过其 `maxSize`，或某个路径没有匹配到任何文件时，命令以退出码 1 退出。

- **选择体积限制**：要查看当前体积，请在添加 `maxSize` 之前运行 `npx bundlewatch`：没有 `maxSize` 的文件不受限制，并会列出其体积。然后将每个 `maxSize` 设得比当前体积稍大一些，这样检查既能发现真正的增长，又不会因为每个小改动而失败。
- **带 hash 的文件名**：如果你的文件名包含内容 hash，例如 `main.3f2a1b.js`，请设置 [`normalizeFilenames`](../reference/configuration.md#normalizefilenames)。否则每次构建的文件看起来都是新文件，没有可以与之对比的对象。

其他配置方式请参阅 [使用配置文件](./using-a-config-file.md)，所有选项请参阅 [配置参考](../reference/configuration.md)。

## 在 CI 中运行 {#running-in-ci}

要在 Pull Request 上报告结果并与主分支对比，请在构建之后于 CI 中运行 Bundlewatch。在 GitHub 上，请使用 [GitHub Actions 工作流](./using-bundlewatch.md#github-actions)，它不需要单独的 token。其他 CI 服务请参阅 [使用 Bundlewatch](./using-bundlewatch.md#other-ci-providers)。

## 下一步 {#next-steps}

- [GitHub 状态](./using-bundlewatch.md#github-statuses)：在文件过大时阻止合并。
- [基准分支与跟踪分支](./diffing-against-branches-other-than-master.md)：每次构建与什么对比。
- [配置参考](../reference/configuration.md)：所有选项和环境变量。
