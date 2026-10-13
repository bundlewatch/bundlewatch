---
title: 什么是 Bundlewatch？
description: Bundlewatch 在每次构建后检查什么，以及它如何在 Pull Request 上报告结果。
---

# 什么是 Bundlewatch？

Bundlewatch 会检查你构建出的浏览器资源的体积，避免文件在无人察觉的情况下变大。你列出要检查的文件，以及它们最大允许多大。Bundlewatch 会在每次构建后测量这些文件，在某个文件过大时让构建失败，并在每个 Pull Request 上显示每个文件的体积变化。

## 它能发现什么 {#why-use-bundlewatch}

体积突然增长通常意味着出了问题：

- 新的依赖导致 bundle 体积膨胀
- 意外导入了整个库
- 缺少代码最小化（minify）或压缩步骤
- 一个个 Pull Request 累积起来、无人察觉的缓慢增长

## 工作原理 {#how-it-works}

1. 构建完成后，Bundlewatch 会按浏览器下载文件的方式测量每个文件：默认使用 gzip 压缩，也可以使用 brotli 或不压缩。
2. 如果某个文件超过其 `maxSize`，或某个路径没有匹配到任何文件，这次运行就会失败。命令以退出码 1 退出，从而让你的 CI 任务失败。
3. 在 CI 中，Bundlewatch 会从 Bundlewatch 服务获取为基准分支（通常是你要合并到的分支）保存的体积。这份*基准*显示了每个文件的体积变化。
4. 结果会以 `bundlewatch` 状态显示在提交上，并附带一个链接，指向按文件逐一列出结果的页面。
5. 跟踪分支（例如 `main`）的构建会将其体积保存为新的基准，供之后的 Pull Request 对比。

`service.bundlewatch.io` 上的服务是免费的。Bundlewatch 会向它发送文件名和体积、仓库、分支和提交，以及用于检查访问权限的 GitHub token。它从不发送文件本身。你也可以[运行自己的服务](./using-a-custom-server.md)，或者完全不使用服务：没有服务时，Bundlewatch 仍会检查 `maxSize`。

任何拿到结果链接的人都能打开结果页面：参见 [结果链接](./using-bundlewatch.md#results-links)。

## 阻止合并 {#blocking-merges}

要阻止会让文件过大的 Pull Request 被合并，请在仓库的分支保护规则或规则集中，将 `bundlewatch` 设为必需的状态检查。参见 [GitHub 状态](./using-bundlewatch.md#github-statuses)。

---

下一步：[快速开始](./getting-started.md)，或[使用 AI 编程助手设置](./getting-started.md#set-up-with-an-ai-agent)。
