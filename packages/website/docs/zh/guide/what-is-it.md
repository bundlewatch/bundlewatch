---
title: 什么是 Bundlewatch？
description: 了解 Bundlewatch 是什么，以及它如何帮助你监控 bundle 体积。
---

# 什么是 Bundlewatch？

Bundlewatch 是一个检查你打包后的浏览器资源体积的工具，帮助你防止文件体积出现意外增长。

## 为什么要使用 Bundlewatch？

Bundlewatch 可以帮助你：

- 检测新的依赖是否导致 bundle 体积膨胀
- 捕捉意外的大型导入
- 确保资源被正确压缩
- 防止 bundle 体积随时间回退变大

::: tip
在构建生产环境资源后，在 CI 流水线中运行 `bundlewatch`。Bundlewatch 会跟踪这些文件，并在它们超过你配置的体积限制时提醒你。
:::

如果某个文件超过了最大体积，Bundlewatch 会在你的 GitHub Pull Request 上更新状态，并且可以阻止未通过检查的合并。

---

更多详情请参阅 [入门指南](./getting-started.md) 或 [配置参考](../reference/configuration.md)。
