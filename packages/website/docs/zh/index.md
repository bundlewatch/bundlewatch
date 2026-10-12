---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: 密切关注你的构建包大小
  tagline: 注意文件体积是否异常增长，避免将大文件发送给用户，必要时中止构建过程。

  actions:
    - theme: brand
      text: 什么是BundleWatch?
      link: /zh/guide/what-is-it
    - theme: alt
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 使用 AI 编程助手设置
      link: /zh/guide/getting-started#set-up-with-an-ai-agent

features:
  - icon: 🚫
    details: 设置阈值，确保你不会不小心向用户提供过大的文件。
    link: /zh/reference/configuration#files
    linkText: 了解自定义阈值
  - icon: 📊
    details: 清晰全面地展示打包分析结果，便于发现问题和改进空间。
    link: /zh/guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: 了解结果拆解
  - icon: ✨
    details: 在 GitHub Actions 上无需管理 token 即可使用，也支持 GitLab CI、CircleCI、Travis CI、Drone 等其他 CI 服务。
    link: /zh/guide/using-bundlewatch#github-actions
    linkText: 了解 CI 设置
  - icon: 🔀
    details: 可对比任意分支的打包大小，而不仅限于主分支，全面掌控开发流程。
    link: /zh/guide/diffing-against-branches-other-than-master
    linkText: 了解分支对比
  - icon: 🚨
    details: 在每个 Pull Request 上报告状态，并在文件过大时阻止合并。
    link: /zh/guide/using-bundlewatch#github-statuses
    linkText: 了解 GitHub 状态
  - icon: 🗄️
    details: 可选使用你自己的服务器来存储和获取打包数据，完全掌控你的数据。
    link: /zh/guide/using-a-custom-server
    linkText: 了解如何使用自定义服务器
---
