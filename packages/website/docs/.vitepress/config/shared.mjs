import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

import pkg from "../../../../../packages/bundlewatch/package.json" with { type: "json" };

// The latest release, shown in the nav. scripts/build.sh, which Amplify and CI
// run, reads it from the release tags; other builds show the version in
// package.json.
export const version = process.env.BUNDLEWATCH_VERSION || pkg.version;

export const shared = defineConfig({
  title: "BundleWatch",

  rewrites: {
    "en/:rest*": ":rest*",
  },

  cleanUrls: true,
  metaChunk: true,

  sitemap: {
    hostname: "https://bundlewatch.io",
  },

  transformPageData(pageData) {
    if (/(^|\/)404\.md$/.test(pageData.relativePath)) return;

    // VitePress applies rewrites before setting relativePath. Use the same
    // clean routes as the sitemap, including trailing slashes for index pages.
    const route = pageData.relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");
    const head = (pageData.frontmatter.head ?? []).filter(
      ([tag, attrs]) => !(tag === "link" && attrs.rel === "canonical"),
    );
    head.push(["link", { rel: "canonical", href: new URL(route, "https://bundlewatch.io/").href }]);
    pageData.frontmatter.head = head;
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

  head: [
    ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    [
      "script",
      {
        defer: "",
        src: "https://api.pirsch.io/pa.js",
        id: "pianjs",
        "data-code": "LcBZ8OPau2j6wcWCBM7ljbz563wxHEYj",
      },
    ],
  ],

  themeConfig: {
    logo: { src: "/logo-mini.svg", width: 24, height: 24 },

    socialLinks: [{ icon: "github", link: "https://github.com/bundlewatch/bundlewatch" }],

    search: {
      provider: "local",
    },
  },
});
