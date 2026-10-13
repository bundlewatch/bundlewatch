import { defineConfig } from "vitepress";

import { version } from "./shared.mjs";

// Also the page order of llms.txt and llms-full.txt.
export const sidebar = {
  "/guide/": { base: "/guide/", items: sidebarGuide() },
  "/reference/": { base: "/reference/", items: sidebarReference() },
};

export const en = defineConfig({
  lang: "en-US",
  description: "Keep watch of your bundle size",

  themeConfig: {
    nav: nav(),

    sidebar,

    editLink: {
      pattern: "https://github.com/bundlewatch/bundlewatch/edit/main/packages/website/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: {
      level: "deep",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: `Copyright © 2018-present Bundlewatch`,
    },
  },
});

function nav() {
  return [
    {
      text: "Guide",
      link: "/guide/getting-started",
      activeMatch: "/guide/",
    },
    {
      text: "Reference",
      link: "/reference/configuration",
      activeMatch: "/reference/",
    },
    {
      text: version,
      items: [
        {
          text: "Release notes",
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
        { text: "What is Bundlewatch?", link: "what-is-it" },
        { text: "Getting started", link: "getting-started" },
      ],
    },
    {
      text: "How to use",
      items: [
        { text: "Running in CI", link: "using-bundlewatch" },
        { text: "Using a config file", link: "using-a-config-file" },
        {
          text: "Base and tracked branches",
          link: "diffing-against-branches-other-than-master",
        },
        { text: "Using a custom server", link: "using-a-custom-server" },
        { text: "Troubleshooting", link: "troubleshooting" },
      ],
    },
    {
      text: "Upgrading",
      items: [{ text: "Migrating to 1.0", link: "migrating-to-v1" }],
    },
    {
      text: "Reference",
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
        { text: "Command line", link: "cli" },
        { text: "Node.js API", link: "nodejs" },
      ],
    },
  ];
}
