import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

export const shared = defineConfig({
  title: "BundleWatch",

  rewrites: {
    "en/:rest*": ":rest*",
  },

  cleanUrls: true,
  metaChunk: true,

  markdown: {
    image: {
      lazyLoading: true,
    },
    lineNumbers: true,
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  head: [
    ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
  ],

  themeConfig: {
    logo: { src: "/logo-mini.svg", width: 24, height: 24 },

    socialLinks: [
      { icon: "github", link: "https://github.com/bundlewatch/bundlewatch" },
    ],

    search: {
      provider: "local",
    },
  },
});
