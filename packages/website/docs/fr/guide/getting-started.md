---
title: Premiers pas
description: Configurez Bundlewatch dans votre projet, manuellement ou avec un agent de programmation.
---

# Premiers pas {#getting-started}

Ce guide vous aide à configurer Bundlewatch dans votre projet : installez-le, indiquez les fichiers à vérifier et exécutez-le en CI.

## Prérequis {#requirements}

- Node.js 22.17 ou une version ultérieure.
- Le paquet fournit des versions ES module et CommonJS. En CommonJS, utilisez `require('bundlewatch').default` ; consultez l’[API Node.js](../reference/nodejs.md#commonjs).
- Les types TypeScript sont inclus.

Vous utilisez la version 0.x ? Consultez [Migrer vers la version 1.0](./migrating-to-v1.md).

## Configurer avec un agent IA {#set-up-with-an-ai-agent}

Copiez ces instructions dans votre agent de programmation. Il lira cette documentation, mesurera votre build, choisira les limites et configurera la CI :

```text:no-line-numbers
Configure Bundlewatch (https://bundlewatch.io) dans ce dépôt pour que la CI échoue lorsqu’un fichier généré devient trop volumineux et que les pull requests indiquent la variation de taille de chaque fichier.

Lis d’abord https://bundlewatch.io/llms-full.txt : ce fichier contient toute la documentation. Si ce dépôt utilise déjà bundlewatch 0.x, suis plutôt https://bundlewatch.io/guide/migrating-to-v1.md. Ensuite :

1. Trouve la commande de build de production et exécute-la. Liste les fichiers JavaScript et CSS qu’elle génère, avec leur taille après compression gzip.
2. Ajoute bundlewatch aux dépendances de développement avec le gestionnaire de paquets déjà utilisé par ce projet.
3. Crée bundlewatch.config.mjs à la racine du projet avec un objet de configuration exporté par défaut et une entrée "files" par fichier généré. Utilise des motifs glob qui restent valides lorsque les noms de fichiers changent entre les builds, et un "maxSize" environ 10 % supérieur à la taille gzip actuelle de chaque fichier, arrondi au kB supérieur. Si les noms de fichiers contiennent des empreintes de contenu, configure "normalizeFilenames" pour que chaque fichier garde le même nom d’un build à l’autre et vérifie le motif sur les noms réels.
4. Lance le build, exécute `npx bundlewatch` et vérifie que tous les fichiers passent les contrôles.
5. Exécute la commande en CI après le build :
   - Sur GitHub Actions, ajoute le workflow de https://bundlewatch.io/guide/using-bundlewatch#github-actions en l’adaptant à la version de Node.js, au gestionnaire de paquets, à la commande de build et à la branche par défaut du projet. Aucun secret n’est nécessaire.
   - Sur une autre plateforme de CI, ajoute une étape qui exécute `npx bundlewatch` après le build et demande-moi de créer un jeton sur https://service.bundlewatch.io/setup-github puis de le stocker dans le secret BUNDLEWATCH_GITHUB_TOKEN. Ne commite jamais de jeton.
6. Résume les modifications, les limites choisies et ce qu’il me reste à faire, par exemple rendre le contrôle de statut `bundlewatch` obligatoire.
```

Toute la documentation est aussi disponible en texte brut, en anglais, pour les agents et les LLM : [`llms.txt`](https://bundlewatch.io/llms.txt) liste les pages et [`llms-full.txt`](https://bundlewatch.io/llms-full.txt) les rassemble toutes. Chaque page anglaise est également disponible en Markdown en ajoutant `.md` à son URL.

Vous préférez configurer vous-même le projet ? Suivez les étapes ci-dessous.

## Installation {#installation}

Installez Bundlewatch comme dépendance de développement :

::: code-group

```bash [npm]
npm install bundlewatch --save-dev
```

```bash [pnpm]
pnpm add bundlewatch --save-dev
```

```bash [Yarn]
yarn add bundlewatch --dev
```

:::

## Configuration {#configuration}

Créez `bundlewatch.config.mjs` à la racine du projet pour indiquer à Bundlewatch les fichiers à vérifier et leur taille maximale :

```js [bundlewatch.config.mjs]
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

Lancez le build de votre projet, puis exécutez :

```bash
npx bundlewatch
```

Bundlewatch trouve automatiquement `bundlewatch.config.mjs`. Utilisez `--config <chemin>` pour un autre nom ou emplacement ; consultez la [recherche de configuration](./using-a-config-file.md#config-discovery).

Chaque fichier est affiché avec sa taille. La commande renvoie le code de sortie 1 lorsqu’un fichier dépasse son `maxSize` ou qu’un chemin ne correspond à aucun fichier.

- **Choisir les limites :** pour connaître les tailles actuelles, exécutez `npx bundlewatch` avant d’ajouter `maxSize` : un fichier sans cette option n’a pas de limite et sa taille est affichée. Définissez ensuite chaque `maxSize` légèrement au-dessus de la taille actuelle pour détecter les augmentations significatives sans échouer à chaque petite modification.
- **Noms de fichiers avec empreinte :** si les noms de fichiers contiennent des empreintes de contenu, comme `main.3f2a1b.js`, configurez [`normalizeFilenames`](../reference/configuration.md#normalizefilenames). Sinon, les fichiers de chaque build sont considérés comme nouveaux et ne peuvent pas être comparés.

Consultez [Utiliser un fichier de configuration](./using-a-config-file.md) pour les autres méthodes de configuration et la [référence de configuration](../reference/configuration.md) pour toutes les options.

## Exécution en CI {#running-in-ci}

Pour publier les résultats sur vos pull requests et les comparer à votre branche principale, exécutez Bundlewatch en CI après le build. Sur GitHub, utilisez un [workflow GitHub Actions](./using-bundlewatch.md#github-actions) ; il n’a pas besoin de jeton dédié. Les autres plateformes de CI sont décrites dans [Utiliser Bundlewatch](./using-bundlewatch.md#other-ci-providers).

## Pour aller plus loin {#next-steps}

- [Statuts GitHub](./using-bundlewatch.md#github-statuses) : bloquer les fusions lorsqu’un fichier est trop volumineux.
- [Branche de base et branches suivies](./diffing-against-branches-other-than-master.md) : comprendre à quoi chaque build est comparé.
- [Référence de configuration](../reference/configuration.md) : toutes les options et variables d’environnement.
