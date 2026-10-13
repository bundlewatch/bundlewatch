---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  image:
    src: /logo-large.svg
    alt: Bundlewatch
  name: Bundlewatch
  text: 盯住你的 bundle 体积
  tagline: 文件超出体积限制时让构建失败，并在每个 Pull Request 上显示每个文件的体积变化。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 什么是 Bundlewatch？
      link: /zh/guide/what-is-it
    - theme: alt
      text: 使用 AI 编程助手设置
      link: /zh/guide/getting-started#set-up-with-an-ai-agent

features:
  - title: 体积限制
    details: 为每个文件设置 maxSize。超过限制的文件会让构建失败。
    link: /zh/reference/configuration#files
    linkText: 设置限制
  - title: Pull Request 状态
    details: 当 CI 的 token 有权写入状态时，发布 bundlewatch 提交状态。将它设为必需的检查，即可在文件过大时阻止合并。
    link: /zh/guide/using-bundlewatch#github-statuses
    linkText: GitHub 状态
  - title: 结果页面
    details: 列出每个文件的体积、限制，以及相对基准的变化。
    link: /zh/guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: 查看结果
  - title: 任意 CI
    details: 在 GitHub Actions 上无需管理 token，也支持 GitLab CI、CircleCI、Travis CI、Drone 等其他 CI 服务。
    link: /zh/guide/using-bundlewatch#github-actions
    linkText: 设置 CI
  - title: 分支
    details: 只要 CI 提供目标分支，Pull Request 就会与它要合并到的分支对比。哪些分支保存基准由你决定。
    link: /zh/guide/diffing-against-branches-other-than-master
    linkText: 基准分支与跟踪分支
  - title: 自己的服务器
    details: 自己运行保存基准的服务，或者完全不使用服务。
    link: /zh/guide/using-a-custom-server
    linkText: 使用自定义服务器
---
