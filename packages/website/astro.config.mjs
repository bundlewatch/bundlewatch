import { satteri } from "@astrojs/markdown-satteri";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightImageZoom from "starlight-image-zoom";
import starlightLinksValidator from "starlight-links-validator";
import starlightSidebarTopics from "starlight-sidebar-topics";

import { writeLlmsFiles } from "./src/llms.mjs";
import { sidebarTopics } from "./src/sidebar.mjs";

const CONTENT = new URL("./src/content/docs/", import.meta.url);

/**
 * Pages link to each other's source files, which also works on GitHub:
 * `../reference/configuration.md#files` → `/reference/configuration/#files`.
 * Absolute links are checked by starlight-links-validator; relative ones
 * wouldn't be.
 */
const markdownLinks = {
  name: "markdown-links",
  link(node, ctx) {
    if (/^([a-z]+:|#)/i.test(node.url) || !ctx.fileURL?.href.startsWith(CONTENT.href)) return;
    const page = ctx.fileURL.href
      .slice(CONTENT.href.length)
      .replace(/\.mdx?$/, "")
      .replace(/(^|\/)index$/, "$1");
    const url = new URL(node.url.replace(/\.mdx?(?=#|$)/, ""), `https://site/${page}`);
    // Pages end in a slash; files such as /llms.txt keep their name.
    const path = /\.\w+$/.test(url.pathname) ? url.pathname : url.pathname.replace(/\/?$/, "/");
    ctx.setProperty(node, "url", path + url.hash);
  },
};

export default defineConfig({
  site: "https://bundlewatch.io",
  // Pages are guide/x/index.html, served at /guide/x/. Amplify redirects the
  // VitePress URLs (/guide/x) there by itself. build.format "file" or
  // "preserve" would keep them, but Starlight then puts .html in some of its
  // own links: the sidebar, the language picker, canonical URLs or search.
  trailingSlash: "always",
  // Hashed files in /assets/, as with VitePress: infra/amplify.yaml caches them.
  build: { format: "directory", assets: "assets" },

  markdown: {
    processor: satteri({
      features: { headingAttributes: true },
      mdastPlugins: [markdownLinks],
    }),
  },

  integrations: [
    starlight({
      title: "BundleWatch",
      description: "Keep watch of your bundle size",
      logo: { src: "./src/assets/logo-mini.svg" },
      favicon: "/favicon.svg",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/bundlewatch/bundlewatch" },
      ],
      editLink: {
        baseUrl: "https://github.com/bundlewatch/bundlewatch/edit/main/packages/website/",
      },
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en-US" },
        fr: { label: "Français", lang: "fr" },
        zh: { label: "简体中文", lang: "zh-CN" },
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 6 },
      customCss: ["./src/styles/custom.css"],
      // src/pages/404.astro replaces Starlight's.
      disable404Route: true,
      routeMiddleware: "./src/routeData.mjs",

      components: {
        SocialIcons: "./src/components/SocialIcons.astro",
        Footer: "./src/components/Footer.astro",
        Hero: "./src/components/Hero.astro",
      },
      plugins: [
        starlightSidebarTopics(sidebarTopics),
        starlightImageZoom(),
        // llms.mjs writes these files after the pages are built.
        starlightLinksValidator({
          errorOnRelativeLinks: false,
          exclude: ["/llms.txt", "/llms-full.txt"],
        }),
      ],
    }),
    {
      name: "bundlewatch-llms",
      hooks: {
        "astro:build:done": ({ dir }) => writeLlmsFiles({ outDir: dir }),
      },
    },
  ],
});
