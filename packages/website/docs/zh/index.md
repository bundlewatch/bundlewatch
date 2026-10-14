---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: BundleWatch — 在 CI 中检查 JavaScript bundle 体积
titleTemplate: false
description: 在 CI 中检查 JavaScript 和 CSS bundle 体积，设置 gzip 或 Brotli 体积限制，并在 GitHub Pull Request 中对比变化。免费且开源。

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: 在合并前发现 bundle 体积增长
  tagline: BundleWatch 在 CI 中检查构建后的 JavaScript 和 CSS 文件是否超出体积限制，与基准分支对比，并在 GitHub Pull Request 中报告变化。免费且开源。
  actions:
    - theme: brand
      text: 设置 BundleWatch
      link: /zh/guide/getting-started
    - theme: alt
      text: 什么是 BundleWatch？
      link: /zh/guide/what-is-it
    - theme: alt
      text: 使用 AI 编程助手设置
      link: /zh/guide/getting-started#set-up-with-an-ai-agent

# Shown between the hero and the features, by .vitepress/theme/HomeResults.vue.
results:
  src: /home-results-changes.png
  darkSrc: /home-results-changes-dark.png
  alt: "一个 Pull Request 结果页面中的变化：index.js 增加了 17.08KB，比 160KB 限制少 14.58KB；vendor.js 增加了 13.17KB，超出 200KB 限制 9.77KB；charts.js 减少了 5.51KB。"
  caption: "每个 Pull Request 的 <code>bundlewatch</code> 状态都会链接到它的结果页面，逐个文件列出这次提交带来的变化，以及每个文件的限制。"

usedBy:
  title: 这些团队的开发者在使用
  pauseHint: 将指针悬停在此处或使此区域获得焦点以暂停标志滚动

# The icons are inline SVG, so that their navy parts (currentColor) follow the theme
# in dark mode. They are drawn from the logo and the results page. Their classes name
# the parts that move, in .vitepress/theme/feature-icons.css.
features:
  - icon: '<svg class="limits-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><rect class="row1" x="4" y="7" width="22" height="8" rx="1.5" fill="currentColor"/><rect class="row2" x="4" y="20" width="30" height="8" rx="1.5" fill="currentColor"/><rect class="row2 over" x="34" y="20" width="10" height="8" rx="1.5" fill="#d54400"/><rect class="row3" x="4" y="33" width="14" height="8" rx="1.5" fill="#ffcd52"/><path class="limit" pathLength="1" d="M34 3v42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
    title: 体积限制
    details: 为每个文件设置 maxSize，按 gzip、Brotli 或未压缩的体积衡量。超过限制的文件会让构建失败。
    link: /zh/reference/configuration#files
    linkText: 设置限制
  - icon: '<svg class="statuses-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><polygon class="hex" points="24.00,6.50 38.74,15.10 38.74,32.90 24.00,41.50 9.26,32.90 9.26,15.10" fill="currentColor" stroke="currentColor" stroke-width="3.50" stroke-linejoin="round"/><path class="check" pathLength="1" d="M16 24.5l5.5 5.5 10.5-11.5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--vp-c-bg-soft)"/></svg>'
    title: Pull Request 状态
    details: 当 CI 的 token 有权写入状态时，发布 bundlewatch 提交状态。将它设为必需的检查，即可在文件过大时阻止合并。
    link: /zh/guide/using-bundlewatch#github-statuses
    linkText: GitHub 状态
  - icon: '<svg class="results-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="axis" pathLength="1" d="M22 3v42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/><rect class="row1 right" x="22" y="6" width="22" height="9" rx="1.5" fill="#d54400"/><rect class="row2 left" x="5" y="19.5" width="17" height="9" rx="1.5" fill="currentColor"/><rect class="row3 right" x="22" y="33" width="10" height="9" rx="1.5" fill="#d54400"/></svg>'
    title: 结果页面
    details: 列出每个文件的体积、限制，以及相对基准的变化。
    link: /zh/guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: 查看结果
  - icon: '<svg class="ci-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="spine" pathLength="1" d="M10 9v30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/><polygon class="row1 step" points="10.00,3.00 15.05,5.95 15.05,12.05 10.00,15.00 4.95,12.05 4.95,5.95" fill="#ffcd52" stroke="#ffcd52" stroke-width="1.20" stroke-linejoin="round"/><polygon class="row2 step" points="10.00,18.00 15.05,20.95 15.05,27.05 10.00,30.00 4.95,27.05 4.95,20.95" fill="#d54400" stroke="#d54400" stroke-width="1.20" stroke-linejoin="round"/><polygon class="row3 step" points="10.00,33.00 15.05,35.95 15.05,42.05 10.00,45.00 4.95,42.05 4.95,35.95" fill="currentColor" stroke="currentColor" stroke-width="1.20" stroke-linejoin="round"/><rect class="row1 bar" x="21" y="6" width="22" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect class="row2 bar" x="21" y="21" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect class="row3 bar" x="21" y="36" width="24" height="6" rx="1.5" fill="currentColor"/></svg>'
    title: 任意 CI
    details: 使用 GitHub Actions 内置的 token，或在 GitLab CI、CircleCI、Travis CI、Drone 等其他 CI 服务上运行。
    link: /zh/guide/using-bundlewatch#github-actions
    linkText: 设置 CI
  - icon: '<svg class="branches-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="main" d="M14 14v30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path class="branch" pathLength="1" d="M14 37c0-12 20-9 20-21" stroke="#d54400" stroke-width="3.5" stroke-linecap="round"/><polygon class="base" points="14.00,2.00 19.89,5.44 19.89,12.56 14.00,16.00 8.11,12.56 8.11,5.44" fill="currentColor" stroke="currentColor" stroke-width="1.40" stroke-linejoin="round"/><polygon class="tip" points="34.00,4.00 39.89,7.44 39.89,14.56 34.00,18.00 28.11,14.56 28.11,7.44" fill="#d54400" stroke="#d54400" stroke-width="1.40" stroke-linejoin="round"/></svg>'
    title: 分支
    details: 只要 CI 提供目标分支，Pull Request 就会与它要合并到的分支对比。哪些分支保存基准由你决定。
    link: /zh/guide/diffing-against-branches-other-than-master
    linkText: 基准分支与跟踪分支
  - icon: '<svg class="server-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><polygon class="row1" points="4,10 13,5.5 35,5.5 44,10 35,14.5 13,14.5" fill="#ffcd52" stroke="#ffcd52" stroke-width="2" stroke-linejoin="round"/><polygon class="row2" points="4,24 13,19.5 35,19.5 44,24 35,28.5 13,28.5" fill="#d54400" stroke="#d54400" stroke-width="2" stroke-linejoin="round"/><polygon class="row3" points="4,38 13,33.5 35,33.5 44,38 35,42.5 13,42.5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    title: 自己的服务器
    details: 自己运行保存基准的服务，或者完全不使用服务。
    link: /zh/guide/using-a-custom-server
    linkText: 使用自定义服务器
---
