// One sidebar per topic, with every label in English, French and Chinese. All
// languages share it: a page that isn't translated yet shows the English one.
// Also the page order of llms.txt and llms-full.txt.

const t = (en, fr, zh) => ({ label: en, translations: { fr, "zh-CN": zh } });
const page = (slug, ...labels) => ({ slug, ...t(...labels) });

export const sidebarTopics = [
  {
    label: { "en-US": "Guide", fr: "Guide", "zh-CN": "指南" },
    link: "/guide/getting-started/",
    icon: "open-book",
    items: [
      {
        ...t("Introduction", "Introduction", "介绍"),
        items: [
          page(
            "guide/what-is-it",
            "What is BundleWatch?",
            "Qu’est-ce que BundleWatch ?",
            "什么是 BundleWatch？",
          ),
          page("guide/getting-started", "Getting started", "Premiers pas", "快速开始"),
        ],
      },
      {
        ...t("How to use", "Utilisation", "如何使用"),
        items: [
          page("guide/using-bundlewatch", "Running in CI", "Utiliser BundleWatch", "在 CI 中运行"),
          page(
            "guide/using-a-config-file",
            "Using a config file",
            "Utiliser un fichier de configuration",
            "使用配置文件",
          ),
          page(
            "guide/diffing-against-branches-other-than-master",
            "Base and tracked branches",
            "Branche de base et branches suivies",
            "基准分支与跟踪分支",
          ),
          page(
            "guide/using-a-custom-server",
            "Using a custom server",
            "Utiliser son propre serveur",
            "使用自定义服务器",
          ),
          page("guide/troubleshooting", "Troubleshooting", "Dépannage", "故障排查"),
        ],
      },
      {
        ...t("Upgrading", "Mise à niveau", "升级"),
        items: [
          page(
            "guide/migrating-to-v1",
            "Migrating to 1.0",
            "Migrer vers la version 1.0",
            "迁移到 1.0",
          ),
        ],
      },
    ],
  },
  {
    label: { "en-US": "Reference", fr: "Référence", "zh-CN": "参考" },
    link: "/reference/configuration/",
    icon: "setting",
    items: [
      {
        ...t("Reference", "Référence", "参考"),
        items: [
          page("reference/configuration", "Configuration", "Configuration", "配置"),
          page("reference/cli", "Command line", "Ligne de commande", "命令行"),
          page("reference/nodejs", "Node.js API", "API Node.js", "Node.js API"),
        ],
      },
    ],
  },
];
