import { defineConfig } from "vitepress";

import pkg from "../../../../../packages/bundlewatch/package.json" with { type: "json" };

export const en = defineConfig({
  lang: "en-US",
  description: "Keep watch of your bundle size",

  themeConfig: {
    nav: nav(),

    sidebar: {
      "/guide/": { base: "/guide/", items: sidebarGuide() },
      "/reference/": {
        base: "/reference/",
        items: sidebarReference(),
      },
    },

    editLink: {
      pattern: "https://github.com/bundlewatch/bundlewatch/edit/main/packages/website/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: {
      level: "deep",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: `Copyright © 2018-present BundleWatch`,
    },
  },
});

function nav() {
  return [
    {
      text: "Guide",
      link: "/guide/what-is-it",
      activeMatch: "/guide/",
    },
    {
      text: "Reference",
      link: "/reference/configuration",
      activeMatch: "/reference/",
    },
    {
      text: pkg.version,
      items: [
        {
          text: "Release Notes",
          link: "https://github.com/bundlewatch/bundlewatch/releases",
          target: "_blank",
        },
        {
          text: "Contributing",
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
      text: "Introduction",
      items: [
        { text: "What is it?", link: "what-is-it" },
        { text: "Getting Started", link: "getting-started" },
        { text: "Migrating to 1.0", link: "migrating-to-v1" },
      ],
    },
    {
      text: "How to use",
      items: [
        { text: "Using BundleWatch", link: "using-bundlewatch" },
        { text: "Using a config file", link: "using-a-config-file" },
        {
          text: "Base and tracked branches",
          link: "diffing-against-branches-other-than-master",
        },
        { text: "Using a custom server", link: "using-a-custom-server" },
      ],
    },
    {
      text: "Config, API, and CLI reference",
      base: "/reference/",
      link: "configuration",
    },
  ];
}

function sidebarReference() {
  return [
    {
      text: "Reference",
      items: [
        { text: "Configuration", link: "configuration" },
        { text: "Node.js API", link: "nodejs" },
        { text: "CLI Params", link: "cli" },
      ],
    },
  ];
}
