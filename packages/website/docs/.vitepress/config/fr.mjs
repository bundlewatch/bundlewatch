import { defineConfig } from "vitepress";

import { version } from "./shared.mjs";

export const fr = defineConfig({
  lang: "fr",
  description: "Gardez un œil sur la taille de vos bundles",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/fr/guide/what-is-it", activeMatch: "/fr/guide/" },
      {
        text: "Référence",
        link: "/fr/reference/configuration",
        activeMatch: "/fr/reference/",
      },
      {
        text: version,
        items: [
          {
            text: "Notes de version",
            link: "https://github.com/bundlewatch/bundlewatch/releases",
            target: "_blank",
          },
          {
            text: "Contribuer",
            link: "https://github.com/bundlewatch/bundlewatch/blob/main/CONTRIBUTING.md",
            target: "_blank",
          },
        ],
      },
    ],
    sidebar: {
      "/fr/guide/": {
        base: "/fr/guide/",
        items: [
          {
            text: "Introduction",
            items: [
              { text: "Qu’est-ce que Bundlewatch ?", link: "what-is-it" },
              { text: "Premiers pas", link: "getting-started" },
              { text: "Migrer vers la version 1.0", link: "migrating-to-v1" },
            ],
          },
          {
            text: "Utilisation",
            items: [
              { text: "Utiliser Bundlewatch", link: "using-bundlewatch" },
              { text: "Utiliser un fichier de configuration", link: "using-a-config-file" },
              {
                text: "Branche de base et branches suivies",
                link: "diffing-against-branches-other-than-master",
              },
              { text: "Utiliser son propre serveur", link: "using-a-custom-server" },
            ],
          },
          {
            text: "Référence de la configuration, de l’API et de la CLI",
            base: "/fr/reference/",
            link: "configuration",
          },
        ],
      },
      "/fr/reference/": {
        base: "/fr/reference/",
        items: [
          {
            text: "Référence",
            items: [
              { text: "Configuration", link: "configuration" },
              { text: "API Node.js", link: "nodejs" },
              { text: "Ligne de commande", link: "cli" },
            ],
          },
        ],
      },
    },
    editLink: {
      pattern: "https://github.com/bundlewatch/bundlewatch/edit/main/packages/website/docs/:path",
      text: "Modifier cette page sur GitHub",
    },
    outline: { level: "deep", label: "Sur cette page" },
    docFooter: { prev: "Page précédente", next: "Page suivante" },
    lastUpdated: { text: "Dernière mise à jour" },
    langMenuLabel: "Changer de langue",
    returnToTopLabel: "Retour en haut",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Apparence",
    lightModeSwitchTitle: "Passer au thème clair",
    darkModeSwitchTitle: "Passer au thème sombre",
    skipToContentLabel: "Aller au contenu",
    footer: {
      message: "Publié sous licence MIT.",
      copyright: "Copyright © 2018 à aujourd’hui BundleWatch",
    },
  },
});
