---
title: Utiliser un fichier de configuration
description: Configurez Bundlewatch avec un fichier de configuration ou package.json.
---

# Utiliser un fichier de configuration {#using-a-configuration-file}

Créez `bundlewatch.config.mjs` à la racine du projet et indiquez-le avec `--config` :

```bash
npx bundlewatch --config bundlewatch.config.mjs
```

Un fichier de configuration dédié est la méthode recommandée. Bundlewatch ne recherche pas automatiquement ces fichiers : incluez `--config` dans les commandes locales et CI. Si vous choisissez un autre format ci-dessous, indiquez le nom du fichier correspondant.

::: code-group

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

```ts [bundlewatch.config.mts]
import type { BundlewatchConfig } from 'bundlewatch'

export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
} satisfies BundlewatchConfig
```

```js [bundlewatch.config.cjs]
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```json [bundlewatch.config.json]
{
  "files": [
    {
      "path": "./dist/*.js",
      "maxSize": "100kB"
    }
  ]
}
```

:::

- Les fichiers de configuration peuvent être `.json`, `.js`, `.cjs` ou `.mjs`, ainsi que `.ts`, `.mts` ou `.cts` sur Node.js 22.18 et les versions ultérieures, qui exécutent TypeScript nativement. Les chemins de `--config` sont résolus depuis le répertoire courant ; les chemins absolus fonctionnent aussi.
- Le type `BundlewatchConfig` fournit l’autocomplétion et la vérification de chaque option dans votre éditeur.
- En TypeScript, préférez `.mts` : Node.js le charge comme un ES module dans tous les paquets. Un fichier `.ts` fonctionne aussi, mais dans un paquet sans `"type": "module"`, Node.js affiche un avertissement avant de le charger.
- Une configuration JavaScript ou TypeScript peut aussi n’avoir que des exports nommés, comme `export const files = [...]`, au lieu d’un export par défaut.
- Une configuration JavaScript permet de définir des options impossibles à exprimer en JSON, comme une `RegExp` pour [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), ou des valeurs calculées à partir de variables d’environnement.

Votre configuration est fusionnée avec les [valeurs par défaut](../reference/configuration.md). Les tableaux comme `files` et `ci.trackBranches` remplacent la valeur par défaut au lieu d’être fusionnés avec elle.

Vous pouvez aussi fournir directement la configuration à l’[API Node.js](../reference/nodejs.md).

## Autre possibilité : package.json {#package-json}

Vous pouvez aussi conserver la configuration sous la clé `bundlewatch` de `package.json` :

```json [package.json]
{
  "bundlewatch": {
    "files": [
      {
        "path": "./dist/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

Exécutez `npx bundlewatch` pour lire cette configuration. Sans `--config`, Bundlewatch lit la clé `bundlewatch` du `package.json` le plus proche, dans le répertoire courant ou un parent. Il s’arrête au premier `package.json` trouvé, même si ce fichier n’a pas de clé `bundlewatch`. Dans un monorepo, utilisez `--config` pour sélectionner explicitement un fichier de configuration, ou conservez la clé dans le `package.json` du paquet concerné.
