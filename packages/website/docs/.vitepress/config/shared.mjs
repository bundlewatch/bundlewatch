import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

import pkg from "../../../../../packages/bundlewatch/package.json" with { type: "json" };

// The latest release, shown in the nav. scripts/build.sh, which Amplify and CI
// run, reads it from the release tags; other builds show the version in
// package.json.
export const version = process.env.BUNDLEWATCH_VERSION || pkg.version;

export const shared = defineConfig({
  title: "Bundlewatch",

  rewrites: {
    "en/:rest*": ":rest*",
  },

  cleanUrls: true,
  metaChunk: true,

  sitemap: {
    hostname: "https://bundlewatch.io",
  },

  markdown: {
    image: {
      lazyLoading: true,
    },
    lineNumbers: true,
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  head: [["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }]],

  themeConfig: {
    logo: { src: "/logo-mini.svg", width: 24, height: 24 },

    socialLinks: [{ icon: "github", link: "https://github.com/bundlewatch/bundlewatch" }],

    search: {
      provider: "local",
    },
  },
});
