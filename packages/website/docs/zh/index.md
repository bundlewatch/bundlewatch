---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: 盯住你的 bundle 体积
  tagline: 文件超出体积限制时让构建失败，并在每个 Pull Request 上显示每个文件的体积变化。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 什么是 BundleWatch？
      link: /zh/guide/what-is-it
    - theme: alt
      text: 使用 AI 编程助手设置
      link: /zh/guide/getting-started#set-up-with-an-ai-agent

# The icons are inline SVG, so that their navy parts (currentColor) follow the theme
# in dark mode. They are drawn from the logo and the results page.
features:
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><rect x="4" y="7" width="22" height="8" rx="1.5" fill="currentColor"/><rect x="4" y="20" width="30" height="8" rx="1.5" fill="currentColor"/><rect x="34" y="20" width="10" height="8" rx="1.5" fill="#d54400"/><rect x="4" y="33" width="14" height="8" rx="1.5" fill="#ffcd52"/><path d="M34 3v42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
    title: 体积限制
    details: 为每个文件设置 maxSize。超过限制的文件会让构建失败。
    link: /zh/reference/configuration#files
    linkText: 设置限制
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><polygon points="24.00,6.50 38.74,15.10 38.74,32.90 24.00,41.50 9.26,32.90 9.26,15.10" fill="currentColor" stroke="currentColor" stroke-width="3.50" stroke-linejoin="round"/><path d="M16 24.5l5.5 5.5 10.5-11.5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--vp-c-bg-soft)"/></svg>'
    title: Pull Request 状态
    details: 当 CI 的 token 有权写入状态时，发布 bundlewatch 提交状态。将它设为必需的检查，即可在文件过大时阻止合并。
    link: /zh/guide/using-bundlewatch#github-statuses
    linkText: GitHub 状态
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M22 3v42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/><rect x="22" y="6" width="22" height="9" rx="1.5" fill="#d54400"/><rect x="5" y="19.5" width="17" height="9" rx="1.5" fill="currentColor"/><rect x="22" y="33" width="10" height="9" rx="1.5" fill="#d54400"/></svg>'
    title: 结果页面
    details: 列出每个文件的体积、限制，以及相对基准的变化。
    link: /zh/guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: 查看结果
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M10 9v30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/><polygon points="10.00,3.00 15.05,5.95 15.05,12.05 10.00,15.00 4.95,12.05 4.95,5.95" fill="#ffcd52" stroke="#ffcd52" stroke-width="1.20" stroke-linejoin="round"/><polygon points="10.00,18.00 15.05,20.95 15.05,27.05 10.00,30.00 4.95,27.05 4.95,20.95" fill="#d54400" stroke="#d54400" stroke-width="1.20" stroke-linejoin="round"/><polygon points="10.00,33.00 15.05,35.95 15.05,42.05 10.00,45.00 4.95,42.05 4.95,35.95" fill="currentColor" stroke="currentColor" stroke-width="1.20" stroke-linejoin="round"/><rect x="21" y="6" width="22" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect x="21" y="21" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect x="21" y="36" width="24" height="6" rx="1.5" fill="currentColor"/></svg>'
    title: 任意 CI
    details: 在 GitHub Actions 上无需管理 token，也支持 GitLab CI、CircleCI、Travis CI、Drone 等其他 CI 服务。
    link: /zh/guide/using-bundlewatch#github-actions
    linkText: 设置 CI
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M14 14v30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M14 37c0-12 20-9 20-21" stroke="#d54400" stroke-width="3.5" stroke-linecap="round"/><polygon points="14.00,2.00 19.89,5.44 19.89,12.56 14.00,16.00 8.11,12.56 8.11,5.44" fill="currentColor" stroke="currentColor" stroke-width="1.40" stroke-linejoin="round"/><polygon points="34.00,4.00 39.89,7.44 39.89,14.56 34.00,18.00 28.11,14.56 28.11,7.44" fill="#d54400" stroke="#d54400" stroke-width="1.40" stroke-linejoin="round"/></svg>'
    title: 分支
    details: 只要 CI 提供目标分支，Pull Request 就会与它要合并到的分支对比。哪些分支保存基准由你决定。
    link: /zh/guide/diffing-against-branches-other-than-master
    linkText: 基准分支与跟踪分支
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><polygon points="4,10 13,5.5 35,5.5 44,10 35,14.5 13,14.5" fill="#ffcd52" stroke="#ffcd52" stroke-width="2" stroke-linejoin="round"/><polygon points="4,24 13,19.5 35,19.5 44,24 35,28.5 13,28.5" fill="#d54400" stroke="#d54400" stroke-width="2" stroke-linejoin="round"/><polygon points="4,38 13,33.5 35,33.5 44,38 35,42.5 13,42.5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    title: 自己的服务器
    details: 自己运行保存基准的服务，或者完全不使用服务。
    link: /zh/guide/using-a-custom-server
    linkText: 使用自定义服务器
---
