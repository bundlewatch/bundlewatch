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
      options: {
        locales: {
          fr: {
            translations: {
              button: { buttonText: "Rechercher", buttonAriaLabel: "Rechercher" },
              modal: {
                displayDetails: "Afficher les détails",
                resetButtonTitle: "Effacer la recherche",
                backButtonTitle: "Fermer la recherche",
                noResultsText: "Aucun résultat pour",
                footer: {
                  selectText: "sélectionner",
                  selectKeyAriaLabel: "entrée",
                  navigateText: "naviguer",
                  navigateUpKeyAriaLabel: "flèche vers le haut",
                  navigateDownKeyAriaLabel: "flèche vers le bas",
                  closeText: "fermer",
                  closeKeyAriaLabel: "échap",
                },
              },
            },
          },
        },
      },
    },
  },
});
