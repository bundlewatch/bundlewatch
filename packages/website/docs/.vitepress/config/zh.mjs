import { defineConfig } from "vitepress";

import { version } from "./shared.mjs";

export const zh = defineConfig({
  lang: "zh-Hans",
  description: "盯住你的 bundle 体积",

  themeConfig: {
    nav: nav(),

    sidebar: {
      "/zh/guide/": { base: "/zh/guide/", items: sidebarGuide() },
      "/zh/reference/": {
        base: "/zh/reference/",
        items: sidebarReference(),
      },
    },

    editLink: {
      pattern: "https://github.com/bundlewatch/bundlewatch/edit/main/packages/website/docs/:path",
      text: "在GitHub上编辑此页面",
    },

    outline: {
      level: "deep",
    },

    footer: {
      message: "根据 MIT 许可证发布。",
      copyright: `版权所有 © 2018-至今 BundleWatch`,
    },
  },
});

function nav() {
  return [
    {
      text: "指南",
      link: "/zh/guide/getting-started",
      activeMatch: "/zh/guide/",
    },
    {
      text: "参考",
      link: "/zh/reference/configuration",
      activeMatch: "/zh/reference/",
    },
    {
      text: version,
      items: [
        {
          text: "更新日志",
          link: "https://github.com/bundlewatch/bundlewatch/releases",
          target: "_blank",
        },
        {
          text: "贡献指南",
          link: "https://github.com/bundlewatch/bundlewatch/blob/main/CONTRIBUTING.md",
          target: "_blank",
        },
      ],
    },
  ];
}

function sidebarGuide() {
  return [
    {
      text: "介绍",
      items: [
        { text: "什么是 BundleWatch？", link: "what-is-it" },
        { text: "快速开始", link: "getting-started" },
      ],
    },
    {
      text: "如何使用",
      items: [
        { text: "在 CI 中运行", link: "using-bundlewatch" },
        { text: "使用配置文件", link: "using-a-config-file" },
        {
          text: "基准分支与跟踪分支",
          link: "diffing-against-branches-other-than-master",
        },
        { text: "使用自定义服务器", link: "using-a-custom-server" },
        { text: "故障排查", link: "troubleshooting" },
      ],
    },
    {
      text: "升级",
      items: [{ text: "迁移到 1.0", link: "migrating-to-v1" }],
    },
    {
      text: "参考",
      base: "/zh/reference/",
      link: "configuration",
    },
  ];
}

function sidebarReference() {
  return [
    {
      text: "参考",
      items: [
        { text: "配置", link: "configuration" },
        { text: "命令行", link: "cli" },
        { text: "Node.js API", link: "nodejs" },
      ],
    },
  ];
}
